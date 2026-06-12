import { generateMockTelemetry } from '@/lib/metrics/mockTelemetry';

const SSE_INTERVAL_MS = 2000;

export function createMetricsSseResponse(
  resourceId: string,
  vcpu: number,
  ramGb: number,
  signal: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  let tick = 0;

  const stream = new ReadableStream({
    start(controller) {
      const pushSample = () => {
        const sample = generateMockTelemetry(resourceId, vcpu, ramGb, tick++);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(sample)}\n\n`));
      };

      pushSample();
      const interval = setInterval(pushSample, SSE_INTERVAL_MS);

      signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Stream may already be closed when the client disconnects.
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
