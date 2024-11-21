import { MutableRefObject } from "react";
import { Audio } from "expo-av";

export const recordSpeech = async (
  recordingRef: MutableRefObject<Audio.Recording>
) => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
    });

    const doneRecording = recordingRef?.current?._isDoneRecording;
    if (doneRecording) recordingRef.current = new Audio.Recording();

    const permissionResponse = await Audio.requestPermissionsAsync();
    if (permissionResponse.status === "granted") {
      const recordingStatus = await recordingRef?.current?.getStatusAsync();
      if (!recordingStatus?.canRecord) {
        const recordingConfiguration = {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ios: {
            extension: ".wav",
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 44100,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          android: {
            extension: ".amr",
            outputFormat: Audio.AndroidOutputFormat.AMR_WB,
            audioEncoder: Audio.AndroidAudioEncoder.AMR_WB,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
        };
        await recordingRef?.current
          ?.prepareToRecordAsync(recordingConfiguration)
          .then(() => {
            console.log("Prepared recording instance!");
          })
          .catch((e) =>
            console.error("Failed to prepare recording instance", e)
          );
      }
      await recordingRef?.current?.startAsync();
    } else {
      console.error("Permission to record audio is required");
      return;
    }
  } catch (error) {
    console.error("Failed to start recording", error);
    return;
  }
};
