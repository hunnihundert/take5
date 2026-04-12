import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent, waitForReady, TestClient } from '../test/testUtils';

describe('Room Handler Integration', () => {
  let server: any;
  let testIndex = 0;

  beforeAll(async () => {
    // Use a very short grace period for tests
    server = await createTestServer({ disconnectGraceMs: 200 });
  });

  afterAll(async () => {
    await server.close();
  });

  let client1: TestClient;
  let client2: TestClient;

  beforeEach(async () => {
    testIndex++;
    client1 = createSocketClient(server.port);
    client2 = createSocketClient(server.port);

    await Promise.all([waitForReady(client1), waitForReady(client2)]);
  });

  afterEach(() => {
    if (client1.connected) client1.disconnect();
    if (client2.connected) client2.disconnect();
  });

  it('should create a room and notify the creator', async () => {
    const roomCode = `ROOM${testIndex}`;
    return new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.roomCode).toBe(roomCode);

        client1.on('roomJoined', (data: any) => {
          expect(data.roomCode).toBe(roomCode);
          expect(data.player.name).toBe('Player 1');
          expect(data.player.isModerator).toBe(true);
          resolve();
        });
      });
    });
  });

  it('should allow multiple players to join and notify others', async () => {
    const roomCode = `ROOM${testIndex}`;

    // 1. Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins room and we wait for notifications
    const playerJoinedPromise = waitForEvent<any>(client1, 'playerJoined');

    const joinResponse = await new Promise<any>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, resolve);
    });

    expect(joinResponse.success).toBe(true);

    const joinedPlayerData = await playerJoinedPromise;
    expect(joinedPlayerData.name).toBe('Player 2');
    expect(joinedPlayerData.isModerator).toBe(false);
  });

  it('should transfer moderator when current moderator requests it', async () => {
    const roomCode = `TROOM${testIndex}`;

    // 1. Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 3. Client 1 (moderator) transfers to Client 2 — use session IDs, not socket IDs
    const transferPromise1 = waitForEvent<any>(client1, 'moderatorTransferred');
    const transferPromise2 = waitForEvent<any>(client2, 'moderatorTransferred');

    client1.emit('transferModerator', { toPlayerId: client2.sessionId });

    const [data1, data2] = await Promise.all([transferPromise1, transferPromise2]);
    expect(data1.fromPlayerId).toBe(client1.sessionId);
    expect(data1.toPlayerId).toBe(client2.sessionId);
    expect(data2.fromPlayerId).toBe(client1.sessionId);
    expect(data2.toPlayerId).toBe(client2.sessionId);
  });

  it('should NOT transfer moderator when a non-moderator requests it', async () => {
    const roomCode = `TROOM${testIndex}`;

    // 1. Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins (not a moderator)
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 3. Client 2 (non-moderator) tries to transfer to Client 1
    const expectNoEvent = (timeoutMs: number) =>
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), timeoutMs));

    const transferReceived = new Promise<'event'>((resolve) => {
      client1.on('moderatorTransferred', () => resolve('event'));
      client2.on('moderatorTransferred', () => resolve('event'));
    });

    client2.emit('transferModerator', { toPlayerId: client1.sessionId });

    const result = await Promise.race([transferReceived, expectNoEvent(100)]);
    expect(result).toBe('timeout');
  });

  it('should remove player immediately when leaveRoom is emitted before disconnect', async () => {
    const roomCode = `ROOM${testIndex}`;

    // 1. Client 1 creates room, Client 2 joins
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 emits leaveRoom — should fire playerLeft immediately (no grace period)
    // Note: we do NOT call disconnect() here. Calling disconnect() right after emit()
    // can race on the server (disconnect event arrives before leaveRoom is processed).
    // The real beforeunload scenario sends the event and lets the browser close naturally.
    const playerLeftPromise = waitForEvent<any>(client1, 'playerLeft');
    const start = Date.now();

    client2.emit('leaveRoom');

    const leaveData = await playerLeftPromise;
    const elapsed = Date.now() - start;

    expect(leaveData.playerId).toBe(client2.sessionId);
    expect(elapsed).toBeLessThan(100); // well under the 200ms grace period
  });

  it('should NOT remove player on leaveRoom when other tabs are still open', async () => {
    const roomCode = `ROOM${testIndex}`;

    // 1. Client 1 creates room, Client 2a joins
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Simulate a second tab: connect with the same sessionId
    const { io: ioc } = await import('socket.io-client');
    const client2b = ioc(`http://localhost:${server.port}`, {
      reconnectionDelay: 0,
      forceNew: true,
      transports: ['websocket'],
      auth: { sessionId: client2.sessionId },
    });
    await new Promise<void>((resolve) => client2b.once('connect', resolve));

    // 3. Client 2a emits leaveRoom and disconnects — should NOT fire playerLeft
    const playerLeftFired = new Promise<'event'>((resolve) => {
      client1.once('playerLeft', () => resolve('event'));
    });
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 100));

    client2.emit('leaveRoom');
    client2.disconnect();

    const result = await Promise.race([playerLeftFired, timeout]);
    expect(result).toBe('timeout');

    client2b.disconnect();
  });

  it('should still use grace period for involuntary disconnect (no leaveRoom)', async () => {
    const roomCode = `ROOM${testIndex}`;

    // 1. Client 1 creates room, Client 2 joins
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 disconnects without emitting leaveRoom
    const playerLeftPromise = waitForEvent<any>(client1, 'playerLeft');
    const playerDisconnectedPromise = waitForEvent<any>(client1, 'playerDisconnected');
    const start = Date.now();

    client2.disconnect();

    // playerDisconnected should fire quickly
    await playerDisconnectedPromise;
    expect(Date.now() - start).toBeLessThan(100);

    // playerLeft should fire after grace period (~200ms), not before
    await playerLeftPromise;
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(150);
  }, 10_000);

  it('should handle leaveRoom gracefully when player is not in a room', async () => {
    // Client 1 connects but never joins a room — emitting leaveRoom should not crash
    await expect(
      new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(resolve, 100);
        client1.once('error', (err: any) => {
          clearTimeout(timeout);
          reject(new Error(`Unexpected error: ${err}`));
        });
        client1.emit('leaveRoom');
      })
    ).resolves.toBeUndefined();
  });

  it('should promote a new moderator when the original leaves', async () => {
    const roomCode = `ROOM${testIndex}`;

    // 1. Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', roomCode, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 3. Client 1 disconnects — grace period (200ms in test) starts, then playerLeft fires
    const playerLeftPromise = waitForEvent<any>(client2, 'playerLeft');

    const client1SessionId = client1.sessionId;
    const client2SessionId = client2.sessionId;
    client1.disconnect();

    const leaveData = await playerLeftPromise;
    expect(leaveData.playerId).toBe(client1SessionId);
    expect(leaveData.newModeratorId).toBe(client2SessionId);
  }, 10_000);
});
