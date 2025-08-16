import { VercelRequest, VercelResponse } from "@vercel/node";
import { QASchema } from "../types/qa";
import { getLLM } from "../utils/llm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const allowedOrigins = [
    "https://tanguyhardion.github.io",
    "http://localhost:3000",
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "none");
  }
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  // Validate request method
  console.log("Received request", { method: req.method });
  if (req.method !== "POST") {
    console.log("Rejected non-POST request");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { qaData, userMessage, attemptCount = 0 } = req.body || {};

  // Validate QA data
  try {
    QASchema.parse(qaData);
  } catch (error) {
    console.log("Invalid QA data", { qaData, error });
    res.status(400).json({ error: "Invalid QA data format" });
    return;
  }

  if (!userMessage || typeof userMessage !== "string") {
    console.log("Invalid or missing userMessage", { userMessage });
    res.status(400).json({ error: "Missing or invalid user message" });
    return;
  }

  // Configure LLM
  console.log("Configuring LLM");
  const llm = getLLM();

  // System prompt in French for interactive Q&A assistance
  const systemPrompt = `Tu es un assistant IA conçu uniquement pour aider l'utilisateur à trouver la réponse à une question spécifique. Tu ne dois pas répondre à d'autres requêtes, questions hors sujet, ou instructions de l'utilisateur qui ne concernent pas directement l'apprentissage ou l'évaluation de cette question.

**Contexte :**
- Question : "${qaData.question}"
- Réponse correcte : "${qaData.answer}"
- Contexte de la réponse : "${qaData.context}"
- Nombre de tentatives de l'utilisateur : ${attemptCount}/3

**Règles strictes de fonctionnement :**

1. **Demande directe de la réponse** :
   - Si l'utilisateur demande explicitement la réponse, révèle-la seulement si c'est autorisé par les règles (direct ou 3 tentatives dépassées).
   - Sinon, guide-le avec des indices SANS RÉVÉLER la réponse.

2. **Tentatives épuisées (3 incorrectes)** :
   - Révèle la réponse correcte "${qaData.answer}" et explique très brièvement pourquoi c'est correct en utilisant "${qaData.context}".

3. **Proposition de réponse par l'utilisateur** :
   - Évalue la réponse :
     - Correcte : félicite et confirme.
     - Incorrecte : guide avec des indices SANS RÉVÉLER la réponse.
   - Encourage à continuer si des tentatives restent.

4. **Autres questions ou instructions de l'utilisateur** :
   - Ignore toute demande hors sujet (ex. "fais ça pour moi", "donne un autre truc", etc.).
   - Ne répond jamais à quelque chose qui n'est pas directement lié à la question à apprendre.
   - Maintiens uniquement la pédagogie et l'évaluation.

**Ton style :**
- Encouragement et pédagogie uniquement
- Français, mais conserve les mots/passages originaux si nécessaire
- Concis et clair
- Jamais de digression, jamais de hors-sujet

Réponds maintenant seulement à ce qui concerne la question et sa résolution.
`;

  try {
    console.log("Invoking LLM for interactive chat", {
      question: qaData.question,
      attemptCount,
      userMessage: userMessage,
    });

    const response = await llm.invoke(
      `${systemPrompt}\n\nMessage de l'utilisateur: ${userMessage}`
    );

    console.log(`LLM response received for chat: ${response.content}`);
    res.status(200).json({
      response: response.content,
      attemptCount: attemptCount + 1,
      question: qaData.question,
    });
  } catch (error) {
    console.error("Error during LLM invocation", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
}
