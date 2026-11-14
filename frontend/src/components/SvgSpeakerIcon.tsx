import React from "react";
import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";

interface SvgSpeakerIconProps {
  size?: number;
  color?: string;
  playing?: boolean;
}

export function SvgSpeakerIcon({ size = 16, color = "#007A3D", playing = false }: SvgSpeakerIconProps) {
  if (Platform.OS === "web") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ display: "block" } as any}
      >
        <path
          d="M11 5L6 9H2v6h4l5 4V5z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={playing ? color : "none"}
        />
        <path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {playing ? (
          <path
            d="M19.07 4.93a10 10 0 0 1 0 14.14"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={playing ? color : "none"}
      />
      <Path
        d="M15.54 8.46a5 5 0 0 1 0 7.07"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {playing ? (
        <Path
          d="M19.07 4.93a10 10 0 0 1 0 14.14"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}
