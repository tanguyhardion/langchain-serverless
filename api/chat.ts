import { VercelRequest, VercelResponse } from "@vercel/node";
import { QASchema, QASchemaType } from "../types/qa";
import { getLLM } from "../utils/llm";
import { addLog } from "../utils/logger";
import {
  MAX_ATTEMPTS,
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  ALLOWED_REQUEST_HEADERS,
  HTTP_STATUS,
  ERROR_MESSAGES,
} from "../consts";

/**
 * Builds the context information section for the system prompt
 */
function buildContextSection(
  qaData: QASchemaType,
  attemptCount: number
): string {
  return `**Contexte :**
- Question : "${qaData.question}"
- Réponse correcte : "${qaData.answer}"
- Contexte de la réponse : "${qaData.context}"
- Nombre de tentatives de l'utilisateur : ${attemptCount}/${MAX_ATTEMPTS}`;
}

/**
 * Builds the coaching mode prompt (for attempts < 3)
 * In this mode, the AI guides the user without revealing the answer
 */
function buildCoachingModePrompt(baseContext: string): string {
  return `Tu es un assistant IA de coaching pédagogique pour aider l'utilisateur à trouver la réponse à UNE question spécifique. Tu ne dois pas répondre à d'autres requêtes hors sujet.

${baseContext}

**Mode actuel (tentatives < ${MAX_ATTEMPTS}) :**
1. Ne RÉVÈLE JAMAIS la réponse, même si l'utilisateur la demande explicitement.
2. Si l'utilisateur insiste pour avoir la réponse, dis-lui simplement qu'il peut cliquer sur le bouton "Afficher la réponse" situé en dessous.
3. Donne des indices progressifs, pose des questions guidées et aide à raisonner, sans donner la réponse.
4. Si l'utilisateur propose une réponse :
   - Si elle est correcte, félicite et confirme.
   - Sinon, explique brièvement ce qui cloche et redirige avec des indices sans révéler la solution.
5. Reste strictement focalisé sur la question et son contexte.

**Style :**
- Encourageant, concis, clair, en français.
- Jamais de hors-sujet, pas de digression.`;
}

/**
 * Builds the explanatory mode prompt (for attempts >= 3)
 * In this mode, the AI can reveal and explain the correct answer
 */
function buildExplanatoryModePrompt(
  baseContext: string,
  answer: string
): string {
  return `Tu es maintenant un assistant IA explicatif pour aider l'utilisateur à COMPRENDRE la réponse, la question et le contexte.

${baseContext}

**Mode actuel (≥ ${MAX_ATTEMPTS} tentatives) :**
1. Tu peux révéler la réponse correcte : "${answer}".
2. Explique pourquoi c'est la bonne réponse en t'appuyant sur le contexte fourni.
3. Propose une explication structurée (raisonnement, repérage d'indices dans le contexte, pièges fréquents).
4. Réponds aux questions de clarification et donne des exemples courts si utile.
5. Reste centré sur cette question uniquement (pas de hors-sujet).

**Style :**
- Pédagogique, clair, concis, en français.`;
}

/**
 * Builds the complete system prompt based on QA data and attempt count
 *
 * The system switches between two modes:
 * - Coaching mode (< 3 attempts): Guides user without revealing answer
 * - Explanatory mode (≥ 3 attempts): Can reveal and explain the correct answer
 */
function buildSystemPrompt(qaData: QASchemaType, attemptCount: number): string {
  const baseContext = buildContextSection(qaData, attemptCount);

  if (attemptCount < MAX_ATTEMPTS) {
    return buildCoachingModePrompt(baseContext);
  } else {
    return buildExplanatoryModePrompt(baseContext, qaData.answer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(CORS_HEADERS.ORIGIN, origin);
  } else {
    res.setHeader(CORS_HEADERS.ORIGIN, "none");
  }
  // Handle preflight OPTIONS request
  if (req.method === ALLOWED_METHODS.OPTIONS) {
    res.setHeader(CORS_HEADERS.METHODS, "POST, OPTIONS");
    res.setHeader(CORS_HEADERS.HEADERS, "Content-Type");
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  // Validate request method
  console.log("Received request", { method: req.method });
  addLog("Received request", "info", { method: req.method });
  if (req.method !== ALLOWED_METHODS.POST) {
    console.log("Rejected non-POST request");
    addLog("Rejected non-POST request", "warn", { method: req.method });
    res
      .status(HTTP_STATUS.METHOD_NOT_ALLOWED)
      .json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  const { qaData, userMessage, attemptCount = 0 } = req.body || {};

  // Validate QA data
  try {
    QASchema.parse(qaData);
  } catch (error) {
    console.log("Invalid QA data", { qaData, error });
    addLog("Invalid QA data", "error", { qaData, error: String(error) });
    res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.INVALID_QA_DATA });
    return;
  }

  if (!userMessage || typeof userMessage !== "string") {
    console.log("Invalid or missing userMessage", { userMessage });
    addLog("Invalid or missing userMessage", "error", { userMessage });
    res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.MISSING_USER_MESSAGE });
    return;
  }

  // Configure LLM
  console.log("Configuring LLM");
  addLog("Configuring LLM", "info");
  const llm = getLLM();

  // Generate system prompt based on attempt count
  const systemPrompt = buildSystemPrompt(qaData, attemptCount);

  try {
    console.log("Invoking LLM for interactive chat", {
      question: qaData.question,
      attemptCount,
      userMessage: userMessage,
    });
    addLog("Invoking LLM for interactive chat", "info", {
      question: qaData.question,
      attemptCount,
      userMessage: userMessage,
    });

    const fullPrompt = `${systemPrompt}\n\nMessage de l'utilisateur: ${userMessage}`;

    const response = await llm.invoke(fullPrompt);

    console.log(`LLM response received for chat: ${response.content}`);
    addLog("LLM response received for chat", "info", { responseContent: response.content });
    res.status(HTTP_STATUS.OK).json({
      response: response.content,
      attemptCount: attemptCount + 1,
      question: qaData.question,
    });
  } catch (error) {
    console.error("Error during LLM invocation", error);
    addLog("Error during LLM invocation", "error", { error: String(error) });
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: ERROR_MESSAGES.FAILED_CHAT_RESPONSE });
  }
}
