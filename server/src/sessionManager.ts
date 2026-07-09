import { randomUUID } from 'crypto';
import { logger } from './utils/logger';

export interface RoomMembership {
  playerName: string;
  avatarUrl: string | null;
  isModerator: boolean;
  isObserver: boolean;
}

export interface SessionInfo {
  sessionId: string;
  // A session (browser identity) can sit in several rooms at once — one per tab.
  // Keyed by normalized room code.
  rooms: Map<string, RoomMembership>;
}

export const DEFAULT_DISCONNECT_GRACE_MS = 60_000;
export const DEFAULT_VOLUNTARY_DISCONNECT_GRACE_MS = 8_000;

export class SessionManager {
  private sessions = new Map<string, SessionInfo>();
  private sessionToSockets = new Map<string, Set<string>>();
  private socketToSession = new Map<string, string>();
  // Each socket (tab) is bound to at most one room; the session aggregates
  // those bindings, so two tabs of the same session can sit in two rooms.
  private socketToRoom = new Map<string, string>();
  // Keyed by `${sessionId}:${roomCode}` — grace periods run per room
  // membership, so losing the last tab of one room never affects another.
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  private voluntaryLeaveSockets = new Set<string>();
  readonly disconnectGraceMs: number;
  readonly voluntaryDisconnectGraceMs: number;

  constructor(
    disconnectGraceMs: number = DEFAULT_DISCONNECT_GRACE_MS,
    voluntaryDisconnectGraceMs: number = DEFAULT_VOLUNTARY_DISCONNECT_GRACE_MS
  ) {
    this.disconnectGraceMs = disconnectGraceMs;
    this.voluntaryDisconnectGraceMs = voluntaryDisconnectGraceMs;
  }

  private timerKey(sessionId: string, roomCode: string): string {
    return `${sessionId}:${roomCode}`;
  }

  generateSessionId(): string {
    return randomUUID();
  }

  createSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        rooms: new Map(),
      });
      this.sessionToSockets.set(sessionId, new Set());
      logger.info(`Session created: ${sessionId}`);
    }
  }

  destroySession(sessionId: string): void {
    this.cancelAllDisconnectTimers(sessionId);
    const sockets = this.sessionToSockets.get(sessionId);
    if (sockets) {
      for (const socketId of sockets) {
        this.socketToSession.delete(socketId);
        this.socketToRoom.delete(socketId);
      }
    }
    this.sessionToSockets.delete(sessionId);
    this.sessions.delete(sessionId);
    logger.info(`Session destroyed: ${sessionId}`);
  }

  // A session is idle when nothing references it anymore: no connected
  // sockets and no room memberships (including ones in a grace period).
  destroySessionIfIdle(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const sockets = this.sessionToSockets.get(sessionId);
    if ((sockets?.size ?? 0) === 0 && session.rooms.size === 0) {
      this.destroySession(sessionId);
    }
  }

  isKnownSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  sessionCount(): number {
    return this.sessions.size;
  }

  registerSocket(sessionId: string, socketId: string): void {
    this.socketToSession.set(socketId, sessionId);
    let sockets = this.sessionToSockets.get(sessionId);
    if (!sockets) {
      sockets = new Set();
      this.sessionToSockets.set(sessionId, sockets);
    }
    sockets.add(socketId);
    logger.info(`Socket ${socketId} registered to session ${sessionId} (${sockets.size} socket(s))`);
  }

  unregisterSocket(socketId: string): {
    sessionId: string | undefined;
    roomCode: string | undefined;
    isLastSocket: boolean;
    isLastSocketForRoom: boolean;
    wasVoluntary: boolean;
  } {
    const wasVoluntary = this.voluntaryLeaveSockets.has(socketId);
    this.voluntaryLeaveSockets.delete(socketId);

    const roomCode = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);

    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) {
      return { sessionId: undefined, roomCode, isLastSocket: false, isLastSocketForRoom: false, wasVoluntary };
    }

    this.socketToSession.delete(socketId);
    const sockets = this.sessionToSockets.get(sessionId);
    sockets?.delete(socketId);
    const isLastSocket = (sockets?.size ?? 0) === 0;
    const isLastSocketForRoom =
      roomCode !== undefined && this.getSocketIdsInRoom(sessionId, roomCode).size === 0;

    logger.info(`Socket ${socketId} unregistered from session ${sessionId} (${sockets?.size ?? 0} socket(s) remaining)`);
    return { sessionId, roomCode, isLastSocket, isLastSocketForRoom, wasVoluntary };
  }

  getSessionId(socketId: string): string | undefined {
    return this.socketToSession.get(socketId);
  }

  getSocketIds(sessionId: string): Set<string> {
    return this.sessionToSockets.get(sessionId) ?? new Set();
  }

  bindSocketToRoom(socketId: string, roomCode: string): void {
    this.socketToRoom.set(socketId, roomCode);
  }

  getRoomCodeForSocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  // Sockets of this session currently bound to the given room (i.e. open tabs
  // showing that room).
  getSocketIdsInRoom(sessionId: string, roomCode: string): Set<string> {
    const result = new Set<string>();
    for (const socketId of this.getSocketIds(sessionId)) {
      if (this.socketToRoom.get(socketId) === roomCode) {
        result.add(socketId);
      }
    }
    return result;
  }

  setSessionRoom(
    sessionId: string,
    roomCode: string,
    playerInfo: { playerName: string; avatarUrl?: string | null; isModerator?: boolean; isObserver?: boolean }
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.rooms.set(roomCode, {
        playerName: playerInfo.playerName,
        avatarUrl: playerInfo.avatarUrl ?? null,
        isModerator: playerInfo.isModerator ?? false,
        isObserver: playerInfo.isObserver ?? false,
      });
    }
  }

  clearSessionRoom(sessionId: string, roomCode: string): void {
    this.sessions.get(sessionId)?.rooms.delete(roomCode);
  }

  isSessionInRoom(sessionId: string, roomCode: string): boolean {
    return this.sessions.get(sessionId)?.rooms.has(roomCode) ?? false;
  }

  getSessionInfo(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  startDisconnectTimer(sessionId: string, roomCode: string, callback: () => void, delayMs: number): void {
    this.cancelDisconnectTimer(sessionId, roomCode);
    const key = this.timerKey(sessionId, roomCode);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(key);
      callback();
    }, delayMs);
    this.disconnectTimers.set(key, timer);
    logger.info(`Disconnect timer started for session ${sessionId} in room ${roomCode} (${delayMs}ms)`);
  }

  cancelDisconnectTimer(sessionId: string, roomCode: string): boolean {
    const key = this.timerKey(sessionId, roomCode);
    const timer = this.disconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(key);
      logger.info(`Disconnect timer cancelled for session ${sessionId} in room ${roomCode}`);
      return true;
    }
    return false;
  }

  private cancelAllDisconnectTimers(sessionId: string): void {
    const prefix = `${sessionId}:`;
    for (const [key, timer] of this.disconnectTimers) {
      if (key.startsWith(prefix)) {
        clearTimeout(timer);
        this.disconnectTimers.delete(key);
      }
    }
  }

  hasActiveTimer(sessionId: string, roomCode: string): boolean {
    return this.disconnectTimers.has(this.timerKey(sessionId, roomCode));
  }

  markSocketVoluntaryLeave(socketId: string): void {
    this.voluntaryLeaveSockets.add(socketId);
  }
}
