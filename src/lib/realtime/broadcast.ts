import { createAdminClient } from "@/lib/supabase/server";

const CHANNEL_NAME = "crm-webhook-signals";
const TIMEOUT_MS = 5000;

/**
 * Envia um sinal broadcast via Supabase Realtime para notificar
 * o client-side de mudanças no banco de dados.
 *
 * Fire-and-forget: nunca lança exceção, nunca bloqueia o webhook.
 */
export async function broadcastTableChange(
  table: string,
  event: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel(CHANNEL_NAME);

    // Aguarda subscription com timeout
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          else if (status === "CHANNEL_ERROR") reject(new Error("Channel error"));
        });
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Broadcast subscribe timeout")), TIMEOUT_MS)
      ),
    ]);

    await channel.send({
      type: "broadcast",
      event: "db-change",
      payload: { table, event, timestamp: Date.now() },
    });

    await supabase.removeChannel(channel);
  } catch (error) {
    console.error("[Broadcast] Error (non-fatal):", error);
  }
}
