import axios from "axios";
import { Response, Request } from "express";

export const speechToText = async (req: Request, res: Response) => {
  const { audioUrl } = req.body;

  if (!audioUrl) {
    return res.status(400).json({ error: "Audio URL is required" });
  }

  try {
    // 1. Upload audio file to AssemblyAI
    const uploadResponse = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      { audio_url: audioUrl },
      {
        headers: {
          authorization: process.env.ASSEMBLYAI_API_KEY as string,
          "content-type": "application/json",
        },
      }
    );

    const { upload_url } = uploadResponse.data;

    // 2. Request transcription
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

    // 3. Recursive function for polling transcription status
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

      // Wait 5 seconds and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return pollTranscription(pollingEndpoint);
    };

    const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
    const transcriptionText = await pollTranscription(pollingEndpoint);

    // 4. Send the transcription result
    return res.json({ transcription: transcriptionText });
  } catch (error: any) {
    console.error("Error during transcription:", error);
    return res
      .status(500)
      .json({ error: "Failed to process the transcription" });
  }
};
