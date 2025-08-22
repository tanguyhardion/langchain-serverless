import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be set in environment variables");
}
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Logs a message to the Supabase database
 * @param message - The message to log
 * @param level - The log level (info, error, warn, debug)
 * @param metadata - Additional metadata to include with the log
 */
export async function addLog(
  message: string,
  level: "info" | "error" | "warn" | "debug" = "info",
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // 2025-08-18
    const time = now.toTimeString().split(" ")[0] + "." + now.getMilliseconds(); // 22:50:12.000

    const { error } = await supabase.from("logs").insert([
      {
        message,
        level,
        date,
        time,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    ]);

    if (error) {
      console.error("Error inserting log:", error);
    }
  } catch (error) {
    console.error("Failed to log to database:", error);
  }
}
