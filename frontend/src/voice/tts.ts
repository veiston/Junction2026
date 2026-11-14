import { Platform } from "react-native";
import { API_BASE_URL } from "@/config";

function getExpoAudio() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-av").Audio;
  } catch {
    return null;
  }
}

let activeWebAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;
let activeExpoSound: any = null;

export function stopCurrentAudio(): void {
  // Web HTMLAudioElement
  if (activeWebAudio) {
    try {
      activeWebAudio.pause();
      activeWebAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    activeWebAudio = null;
  }
  if (activeBlobUrl) {
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch {
      // Ignore
    }
    activeBlobUrl = null;
  }

  // Native Expo Sound
  if (activeExpoSound) {
    try {
      activeExpoSound.stopAsync().catch(() => {});
      activeExpoSound.unloadAsync().catch(() => {});
    } catch {
      // Ignore
    }
    activeExpoSound = null;
  }

  // Web SpeechSynthesis fallback
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export async function requestTtsAudioBlob(text: string, voiceId?: string): Promise<Blob> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error("Text cannot be empty");
  }

  const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/voice/tts`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text: cleanText, voice_id: voiceId }),
  });

  if (!res.ok) {
    let errMsg = `TTS request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.detail) errMsg = errJson.detail;
    } catch {
      // Ignore
    }
    throw new Error(errMsg);
  }

  return await res.blob();
}

export async function playTtsText(
  text: string,
  options?: {
    voiceId?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: Error) => void;
  },
): Promise<() => void> {
  stopCurrentAudio();

  const cleanText = text.replace(/[*#_`~>-]/g, " ").trim();
  if (!cleanText) {
    options?.onEnd?.();
    return () => {};
  }

  // Try backend ElevenLabs TTS
  try {
    const blob = await requestTtsAudioBlob(cleanText, options?.voiceId);

    // Web audio playback
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof Audio !== "undefined") {
      const audioUrl = URL.createObjectURL(blob);
      activeBlobUrl = audioUrl;

      const audio = new Audio(audioUrl);
      activeWebAudio = audio;

      return new Promise<() => void>((resolve) => {
        let cleanedUp = false;

        const cleanup = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          if (activeWebAudio === audio) activeWebAudio = null;
          if (activeBlobUrl === audioUrl) {
            try {
              URL.revokeObjectURL(audioUrl);
            } catch {}
            activeBlobUrl = null;
          }
        };

        const stop = () => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          cleanup();
          options?.onEnd?.();
        };

        audio.onplay = () => {
          options?.onStart?.();
        };

        audio.onended = () => {
          cleanup();
          options?.onEnd?.();
        };

        audio.onerror = () => {
          cleanup();
          options?.onError?.(new Error("Audio playback failed"));
        };

        audio
          .play()
          .then(() => resolve(stop))
          .catch((err) => {
            cleanup();
            options?.onError?.(err instanceof Error ? err : new Error(String(err)));
            resolve(stop);
          });
      });
    }

    // Mobile / Native audio playback with expo-av
    const reader = new FileReader();
    const dataUrlPromise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dataUri = await dataUrlPromise;
    const ExpoAudio = getExpoAudio();
    if (!ExpoAudio) {
      options?.onEnd?.();
      return () => {};
    }

    await ExpoAudio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await ExpoAudio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true },
    );
    activeExpoSound = sound;

    options?.onStart?.();

    const stop = () => {
      try {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
      } catch {}
      if (activeExpoSound === sound) activeExpoSound = null;
      options?.onEnd?.();
    };

    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeExpoSound === sound) activeExpoSound = null;
        options?.onEnd?.();
      }
    });

    return stop;
  } catch (err) {
    // Web SpeechSynthesis fallback if ElevenLabs or network fails on web
    if (Platform.OS === "web" && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-US";
        utterance.onstart = () => options?.onStart?.();
        utterance.onend = () => options?.onEnd?.();
        utterance.onerror = (e) => options?.onError?.(new Error(String(e.error)));
        window.speechSynthesis.speak(utterance);
        return () => window.speechSynthesis.cancel();
      } catch {
        // Fallback failed
      }
    }

    const error = err instanceof Error ? err : new Error(String(err));
    options?.onError?.(error);
    throw error;
  }
}
