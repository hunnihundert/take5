import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestServer, createSocketClient, waitForEvent, waitForReady, TestClient } from '../test/testUtils';

describe('Game Handler Integration', () => {
  let server: any;
  let testIndex = 0;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  let client1: TestClient;
  let client2: TestClient;
  let roomCode: string;

  beforeEach(async () => {
    testIndex++;
    roomCode = `GAME${testIndex}`;

    client1 = createSocketClient(server.port);
    client2 = createSocketClient(server.port);

    await Promise.all([waitForReady(client1), waitForReady(client2)]);

    // Client 1 creates room
    await new Promise<void>((resolve) => {
      client1.emit('createRoom', 'Moderator', roomCode, () => resolve());
    });

    // Client 2 joins room
    await new Promise<void>((resolve) => {
      client2.emit('joinRoom', { roomCode, playerName: 'Player 2' }, () => resolve());
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
    expect(data.playerId).toBe(client1.sessionId);
    expect(data.hasVoted).toBe(true);
  });

  it('should auto-reveal when all players have voted', async () => {
    const cardsRevealedPromise = waitForEvent<any[]>(client1, 'cardsRevealed');

    client1.emit('selectCard', 3);
    client2.emit('selectCard', 5);

    const players = await cardsRevealedPromise;
    expect(players).toHaveLength(2);
    expect(players.find(p => p.id === client1.sessionId).selectedCard).toBe('3');
    expect(players.find(p => p.id === client2.sessionId).selectedCard).toBe('5');
  });

  it('should not allow non-moderators to manually reveal cards', async () => {
    // client2 is not moderator
    client2.emit('revealCards');

    await new Promise(resolve => setTimeout(resolve, 100));
    const room = server.roomManager.getRoom(roomCode);
    expect(room.revealed).toBe(false);
  });

  it('should allow moderator to manually reveal cards', async () => {
    const cardsRevealedPromise = waitForEvent<any[]>(client2, 'cardsRevealed');

    client1.emit('revealCards');

    const players = await cardsRevealedPromise;
    expect(players).toBeDefined();
    const room = server.roomManager.getRoom(roomCode);
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

    const room = server.roomManager.getRoom(roomCode);
    expect(room.revealed).toBe(false);
    expect(Array.from(room.players.values()).every(p => p.selectedCard === null)).toBe(true);
  });

  it('should toggle observer mode and exclude from auto-reveal', async () => {
    // 1. Client 2 becomes observer
    const observerToggledPromise = waitForEvent<any>(client1, 'observerToggled');
    client2.emit('toggleObserver');
    const toggleData = await observerToggledPromise;
    expect(toggleData.playerId).toBe(client2.sessionId);
    expect(toggleData.isObserver).toBe(true);

    // 2. Client 1 votes, should auto-reveal immediately because client 2 is observer
    const cardsRevealedPromise = waitForEvent<any[]>(client2, 'cardsRevealed');
    client1.emit('selectCard', 8);

    const players = await cardsRevealedPromise;
    expect(players).toBeDefined();
    expect(players.find(p => p.id === client1.sessionId).selectedCard).toBe('8');
  });

  describe('throwEmoji validation', () => {
    it('should silently ignore throwEmoji when emoji is not a string', async () => {
      const noEvent = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 150));
      const emojiThrown = new Promise<'event'>((resolve) => {
        client2.once('emojiThrown', () => resolve('event'));
      });

      (client1 as any).emit('throwEmoji', { toPlayerId: client2.sessionId, emoji: 12345 });
      expect(await Promise.race([emojiThrown, noEvent])).toBe('timeout');
    });

    it('should emit error when emoji exceeds max length', async () => {
      const errorPromise = waitForEvent<any>(client1, 'error');
      (client1 as any).emit('throwEmoji', { toPlayerId: client2.sessionId, emoji: '😀'.repeat(11) });
      const err = await errorPromise;
      expect(typeof err === 'string' ? err : err?.message ?? err).toMatch(/emoji/i);
    });
  });

  it('should handle multiple players voting simultaneously', async () => {
    // 1. Create 5 more clients
    const extraClients = await Promise.all(
      Array.from({ length: 5 }).map(async (_, i) => {
        const c = createSocketClient(server.port);
        await waitForReady(c);
        await new Promise<void>(res => c.emit('joinRoom', { roomCode, playerName: `Extra ${i}` }, res));
        return c;
      })
    );

    const allClients = [client1, client2, ...extraClients];
    const cardsRevealedPromise = waitForEvent<any[]>(client1, 'cardsRevealed');

    // 2. All vote at once with valid deck values
    const deckValues = ['1', '2', '3', '5', '8', '13', '21'];
    allClients.forEach((c, i) => {
      c.emit('selectCard', deckValues[i % deckValues.length]);
    });

    const revealedPlayers = await cardsRevealedPromise;
    expect(revealedPlayers).toHaveLength(allClients.length);
    expect(revealedPlayers.every(p => p.selectedCard !== null)).toBe(true);

    // Cleanup
    extraClients.forEach(c => c.disconnect());
  });
});
