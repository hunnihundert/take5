import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent, waitForReady, TestClient } from '../test/testUtils';

describe('Room Handler Integration', () => {
  let server: any;
  let testIndex = 0;

  beforeAll(async () => {
    // Short grace periods for tests; voluntary (100ms) < involuntary (300ms) for clear distinction
    server = await createTestServer({ disconnectGraceMs: 300, voluntaryDisconnectGraceMs: 100 });
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

  it('should emit playerDisconnected immediately and playerLeft after voluntary grace period on leaveRoom', async () => {
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

    const received: string[] = [];
    const playerDisconnectedPromise = new Promise<any>(resolve => {
      client1.once('playerDisconnected', (data) => { received.push('playerDisconnected'); resolve(data); });
    });
    const playerLeftPromise = new Promise<any>(resolve => {
      client1.once('playerLeft', (data) => { received.push('playerLeft'); resolve(data); });
    });

    client2.emit('leaveRoom');

    // playerDisconnected must arrive before playerLeft
    await playerDisconnectedPromise;
    expect(received).toEqual(['playerDisconnected']);

    const leaveData = await playerLeftPromise;
    expect(leaveData.playerId).toBe(client2.sessionId);
    expect(received).toEqual(['playerDisconnected', 'playerLeft']);
  }, 10_000);

  it('should use voluntary grace period when all tabs close (multi-tab window close)', async () => {
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

    // 2. Open a second tab for the same session (simulates two tabs in one browser window)
    const { io: ioc } = await import('socket.io-client');
    const client2b = ioc(`http://localhost:${server.port}`, {
      reconnectionDelay: 0,
      forceNew: true,
      transports: ['websocket'],
      auth: { sessionId: client2.sessionId },
    });
    await new Promise<void>((resolve) => client2b.once('connect', resolve));

    // 3. Both tabs emit leaveRoom (sockets.size > 1 so both return early,
    //    but voluntary intent is recorded for each socket/tab)
    client2.emit('leaveRoom');
    client2b.emit('leaveRoom');

    // 4. Track event ordering on client1
    const received: string[] = [];
    const playerDisconnectedPromise = new Promise<void>(resolve => {
      client1.once('playerDisconnected', () => { received.push('playerDisconnected'); resolve(); });
    });
    const playerLeftPromise = new Promise<any>(resolve => {
      client1.once('playerLeft', (data) => { received.push('playerLeft'); resolve(data); });
    });

    // 5. Both tabs disconnect — last one should trigger the voluntary (short) grace period
    client2.disconnect();
    client2b.disconnect();

    await playerDisconnectedPromise;
    expect(received).toEqual(['playerDisconnected']);

    const leaveData = await playerLeftPromise;
    expect(leaveData.playerId).toBe(client2.sessionId);
    expect(received).toEqual(['playerDisconnected', 'playerLeft']);
  }, 10_000);

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

    // 3. Client 2a emits leaveRoom and disconnects — should NOT fire playerDisconnected or playerLeft
    const unexpectedEvent = new Promise<'event'>((resolve) => {
      client1.once('playerDisconnected', () => resolve('event'));
      client1.once('playerLeft', () => resolve('event'));
    });
    // Wait longer than voluntaryDisconnectGraceMs (100ms) to be sure neither fires
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 250));

    client2.emit('leaveRoom');
    client2.disconnect();

    const result = await Promise.race([unexpectedEvent, timeout]);
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
    const received: string[] = [];
    const playerDisconnectedPromise = new Promise<any>(resolve => {
      client1.once('playerDisconnected', (data) => { received.push('playerDisconnected'); resolve(data); });
    });
    const playerLeftPromise = new Promise<any>(resolve => {
      client1.once('playerLeft', (data) => { received.push('playerLeft'); resolve(data); });
    });

    client2.disconnect();

    // playerDisconnected must arrive before playerLeft
    await playerDisconnectedPromise;
    expect(received).toEqual(['playerDisconnected']);

    await playerLeftPromise;
    expect(received).toEqual(['playerDisconnected', 'playerLeft']);
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

  it('should restore player if they reconnect within the voluntary grace period (reload case)', async () => {
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

    // 2. Client 2 emits leaveRoom — playerDisconnected fires, short timer starts
    const playerDisconnectedPromise = waitForEvent<any>(client1, 'playerDisconnected');
    client2.emit('leaveRoom');
    await playerDisconnectedPromise;

    // 3. Before the voluntary grace period expires, reconnect with the same sessionId
    //    (simulates a page reload — browser closes the old socket, opens a new one)
    const { io: ioc } = await import('socket.io-client');
    const client2Reload = ioc(`http://localhost:${server.port}`, {
      reconnectionDelay: 0,
      forceNew: true,
      transports: ['websocket'],
      auth: { sessionId: client2.sessionId },
    });

    const [playerReconnectedData] = await Promise.all([
      waitForEvent<any>(client1, 'playerReconnected'),
      new Promise<void>((resolve) => client2Reload.once('connect', resolve)),
    ]);

    expect(playerReconnectedData.playerId).toBe(client2.sessionId);

    // 4. playerLeft must NOT fire — the timer was cancelled on reconnect
    const playerLeftFired = new Promise<'event'>((resolve) => {
      client1.once('playerLeft', () => resolve('event'));
    });
    const neverFired = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 250));
    expect(await Promise.race([playerLeftFired, neverFired])).toBe('timeout');

    client2Reload.disconnect();
  }, 10_000);

  it('should use involuntary grace period when only one of two tabs emitted leaveRoom and the other disconnects', async () => {
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

    // 2. Open a second tab for the same session
    const { io: ioc } = await import('socket.io-client');
    const client2b = ioc(`http://localhost:${server.port}`, {
      reconnectionDelay: 0,
      forceNew: true,
      transports: ['websocket'],
      auth: { sessionId: client2.sessionId },
    });
    await new Promise<void>((resolve) => client2b.once('connect', resolve));

    // 3. Only Tab A emits leaveRoom (intent is per-socket, not session-wide)
    client2.emit('leaveRoom');
    // Small pause to ensure leaveRoom is processed before disconnect
    await new Promise(resolve => setTimeout(resolve, 20));

    // 4. Tab A disconnects (leaveRoom already processed, socket flagged voluntary)
    client2.disconnect();
    // Small pause to let Tab A's disconnect be processed
    await new Promise(resolve => setTimeout(resolve, 20));

    // 5. Tab B (client2b) disconnects WITHOUT emitting leaveRoom — should use INVOLUNTARY grace period
    const received: string[] = [];
    const playerDisconnectedPromise = new Promise<void>(resolve => {
      client1.once('playerDisconnected', () => { received.push('playerDisconnected'); resolve(); });
    });
    const playerLeftPromise = new Promise<any>(resolve => {
      client1.once('playerLeft', (data) => { received.push('playerLeft'); resolve(data); });
    });

    client2b.disconnect();

    // Both events should arrive (involuntary grace period = 300ms in tests)
    await playerDisconnectedPromise;
    expect(received).toEqual(['playerDisconnected']);

    const leaveData = await playerLeftPromise;
    expect(leaveData.playerId).toBe(client2.sessionId);
    expect(received).toEqual(['playerDisconnected', 'playerLeft']);
  }, 10_000);

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
