import { MutableRefObject } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as Device from "expo-device";
import * as FileSystem from "expo-file-system";

interface TranscriptionResponse {
  data?: string;
  error?: string;
}

export const transcribeSpeech = async (
  recordingRef: MutableRefObject<Audio.Recording>
) => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
  });

  const isPrepared = recordingRef?.current?._canRecord;

  if (isPrepared) {
    await recordingRef?.current?.stopAndUnloadAsync();

    const recordingUri = recordingRef?.current?.getURI() || "";
    const base64Audio = await FileSystem.readAsStringAsync(recordingUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (recordingUri && base64Audio) {
      if (recordingUri && base64Audio) {
        const rootOrigin =
          Platform.OS === "android"
            ? "10.0.2.2"
            : Device.isDevice
            ? process.env.LOCAL_DEV_IP || "localhost"
            : "localhost";
        const baseUrl = `http://${rootOrigin}:4000`;

        const response = await fetch(`${baseUrl}/speech-to-text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audioUrl: base64Audio }),
        }).catch((e: Error) => {
          console.error(e);
          throw new Error("Failed to fetch transcription data");
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result: TranscriptionResponse = await response.json();

        if (result.data) {
          return result.data;
        } else {
          throw new Error(result.error || "Transcription failed");
        }
      }
    } else {
      console.error("Something went wrong with the recording");
      return undefined;
    }
  } else {
    console.error("Recording must be prepared");
    return;
  }
};
