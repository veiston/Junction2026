import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import type { ChatMessage } from "@/chat/useChat";
import { API_BASE_URL } from "@/config";
import { playTtsText, stopCurrentAudio } from "./tts";

// In conversation mode only the start of a reply is read aloud; the full text stays on screen.
const MAX_SPOKEN_SENTENCES = 2;
const MAX_SPOKEN_CHARS = 240;
const SENTENCE_END = /(?<=[.!?])\s+/;

function spokenSummary(text: string): string {
  const flat = text.replace(/\s*\n+\s*/g, " ").trim();
  const sentences = flat.split(SENTENCE_END).slice(0, MAX_SPOKEN_SENTENCES).join(" ");
  return sentences.slice(0, MAX_SPOKEN_CHARS);
}

function getExpoAudio() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-av").Audio;
  } catch {
    return null;
  }
}

interface UseVoiceConversationOptions {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
}

export function useVoiceConversation({ messages, busy, onSend }: UseVoiceConversationOptions) {
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const expoRecordingRef = useRef<any>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);
  const lastSpokenMsgIdRef = useRef<string | null>(null);

  const isConversationModeRef = useRef(isConversationMode);
  isConversationModeRef.current = isConversationMode;

  const busyRef = useRef(busy);
  busyRef.current = busy;

  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  // Send audio base64 to backend /voice/stt
  const transcribeAudioBase64 = useCallback(
    async (base64Audio: string, mimeType: string) => {
      setVoiceStatus("Transcribing speech…");
      try {
        const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/voice/stt`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio_base64: base64Audio, mime_type: mimeType }),
        });
        if (!res.ok) {
          throw new Error(`STT HTTP ${res.status}`);
        }
        const data = await res.json();
        const text = (data?.text || "").trim();
        if (text) {
          setTranscript(text);
          setVoiceStatus("Thinking…");
          onSend(text);
        } else {
          setVoiceStatus("No speech detected. Listening again…");
          if (isConversationModeRef.current && !busyRef.current && !isSpeakingRef.current) {
            startListening();
          }
        }
      } catch (err) {
        setVoiceStatus("Could not transcribe speech. Listening again…");
        if (isConversationModeRef.current && !busyRef.current && !isSpeakingRef.current) {
          startListening();
        }
      }
    },
    [onSend],
  );

  // Stop any active mobile recording
  const stopExpoRecording = useCallback(async () => {
    if (expoRecordingRef.current) {
      try {
        await expoRecordingRef.current.stopAndUnloadAsync();
        const uri = expoRecordingRef.current.getURI();
        expoRecordingRef.current = null;
        if (uri) {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            transcribeAudioBase64(dataUrl, blob.type || "audio/m4a");
          };
          reader.readAsDataURL(blob);
        }
      } catch {
        expoRecordingRef.current = null;
      }
    }
    setIsListening(false);
  }, [transcribeAudioBase64]);

  // Stop any active browser MediaRecorder
  const stopWebMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Stop browser SpeechRecognition
  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Universal Stop Listening
  const stopListening = useCallback(() => {
    stopSpeechRecognition();
    stopWebMediaRecorder();
    stopExpoRecording();
    setIsListening(false);
  }, [stopSpeechRecognition, stopWebMediaRecorder, stopExpoRecording]);

  // Start mobile recording using expo-av
  const startExpoRecording = useCallback(async () => {
    try {
      const ExpoAudio = getExpoAudio();
      if (!ExpoAudio) {
        setVoiceStatus("Voice recording not available on this platform");
        return;
      }
      const { status } = await ExpoAudio.requestPermissionsAsync();
      if (status !== "granted") {
        setVoiceStatus("Microphone permission denied");
        return;
      }
      await ExpoAudio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new ExpoAudio.Recording();
      await recording.prepareToRecordAsync(ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      expoRecordingRef.current = recording;
      setIsListening(true);
      setVoiceStatus("Listening… speak now");
    } catch (e) {
      setVoiceStatus("Could not start recording");
      setIsListening(false);
    }
  }, []);

  // Start web recording using MediaRecorder fallback
  const startWebMediaRecorder = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setVoiceStatus("Microphone not available");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            transcribeAudioBase64(dataUrl, audioBlob.type);
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      recorder.start();
      setIsListening(true);
      setVoiceStatus("Listening… speak now (tap mic when done)");
    } catch (err: any) {
      setVoiceStatus(
        err?.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Could not access microphone",
      );
      setIsListening(false);
    }
  }, [transcribeAudioBase64]);

  // Universal Start Listening
  const startListening = useCallback(async () => {
    if (isSpeakingRef.current || busyRef.current) return;

    // Mobile (Android / iOS)
    if (Platform.OS !== "web") {
      await startExpoRecording();
      return;
    }

    // Web browser
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      // First ensure microphone permission
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop stream immediately if we use SpeechRecognition
          if (SpeechRecognition) {
            stream.getTracks().forEach((t) => t.stop());
          } else {
            // No SpeechRecognition -> use MediaRecorder directly with this stream
            mediaStreamRef.current = stream;
            startWebMediaRecorder();
            return;
          }
        }
      } catch (err: any) {
        setVoiceStatus("Microphone access denied. Please allow microphone access.");
        setIsListening(false);
        return;
      }

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          // Set no fixed language so browser can match user's device/locale (e.g. fi-FI or en-US)
          recognition.lang = navigator.language || "en-US";

          recognition.onstart = () => {
            setIsListening(true);
            setVoiceStatus("Listening… speak now");
          };

          recognition.onresult = (event: any) => {
            let currentText = "";
            let isFinal = false;
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              currentText += event.results[i][0].transcript;
              if (event.results[i].isFinal) isFinal = true;
            }
            setTranscript(currentText);

            if (isFinal && currentText.trim()) {
              const textToSend = currentText.trim();
              setTranscript("");
              setIsListening(false);
              setVoiceStatus("Thinking…");
              onSend(textToSend);
            }
          };

          recognition.onerror = (event: any) => {
            // If SpeechRecognition fails (e.g. network/service-not-allowed in Brave/Firefox/Safari)
            if (event.error === "not-allowed") {
              setVoiceStatus("Microphone permission denied");
              setIsListening(false);
            } else {
              // Fallback to MediaRecorder audio recording
              stopSpeechRecognition();
              startWebMediaRecorder();
            }
          };

          recognition.onend = () => {
            setIsListening(false);
            if (
              isConversationModeRef.current &&
              !busyRef.current &&
              !isSpeakingRef.current &&
              !transcript.trim()
            ) {
              try {
                recognition.start();
              } catch {}
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
          return;
        } catch {
          // Fallback to MediaRecorder
          startWebMediaRecorder();
          return;
        }
      }

      // Fallback if no SpeechRecognition in browser
      startWebMediaRecorder();
    }
  }, [onSend, startExpoRecording, startWebMediaRecorder, stopSpeechRecognition, transcript]);

  // Play TTS for an individual message bubble
  const playMessageTts = useCallback(
    async (messageId: string, text: string) => {
      if (playingMessageId === messageId) {
        if (stopAudioRef.current) {
          stopAudioRef.current();
          stopAudioRef.current = null;
        }
        stopCurrentAudio();
        setPlayingMessageId(null);
        setIsSpeaking(false);
        return;
      }

      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      stopCurrentAudio();

      setPlayingMessageId(messageId);
      setIsSpeaking(true);

      try {
        const stop = await playTtsText(text, {
          onStart: () => {
            setIsSpeaking(true);
          },
          onEnd: () => {
            setPlayingMessageId(null);
            setIsSpeaking(false);
            stopAudioRef.current = null;
          },
          onError: () => {
            setPlayingMessageId(null);
            setIsSpeaking(false);
            stopAudioRef.current = null;
          },
        });
        stopAudioRef.current = stop;
      } catch {
        setPlayingMessageId(null);
        setIsSpeaking(false);
        stopAudioRef.current = null;
      }
    },
    [playingMessageId],
  );

  // Toggle conversation mode
  const toggleConversationMode = useCallback(() => {
    if (isConversationMode) {
      setIsConversationMode(false);
      stopListening();
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      stopCurrentAudio();
      setIsSpeaking(false);
      setPlayingMessageId(null);
      setVoiceStatus(null);
      setTranscript("");
    } else {
      // Replies already on screen are not read out; only new ones are.
      lastSpokenMsgIdRef.current = messages[messages.length - 1]?.id ?? null;
      setIsConversationMode(true);
      setVoiceStatus("Conversation mode active. Speak now…");
      startListening();
    }
  }, [isConversationMode, messages, startListening, stopListening]);

  /** Cut the coach off mid-sentence and listen to the customer straight away. */
  const interrupt = useCallback(() => {
    isSpeakingRef.current = false;
    const stop = stopAudioRef.current;
    stopAudioRef.current = null;
    if (stop) {
      stop(); // its onEnd starts listening again
      return;
    }
    stopCurrentAudio();
    setIsSpeaking(false);
    setVoiceStatus("Listening… speak now");
    startListening();
  }, [startListening]);

  // When in conversation mode and an assistant response arrives, speak it automatically
  useEffect(() => {
    if (!isConversationMode || busy) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id !== lastSpokenMsgIdRef.current) {
      lastSpokenMsgIdRef.current = lastMsg.id;
      if (lastMsg.text.trim()) {
        stopListening();
        setVoiceStatus("AI speaking… tap to interrupt");
        setIsSpeaking(true);

        playTtsText(spokenSummary(lastMsg.text), {
          onStart: () => {
            setIsSpeaking(true);
            setVoiceStatus("AI speaking… tap to interrupt");
          },
          onEnd: () => {
            setIsSpeaking(false);
            setVoiceStatus("Listening… speak now");
            if (isConversationModeRef.current) {
              startListening();
            }
          },
          onError: () => {
            setIsSpeaking(false);
            if (isConversationModeRef.current) {
              startListening();
            }
          },
        }).then((stop) => {
          stopAudioRef.current = stop;
        });
      }
    }
  }, [messages, busy, isConversationMode, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
      stopCurrentAudio();
    };
  }, [stopListening]);

  return {
    isConversationMode,
    isListening,
    isSpeaking,
    playingMessageId,
    transcript,
    voiceStatus,
    toggleConversationMode,
    interrupt,
    playMessageTts,
    stopListening,
  };
}
