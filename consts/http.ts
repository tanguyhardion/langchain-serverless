/**
 * HTTP status codes and error messages
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  METHOD_NOT_ALLOWED: "Method not allowed",
  INVALID_QA_DATA: "Invalid QA data format",
  MISSING_USER_MESSAGE: "Missing or invalid user message",
  MISSING_URL: "Missing or invalid url",
  FAILED_TO_FETCH: "Failed to fetch the URL",
  EXTRACT_TEXT_ERROR: "Error extracting text",
  FAILED_CHAT_RESPONSE: "Failed to generate chat response",
  MISSING_ARTICLE_INPUT: "Missing or invalid article input",
  FAILED_QA_GENERATION: "Failed to generate Q&A list",
} as const;
