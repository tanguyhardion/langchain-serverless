import { VercelRequest, VercelResponse } from "@vercel/node";
import { ChatOpenAI } from "@langchain/openai";
import { QASchema, QAListObjectSchema } from "../types/qa";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS: Allow only specific domains
  const allowedOrigins = [
    "localhost:3000",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.status(403).json({ error: "Forbidden: Origin not allowed" });
    return;
  }
  // Validate request method
  console.log("Received request", { method: req.method });
  if (req.method !== "POST") {
    console.log("Rejected non-POST request");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Validate request body
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

  // System prompt to enforce Q&A list format and require context
  const systemPrompt = `
Tu es un assistant IA spécialisé dans la création d'exercices de compréhension. Ton rôle est de transformer un article fourni en une série de questions-réponses pour tester la compréhension d'un utilisateur.

**Instructions :**

1. L'article fourni sera dans une langue étrangère (pas en français).
2. Crée **10 paires question-réponse-contexte** basées sur l'article.
3. Pour chaque paire :

   * Fournis **la question en français**.
   * Fournis **la réponse en français**.
   * Fournis **le passage exact de l'article qui justifie la réponse**, dans la langue d'origine.
4. Inclue **1 à 3 questions sur la langue de l'article** : par exemple, la signification de mots ou phrases difficiles présents dans le texte, ou le temps/déclinaison de certains mots.
5. Ne pose des questions que sur des informations réellement présentes dans l'article.
6. Les questions sur la langue doivent mentionner le mot ou la phrase cible dans la langue originale et expliquer sa signification en français.
7. Les passages cités doivent toujours rester dans la langue originale de l'article.

**Exemples :**

* Si l'article parle de Paris : crée des questions comme "Qu'est-ce que Paris ?" ou "Pourquoi Paris est-elle célèbre ?" uniquement si ces informations apparaissent dans l'article, avec le passage original comme contexte.
* Si l'article est dans une langue étrangère : toutes les questions sont en français, mais inclue 1 à 3 questions sur des mots ou phrases difficiles, avec le passage original correspondant.
`;

  // Combine system prompt and user prompt
  const fullPrompt = `${systemPrompt}\n\nArticle: ${articleInput}`;

  // Use withStructuredOutput to get structured QA list as an object
  let qaListObject: {
    items: { question: string; answer: string; context: string }[];
  };

  try {
    console.log(
      `Invoking LLM with prompt and article: ${articleInput.slice(0, 100)}...`
    );
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
