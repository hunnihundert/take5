import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent } from '../test/testUtils';
import { Socket as ClientSocket } from 'socket.io-client';

describe('Room Handler Integration', () => {
  let server: any;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeEach(async () => {
    client1 = createSocketClient(server.port);
    client2 = createSocketClient(server.port);

    // Wait for connections
    await new Promise<void>((resolve) => {
      let connected = 0;
      const check = () => {
        connected++;
        if (connected === 2) resolve();
      };
      client1.on('connect', check);
      client2.on('connect', check);
    });
  });

  afterEach(() => {
    if (client1.connected) client1.disconnect();
    if (client2.connected) client2.disconnect();
  });

  it('should create a room and notify the creator', async () => {
    return new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', 'ROOM1', (response: any) => {
        expect(response.success).toBe(true);
        expect(response.roomCode).toBe('ROOM1');
        
        client1.on('roomJoined', (data: any) => {
          expect(data.roomCode).toBe('ROOM1');
          expect(data.player.name).toBe('Player 1');
          expect(data.player.isModerator).toBe(true);
          resolve();
        });
      });
    });
  });

  it('should allow multiple players to join and notify others', async () => {
    // 1. Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', 'ROOM2', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins room and we wait for notifications
    const playerJoinedPromise = waitForEvent<any>(client1, 'playerJoined');
    
    const joinResponse = await new Promise<any>((resolve) => {
      client2.emit('joinRoom', { roomCode: 'ROOM2', playerName: 'Player 2' }, resolve);
    });

    expect(joinResponse.success).toBe(true);

    const joinedPlayerData = await playerJoinedPromise;
    expect(joinedPlayerData.name).toBe('Player 2');
    expect(joinedPlayerData.isModerator).toBe(false);
  });

  it('should promote a new moderator when the original leaves', async () => {
     // 1. Client 1 creates room
     await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Player 1', 'ROOM3', (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 2. Client 2 joins
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode: 'ROOM3', playerName: 'Player 2' }, (res: any) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    // 3. Client 1 disconnects, Client 2 should be notified of playerLeft with newModeratorId
    const playerLeftPromise = waitForEvent<any>(client2, 'playerLeft');
    
    const client1Id = client1.id;
    const client2Id = client2.id;
    client1.disconnect();

    const leaveData = await playerLeftPromise;
    expect(leaveData.playerId).toBe(client1Id);
    expect(leaveData.newModeratorId).toBe(client2Id);
  });
});
