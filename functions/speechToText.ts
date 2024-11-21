import axios from "axios";
import { Response, Request } from "express";
import * as fs from "fs";

export const speechToText = async (req: Request, res: Response) => {
  const { audioUrl } = req.body;

  if (!audioUrl) {
    return res.status(422).json({ error: "Audio URL is required" });
  }

  try {
    // Decode the base64 string and save to a temporary file
    const audioBuffer = Buffer.from(audioUrl, "base64");
    const tempFilePath = "./temp_audio.wav"; // Adjust extension to match recorded audio

    fs.writeFileSync(tempFilePath, audioBuffer);

    // Upload the temporary audio file to AssemblyAI
    const fileStream = fs.createReadStream(tempFilePath);
    const uploadResponse = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      fileStream,
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY as string,
          "content-type": "application/json",
        },
      }
    );

    const { upload_url } = uploadResponse.data;

    // Request transcription
    const transcriptionResponse = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      { audio_url: upload_url },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY as string,
          "content-type": "application/json",
        },
      }
    );

    const { id: transcriptId } = transcriptionResponse.data;

    // Poll transcription result
    const pollTranscription = async (pollingEndpoint: string): Promise<any> => {
      const statusResponse = await axios.get(pollingEndpoint, {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY as string,
        },
      });

      const transcriptionResult = statusResponse.data;

      if (transcriptionResult.status === "completed") {
        return transcriptionResult.text;
      } else if (transcriptionResult.status === "failed") {
        throw new Error("Transcription failed");
      }

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return pollTranscription(pollingEndpoint);
    };

    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
    const transcriptionText = await pollTranscription(pollingEndpoint);

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    return res.json({ data: transcriptionText });
  } catch (error: any) {
    console.error("Error during transcription:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to process the transcription" });
  }
};
