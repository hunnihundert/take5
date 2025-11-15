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

export interface RoomState {
  roomCode: string;
  currentPlayer: Player | null;
  players: Player[];
  revealed: boolean;
}
