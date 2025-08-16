import { ChatOpenAI } from "@langchain/openai";

export function getLLM() {
  return new ChatOpenAI({
    model: "gpt-5-nano",
    apiKey: process.env.OPENAI_API_KEY,
    reasoning: {
      effort: "minimal",
    },
  });
}
