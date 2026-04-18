import { describe, it, expect } from 'vitest';
import { io as Client } from 'socket.io-client';
import { createTestServer, createSocketClient, waitForReady } from './test/testUtils';
import { CAPS } from './utils/validation';

describe('Socket.IO maxActiveSessions cap', () => {
  it('rejects new connections when session cap is reached', async () => {
    const server = await createTestServer({ disconnectGraceMs: 300, voluntaryDisconnectGraceMs: 100 });

    // Pre-fill the session manager to the cap limit
    for (let i = 0; i < CAPS.maxActiveSessions; i++) {
      server.sessionManager.createSession(`fake-session-${i}`);
    }

    const errMessage = await new Promise<string>((resolve, reject) => {
      const extra = Client(`http://localhost:${server.port}`, {
        forceNew: true,
        transports: ['websocket'],
        reconnection: false,
      });
      extra.on('connect_error', (err) => {
        extra.disconnect();
        resolve(err.message);
      });
      extra.on('connect', () => {
        extra.disconnect();
        reject(new Error('Expected rejection but connection succeeded'));
      });
    });

    expect(errMessage).toMatch(/capacity/i);
    await server.close();
  }, 10_000);

  it('allows reconnection with a known session ID even when cap is reached', async () => {
    const server = await createTestServer({ disconnectGraceMs: 300, voluntaryDisconnectGraceMs: 100 });

    // Establish one real client to obtain a valid session ID
    const client = createSocketClient(server.port);
    await waitForReady(client);
    const sessionId = client.sessionId;
    client.disconnect();

    // Fill remaining slots to reach the cap
    const remaining = CAPS.maxActiveSessions - server.sessionManager.sessionCount();
    for (let i = 0; i < remaining; i++) {
      server.sessionManager.createSession(`fake-session-${i}`);
    }

    // Reconnect with the known session ID — should bypass the cap check
    const reconnected = await new Promise<boolean>((resolve) => {
      const rc = Client(`http://localhost:${server.port}`, {
        forceNew: true,
        transports: ['websocket'],
        reconnection: false,
        auth: { sessionId },
      });
      rc.on('connect', () => { rc.disconnect(); resolve(true); });
      rc.on('connect_error', () => resolve(false));
    });

    expect(reconnected).toBe(true);
    await server.close();
  }, 10_000);
});
