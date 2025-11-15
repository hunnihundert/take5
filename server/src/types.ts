export type CardValue = '1' | '2' | '3' | '5' | '8' | '13';

export interface Player {
  id: string;
  name: string;
  selectedCard: CardValue | null;
  hasVoted: boolean;
  isModerator: boolean;
  isObserver: boolean;
  avatarUrl: string | null;
}

export interface Room {
  code: string;
  players: Map<string, Player>;
  revealed: boolean;
  createdAt: Date;
}

export interface ServerToClientEvents {
  roomJoined: (data: { roomCode: string; player: Player; players: Player[] }) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  cardSelected: (data: { playerId: string; hasVoted: boolean }) => void;
  cardsRevealed: (players: Player[]) => void;
  newRound: () => void;
  observerToggled: (data: { playerId: string; isObserver: boolean }) => void;
  avatarUpdated: (data: { playerId: string; avatarUrl: string | null }) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, callback: (response: { success: boolean; roomCode?: string; error?: string }) => void) => void;
  joinRoom: (data: { roomCode: string; playerName: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  selectCard: (cardValue: CardValue) => void;
  revealCards: () => void;
  startNewRound: () => void;
  toggleObserver: () => void;
  updateAvatar: (avatarUrl: string | null) => void;
}
