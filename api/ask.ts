import { VercelRequest, VercelResponse } from "@vercel/node";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define QA schema
const QASchema = z.object({
  question: z.string(),
  answer: z.string(),
});
const QAListObjectSchema = z.object({
  items: z.array(QASchema),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("Received request", { method: req.method });
  if (req.method !== "POST") {
    console.log("Rejected non-POST request");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { articleInput } = req.body || {};
  if (!articleInput || typeof articleInput !== "string") {
    console.log("Invalid or missing articleInput", { articleInput });
    res.status(400).json({ error: "Missing or invalid article input" });
    return;
  }

  // Configure LLM
  console.log("Configuring LLM");
  const llm = new ChatOpenAI({
    model: "gpt-5-nano",
    apiKey: process.env.OPENAI_API_KEY,
  });

  // System prompt to enforce Q&A list format
  const systemPrompt = `Tu es un assistant IA qui répond TOUJOURS sous forme de questions-réponses.\nDonne 10 paires question-réponse sur l'article fourni dans l'article ci-dessous, pour tester la compréhension de l'utilisateur.\nInclue quelques questions (maximum 3, mais pas forcément 3) sur la langue de l'article si elle n'est pas en français (par exemple, demande la signification de mots ou de phrases difficiles si l'article est en russe).\nToutes les questions et réponses doivent être en FRANÇAIS.\nFormatte la sortie comme une liste structurée de questions et leurs réponses.\nExemples :\n- Si l'article est sur Paris, crée des Q&R sur le contenu de l'article comme "Qu'est-ce que Paris ?" et "Pourquoi Paris est-elle célèbre ?" seulement si l'article contient ces informations bien entendu.\n- Si l'article est dans une langue étrangère, pose toujours les questions en français, mais ajoute des questions sur des mots ou phrases difficiles (dans la langue étrangère) présents dans le texte.`;

  // Combine system prompt and user prompt
  const fullPrompt = `${systemPrompt}\n\nArticle: ${articleInput}`;
  console.log("Invoking LLM with prompt");

  // Use withStructuredOutput to get structured QA list as an object
  let qaListObject: { items: { question: string; answer: string }[] };

  try {
    qaListObject = await llm
      .withStructuredOutput(QAListObjectSchema)
      .invoke(fullPrompt);
    console.log("LLM response received", {
      qaCount: qaListObject?.items?.length,
    });
    res.status(200).json(qaListObject);
  } catch (error) {
    console.error("Error during LLM invocation", error);
    res.status(500).json({ error: "Failed to generate Q&A list" });
  }
}
