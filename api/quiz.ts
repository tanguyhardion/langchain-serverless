import { VercelRequest, VercelResponse } from "@vercel/node";
import { QAListObjectSchema } from "../types/qa";
import { getLLM } from "../utils/llm";
import { addLog } from "../loggers";
import { handleCorsAndMethod } from "../utils/cors";
import { HTTP_STATUS, ERROR_MESSAGES } from "../consts";

function buildSystemPrompt(): string {
  return `
Tu es un assistant IA spécialisé dans la création d'exercices de compréhension. Ton rôle est de transformer un article fourni en une série de questions-réponses pour tester la compréhension d'un utilisateur.

**Instructions :**

1. L'article fourni sera dans une langue étrangère (pas en français).
2. Crée **10 paires question-réponse-contexte** basées sur l'article.
3. Pour chaque paire :

   * Fournis **la question en français**.
   * Fournis **la réponse en français**.
   * Fournis **trois extraits de contexte imbriqués** qui contiennent tous la réponse :
     - **contextLarge** : Un passage large et général de plusieurs paragraphes qui contient la réponse
     - **contextMedium** : Un passage plus petit (quelques phrases) qui contient encore la réponse et qui est inclus dans contextLarge
     - **contextSmall** : Un seul paragraphe concis qui contient la réponse et qui est inclus dans contextMedium
   * L'objectif est que l'utilisateur doive réfléchir et chercher l'information à différents niveaux de granularité.
4. Parmi les 10 questions, inclue **1 à 3 questions sur la langue de l'article** : par exemple, la signification de mots ou phrases difficiles présents dans le texte, ou le temps/déclinaison de certains mots.
5. Ne pose des questions que sur des informations réellement présentes dans l'article.
6. Les questions sur la langue doivent mentionner le mot ou la phrase cible dans la langue originale et expliquer sa signification en français.
7. Les passages cités doivent toujours rester dans la langue originale de l'article.
8. **Important** : Assure-toi que contextSmall est contenu dans contextMedium, et que contextMedium est contenu dans contextLarge pour créer une hiérarchie imbriquée.

**Exemple :**

* Si l'article parle de Paris : crée des questions comme "Qu'est-ce que Paris ?" ou "Pourquoi Paris est-elle célèbre ?", mais donne :
  - contextLarge : plusieurs paragraphes généraux sur la ville et son histoire
  - contextMedium : quelques phrases spécifiques sur Paris
  - contextSmall : une phrase concise qui contient directement la réponse
* Si l'article est dans une langue étrangère : toutes les questions sont en français, mais inclue 1 à 3 questions sur des mots ou phrases difficiles, avec les trois niveaux de contexte correspondants.
`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS and method validation
  if (!handleCorsAndMethod(req, res, "POST")) {
    return;
  }

  // Validate request body
  const { articleInput } = req.body || {};
  if (!articleInput || typeof articleInput !== "string") {
    console.log("Invalid or missing articleInput", { articleInput });
    addLog("Invalid or missing articleInput", "error", {
      articleInputLength: articleInput?.length || 0,
    });
    res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ error: ERROR_MESSAGES.MISSING_ARTICLE_INPUT });
    return;
  }

  // Configure LLM
  console.log("Configuring LLM");
  addLog("Configuring LLM", "info");
  const llm = getLLM();

  // System prompt to enforce Q&A list format and require context
  const systemPrompt = buildSystemPrompt();

  // Combine system prompt and user prompt
  const fullPrompt = `${systemPrompt}\n\nArticle: ${articleInput}`;

  // Use withStructuredOutput to get structured QA list as an object
  let qaListObject: {
    items: { question: string; answer: string; contextLarge: string; contextMedium: string; contextSmall: string }[];
  };

  try {
    console.log(
      `Invoking LLM with prompt and article: ${articleInput.slice(0, 500)}...`
    );
    addLog("Invoking LLM with prompt and article", "info", {
      articleInputLength: articleInput.length,
      articlePreview: articleInput.slice(0, 500),
    });
    qaListObject = await llm
      .withStructuredOutput(QAListObjectSchema)
      .invoke(fullPrompt);

    console.log("LLM response received", {
      qaCount: qaListObject?.items?.length,
    });
    addLog("LLM response received", "info", {
      qaCount: qaListObject?.items?.length,
    });
    res.status(HTTP_STATUS.OK).json(qaListObject);
  } catch (error) {
    console.error("Error during LLM invocation", error);
    addLog("Error during LLM invocation", "error", { error: String(error) });
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: ERROR_MESSAGES.FAILED_QA_GENERATION });
  }
}
