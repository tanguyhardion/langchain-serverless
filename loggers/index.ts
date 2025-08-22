import { addLog } from './database-logger';
import { sendLogEmail } from './mail-logger';

/**
 * Convenience function that combines database logging and email sending
 * @param message - The message to log and email
 * @param level - The log level (info, error, warn, debug)
 * @param metadata - Additional metadata to include
 * @param sendEmail - Whether to send email notification (default: true)
 */
export async function logAndEmail(
  message: string,
  level: "info" | "error" | "warn" | "debug" = "info",
  metadata?: Record<string, any>,
  sendEmail: boolean = true
): Promise<void> {
  // Log to database
  await addLog(message, level, metadata);
  
  // Send email notification if requested
  if (sendEmail) {
    await sendLogEmail(message, level, metadata);
  }
}

// Re-export the addLog function for backward compatibility
export { addLog } from './database-logger';
