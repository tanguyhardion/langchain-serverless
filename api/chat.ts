import { VercelRequest, VercelResponse } from "@vercel/node";
import { ChatOpenAI } from "@langchain/openai";
import { QASchema } from "../types/qa";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
  const llm = new ChatOpenAI({
    model: "gpt-5-nano",
    apiKey: process.env.OPENAI_API_KEY,
  });

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
   - Explique pourquoi c'est la bonne réponse en te basant sur le contexte

3. **Si l'utilisateur propose une réponse** :
   - Évalue si sa réponse est correcte ou proche de la réponse attendue
   - Si c'est correct : félicite-le et confirme la réponse
   - Si c'est incorrect : guide-le avec des indices sans révéler la réponse complète
   - Encourage-le à essayer encore (s'il lui reste des tentatives)

4. **Si l'utilisateur pose des questions ou demande de l'aide** :
   - Donne des indices utiles sans révéler directement la réponse
   - Guide-le vers la bonne direction
   - Utilise le contexte pour donner des pistes

**Ton style :**
- Sois encourageant et pédagogique
- Parle en français (mais utilise les passages/mots originaux en langue étrangère si nécessaire)
- Adapte ton niveau d'aide selon le nombre de tentatives
- Reste dans le rôle d'un tuteur bienveillant

Réponds maintenant au message de l'utilisateur.
`;

  try {
    console.log("Invoking LLM for interactive chat", {
      question: qaData.question,
      attemptCount,
      userMessagePreview: userMessage.slice(0, 100)
    });

    const response = await llm.invoke(`${systemPrompt}\n\nMessage de l'utilisateur: ${userMessage}`);
    
    console.log("LLM response received for chat");
    res.status(200).json({ 
      response: response.content,
      attemptCount: attemptCount + 1,
      question: qaData.question
    });
  } catch (error) {
    console.error("Error during LLM invocation", error);
    res.status(500).json({ error: "Failed to generate chat response" });
  }
}
