import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent, waitForReady, TestClient } from '../test/testUtils';

describe('Story Handler Integration', () => {
  let server: any;
  let testIndex = 0;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  let client1: TestClient;
  let roomCode: string;

  beforeEach(async () => {
    testIndex++;
    roomCode = `STORY${testIndex}`;

    client1 = createSocketClient(server.port);
    await waitForReady(client1);

    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Moderator', roomCode, () => resolve());
    });
  });

  afterEach(() => {
    if (client1.connected) client1.disconnect();
  });

  it('should add a valid story', async () => {
    const storyAdded = waitForEvent<any>(client1, 'storyAdded');
    client1.emit('addManualStory', 'A valid story summary');
    const story = await storyAdded;
    expect(story.summary).toBe('A valid story summary');
  });

  describe('input validation', () => {
    it('should emit error for an empty story summary', async () => {
      const errorPromise = waitForEvent<any>(client1, 'error');
      client1.emit('addManualStory', '');
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/summary/i);
    });

    it('should emit error for an oversized story summary', async () => {
      const errorPromise = waitForEvent<any>(client1, 'error');
      client1.emit('addManualStory', 'X'.repeat(501));
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/summary/i);
    });

    it('should silently ignore addManualStory when summary is not a string', async () => {
      const noEvent = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 150));
      const storyAdded = new Promise<'event'>((resolve) => {
        client1.once('storyAdded', () => resolve('event'));
      });
      (client1 as any).emit('addManualStory', 12345);
      expect(await Promise.race([storyAdded, noEvent])).toBe('timeout');
    });
  });
});
