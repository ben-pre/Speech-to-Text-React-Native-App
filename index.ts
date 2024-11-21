import express, { Response, Request } from "express";
import "dotenv/config";
import { speechToText } from "./functions/speechToText";

const port = process.env.PORT || 4000;

const app = express();
app.use(
  express.json({
    limit: "50mb",
  })
);

app.post("/speech-to-text", (req: Request, res: Response) => {
  speechToText(req, res);
});

app.get("/", (req, res) => {
  res.send("Api running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
