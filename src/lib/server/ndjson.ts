import type { StreamEvent } from "@/lib/ai/events";

/**
 * A blank line sent this often keeps proxies and tunnels from closing a quiet stream while a
 * model is thinking or the fallback is switching models. Clients skip blank lines.
 */
const HEARTBEAT_MS = 10_000;

/** Streams events to the browser as newline-delimited JSON, one event per line. */
export function ndjsonResponse(events: AsyncGenerator<StreamEvent>, label: string): Response {
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The browser has disconnected; the generator stops on its abort signal.
        }
      };
      heartbeat = setInterval(() => write("\n"), HEARTBEAT_MS);
      try {
        for await (const event of events) write(`${JSON.stringify(event)}\n`);
      } catch (error) {
        console.error(`[${label}] unexpected failure`, error);
        write(
          `${JSON.stringify({ type: "error", message: "Something went wrong. Please try again." } satisfies StreamEvent)}\n`,
        );
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed by a disconnect.
        }
      }
    },
    cancel() {
      clearInterval(heartbeat);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
