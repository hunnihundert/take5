import { randomUUID } from 'crypto';
import { logger } from './utils/logger';

export interface SessionInfo {
  sessionId: string;
  roomCode: string | null;
  playerName: string;
  avatarUrl: string | null;
  isModerator: boolean;
  isObserver: boolean;
}

export const DEFAULT_DISCONNECT_GRACE_MS = 60_000;

export class SessionManager {
  private sessions = new Map<string, SessionInfo>();
  private sessionToSockets = new Map<string, Set<string>>();
  private socketToSession = new Map<string, string>();
  private disconnectTimers = new Map<string, NodeJS.Timeout>();
  readonly disconnectGraceMs: number;

  constructor(disconnectGraceMs: number = DEFAULT_DISCONNECT_GRACE_MS) {
    this.disconnectGraceMs = disconnectGraceMs;
  }

  generateSessionId(): string {
    return randomUUID();
  }

  createSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        roomCode: null,
        playerName: '',
        avatarUrl: null,
        isModerator: false,
        isObserver: false,
      });
      this.sessionToSockets.set(sessionId, new Set());
      logger.info(`Session created: ${sessionId}`);
    }
  }

  destroySession(sessionId: string): void {
    this.cancelDisconnectTimer(sessionId);
    const sockets = this.sessionToSockets.get(sessionId);
    if (sockets) {
      for (const socketId of sockets) {
        this.socketToSession.delete(socketId);
      }
    }
    this.sessionToSockets.delete(sessionId);
    this.sessions.delete(sessionId);
    logger.info(`Session destroyed: ${sessionId}`);
  }

  isKnownSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
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

  unregisterSocket(socketId: string): { sessionId: string | undefined; isLastSocket: boolean } {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) {
      return { sessionId: undefined, isLastSocket: false };
    }

    this.socketToSession.delete(socketId);
    const sockets = this.sessionToSockets.get(sessionId);
    if (sockets) {
      sockets.delete(socketId);
      const isLastSocket = sockets.size === 0;
      logger.info(`Socket ${socketId} unregistered from session ${sessionId} (${sockets.size} socket(s) remaining)`);
      return { sessionId, isLastSocket };
    }

    return { sessionId, isLastSocket: true };
  }

  getSessionId(socketId: string): string | undefined {
    return this.socketToSession.get(socketId);
  }

  getSocketIds(sessionId: string): Set<string> {
    return this.sessionToSockets.get(sessionId) ?? new Set();
  }

  getRoomCodeForSocket(socketId: string): string | undefined {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId)?.roomCode ?? undefined;
  }

  setSessionRoom(
    sessionId: string,
    roomCode: string,
    playerInfo: { playerName: string; avatarUrl?: string | null; isModerator?: boolean; isObserver?: boolean }
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.roomCode = roomCode;
      session.playerName = playerInfo.playerName;
      session.avatarUrl = playerInfo.avatarUrl ?? null;
      session.isModerator = playerInfo.isModerator ?? false;
      session.isObserver = playerInfo.isObserver ?? false;
    }
  }

  clearSessionRoom(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.roomCode = null;
    }
  }

  getSessionInfo(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  startDisconnectTimer(sessionId: string, callback: () => void, delayMs: number): void {
    this.cancelDisconnectTimer(sessionId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(sessionId);
      callback();
    }, delayMs);
    this.disconnectTimers.set(sessionId, timer);
    logger.info(`Disconnect timer started for session ${sessionId} (${delayMs}ms)`);
  }

  cancelDisconnectTimer(sessionId: string): boolean {
    const timer = this.disconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(sessionId);
      logger.info(`Disconnect timer cancelled for session ${sessionId}`);
      return true;
    }
    return false;
  }

  hasActiveTimer(sessionId: string): boolean {
    return this.disconnectTimers.has(sessionId);
  }
}
