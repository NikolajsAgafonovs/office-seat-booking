// Server-Sent Events bus (R-26, docs/api.md "Live updates").
import type { ServerResponse } from 'node:http';
import type { BookingEvent, DedicationEvent, ReleaseEvent } from '@seat/shared';

type EventMap = {
  booking: BookingEvent;
  release: ReleaseEvent;
  dedication: DedicationEvent;
};

export class EventBus {
  private readonly clients = new Set<ServerResponse>();
  private seq = 0;

  /** Attach a raw HTTP response as an SSE client; returns a detach function. */
  attach(res: ServerResponse, keepAliveMs = 25_000): () => void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    this.clients.add(res);
    const timer = setInterval(() => res.write(': ping\n\n'), keepAliveMs);
    const detach = () => {
      clearInterval(timer);
      this.clients.delete(res);
    };
    res.on('close', detach);
    return detach;
  }

  publish<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const frame = `id: ${++this.seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of this.clients) {
      if (res.writableEnded || res.destroyed) {
        this.clients.delete(res);
        continue;
      }
      res.write(frame);
    }
  }

  get size(): number {
    return this.clients.size;
  }

  closeAll(): void {
    for (const res of this.clients) res.end();
    this.clients.clear();
  }
}
