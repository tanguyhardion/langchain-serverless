import { VercelRequest, VercelResponse } from "@vercel/node";
import { QAListObjectSchema } from "../types/qa";
import { getLLM } from "../utils/llm";
import { 
  ALLOWED_ORIGINS,
  CORS_HEADERS,
  ALLOWED_METHODS,
  ALLOWED_REQUEST_HEADERS,
  HTTP_STATUS,
  ERROR_MESSAGES 
} from "../consts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(CORS_HEADERS.ORIGIN, origin);
  } else {
    res.setHeader(CORS_HEADERS.ORIGIN, "none");
  }
  res.setHeader(CORS_HEADERS.METHODS, "POST, OPTIONS");
  res.setHeader(CORS_HEADERS.HEADERS, ALLOWED_REQUEST_HEADERS);
  // Handle preflight OPTIONS request
  if (req.method === ALLOWED_METHODS.OPTIONS) {
    res.status(HTTP_STATUS.OK).end();
    return;
  }

  // Validate request method
  console.log("Received request", { method: req.method });
  if (req.method !== ALLOWED_METHODS.POST) {
    console.log("Rejected non-POST request");
    res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
    return;
  }

  // Validate request body
  const { articleInput } = req.body || {};
  if (!articleInput || typeof articleInput !== "string") {
    console.log("Invalid or missing articleInput", { articleInput });
    res.status(HTTP_STATUS.BAD_REQUEST).json({ error: ERROR_MESSAGES.MISSING_ARTICLE_INPUT });
    return;
  }

  // Configure LLM
  console.log("Configuring LLM");
  const llm = getLLM();

  // System prompt to enforce Q&A list format and require context
  const systemPrompt = `
Tu es un assistant IA spécialisé dans la création d'exercices de compréhension. Ton rôle est de transformer un article fourni en une série de questions-réponses pour tester la compréhension d'un utilisateur.

**Instructions :**

1. L'article fourni sera dans une langue étrangère (pas en français).
2. Crée **10 paires question-réponse-contexte** basées sur l'article.
3. Pour chaque paire :

   * Fournis **la question en français**.
   * Fournis **la réponse en français**.
   * Fournis **un extrait de l'article qui sert de contexte**, mais choisis un passage **assez large et général**, plusieurs paragraphes. L'objectif est que l'utilisateur doive réfléchir et chercher l'information.
4. Parmi les 10 questions, inclue **1 à 3 questions sur la langue de l'article** : par exemple, la signification de mots ou phrases difficiles présents dans le texte, ou le temps/déclinaison de certains mots.
5. Ne pose des questions que sur des informations réellement présentes dans l'article.
6. Les questions sur la langue doivent mentionner le mot ou la phrase cible dans la langue originale et expliquer sa signification en français.
7. Les passages cités doivent toujours rester dans la langue originale de l'article.

**Exemples :**

* Si l'article parle de Paris : crée des questions comme "Qu'est-ce que Paris ?" ou "Pourquoi Paris est-elle célèbre ?", mais donne un passage **général sur la ville ou son contexte**, plutôt que la phrase exacte contenant la réponse.
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
      `Invoking LLM with prompt and article: ${articleInput.slice(0, 500)}...`
    );
    qaListObject = await llm
      .withStructuredOutput(QAListObjectSchema)
      .invoke(fullPrompt);

    console.log("LLM response received", {
      qaCount: qaListObject?.items?.length,
    });
    res.status(HTTP_STATUS.OK).json(qaListObject);
  } catch (error) {
    console.error("Error during LLM invocation", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.FAILED_QA_GENERATION });
  }
}
