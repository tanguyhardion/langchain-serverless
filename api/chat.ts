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
  const systemPrompt = `
Tu es un assistant IA conçu pour aider l'utilisateur à trouver la réponse à une question spécifique. Voici les règles importantes :

**Contexte :**
- Question : "${qaData.question}"
- Réponse correcte : "${qaData.answer}"
- Contexte de la réponse : "${qaData.context}"
- Nombre de tentatives de l'utilisateur : ${attemptCount}/3

**Règles de fonctionnement :**

1. **Si l'utilisateur demande directement la réponse** (phrases comme "donne-moi la réponse", "quelle est la réponse", "révèle la réponse", etc.) :
   - Révèle immédiatement la réponse correcte : "${qaData.answer}"
   - Explique en te basant sur le contexte : "${qaData.context}"

2. **Si l'utilisateur a déjà fait 3 tentatives incorrectes** :
   - Révèle automatiquement la réponse correcte : "${qaData.answer}"
   - Explique très brièvement pourquoi c'est la bonne réponse en te basant sur le contexte

3. **Si l'utilisateur propose une réponse** :
   - Évalue si sa réponse est correcte ou proche de la réponse attendue
     - Une réponse est considérée correcte si elle correspond assez à "${qaData.answer}" **ou si c'est une translittération correcte ou une variante linguistique équivalente**. 
   - Si c'est correct : félicite-le et confirme la réponse
   - Si c'est incorrect : guide-le brièvement avec des indices SANS RÉVÉLER LA RÉPONSE
   - Encourage-le à essayer encore (s'il lui reste des tentatives)

4. **Si l'utilisateur pose des questions ou demande de l'aide** :
   - Donne des indices utiles SANS RÉVÉLER LA RÉPONSE
   - Guide-le vers la bonne direction
   - Utilise le contexte pour donner des pistes

**Ton style :**
- Sois encourageant et pédagogique
- Parle en français (mais utilise les passages/mots originaux en langue étrangère si nécessaire)
- Adapte ton niveau d'aide selon le nombre de tentatives
- Reste dans le rôle d'un tuteur bienveillant
- Réponds de manière concise et claire

Réponds maintenant au message de l'utilisateur.
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
