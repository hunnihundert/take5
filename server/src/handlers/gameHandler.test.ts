import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent } from '../test/testUtils';
import { Socket as ClientSocket } from 'socket.io-client';

describe('Game Handler Integration', () => {
  let server: any;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  let client1: ClientSocket;
  let client2: ClientSocket;
  const ROOM_CODE = 'GAME1';

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

    // Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Moderator', ROOM_CODE, () => resolve());
    });

    // Client 2 joins room
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode: ROOM_CODE, playerName: 'Player 2' }, () => resolve());
    });
  });

  afterEach(() => {
    if (client1.connected) client1.disconnect();
    if (client2.connected) client2.disconnect();
  });

  it('should broadcast card selection', async () => {
    const cardSelectedPromise = waitForEvent<any>(client2, 'cardSelected');
    
    client1.emit('selectCard', 5);

    const data = await cardSelectedPromise;
    expect(data.playerId).toBe(client1.id);
    expect(data.hasVoted).toBe(true);
  });

  it('should auto-reveal when all players have voted', async () => {
    const cardsRevealedPromise = waitForEvent<any[]>(client1, 'cardsRevealed');
    
    client1.emit('selectCard', 3);
    client2.emit('selectCard', 5);

    const players = await cardsRevealedPromise;
    expect(players).toHaveLength(2);
    expect(players.find(p => p.id === client1.id).selectedCard).toBe(3);
    expect(players.find(p => p.id === client2.id).selectedCard).toBe(5);
  });

  it('should not allow non-moderators to manually reveal cards', async () => {
    // client2 is not moderator
    client2.emit('revealCards');
    
    // We expect NO cardsRevealed event
    // To test this properly, we'd need to wait a bit and ensure it didn't happen
    // or check the internal state
    await new Promise(resolve => setTimeout(resolve, 100));
    const room = server.roomManager.getRoom(ROOM_CODE);
    expect(room.revealed).toBe(false);
  });

  it('should allow moderator to manually reveal cards', async () => {
    const cardsRevealedPromise = waitForEvent<any[]>(client2, 'cardsRevealed');
    
    client1.emit('revealCards');

    const players = await cardsRevealedPromise;
    expect(players).toBeDefined();
    const room = server.roomManager.getRoom(ROOM_CODE);
    expect(room.revealed).toBe(true);
  });

  it('should reset votes when starting a new round', async () => {
    // 1. Vote and reveal
    client1.emit('selectCard', 3);
    client2.emit('selectCard', 5);
    await waitForEvent(client1, 'cardsRevealed');

    // 2. Start new round
    const newRoundPromise = waitForEvent(client2, 'newRound');
    client1.emit('startNewRound');
    await newRoundPromise;

    const room = server.roomManager.getRoom(ROOM_CODE);
    expect(room.revealed).toBe(false);
    expect(Array.from(room.players.values()).every(p => p.selectedCard === null)).toBe(true);
  });

  it('should toggle observer mode and exclude from auto-reveal', async () => {
    // 1. Client 2 becomes observer
    const observerToggledPromise = waitForEvent<any>(client1, 'observerToggled');
    client2.emit('toggleObserver');
    const toggleData = await observerToggledPromise;
    expect(toggleData.playerId).toBe(client2.id);
    expect(toggleData.isObserver).toBe(true);

    // 2. Client 1 votes, should auto-reveal immediately because client 2 is observer
    const cardsRevealedPromise = waitForEvent<any[]>(client2, 'cardsRevealed');
    client1.emit('selectCard', 8);
    
    const players = await cardsRevealedPromise;
    expect(players).toBeDefined();
    expect(players.find(p => p.id === client1.id).selectedCard).toBe(8);
  });

  it('should handle multiple players voting simultaneously', async () => {
    // 1. Create 5 more clients
    const extraClients = await Promise.all(
      Array.from({ length: 5 }).map(async (_, i) => {
        const c = createSocketClient(server.port);
        await new Promise<void>(res => c.on('connect', res));
        await new Promise<void>(res => c.emit('joinRoom', { roomCode: ROOM_CODE, playerName: `Extra ${i}` }, res));
        return c;
      })
    );

    const allClients = [client1, client2, ...extraClients];
    const cardsRevealedPromise = waitForEvent<any[]>(client1, 'cardsRevealed');

    // 2. All vote at once
    allClients.forEach((c, i) => {
      c.emit('selectCard', i % 13);
    });

    const revealedPlayers = await cardsRevealedPromise;
    expect(revealedPlayers).toHaveLength(allClients.length);
    expect(revealedPlayers.every(p => p.selectedCard !== null)).toBe(true);

    // Cleanup
    extraClients.forEach(c => c.disconnect());
  });
});
