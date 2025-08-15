import { VercelRequest, VercelResponse } from "@vercel/node";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define QA schema
const QASchema = z.object({
  question: z.string(),
  answer: z.string(),
});
const QAListSchema = z.array(QASchema);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing or invalid prompt" });
    return;
  }

  // Configure LLM
  const llm = new ChatOpenAI({
    model: "gpt-5-nano",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Use withStructuredOutput to get structured QA list
  const qaList = await llm.withStructuredOutput(QAListSchema).invoke(prompt);

  res.status(200).json(qaList);
}
