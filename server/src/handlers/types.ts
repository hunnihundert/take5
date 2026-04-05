import { Server, Socket } from 'socket.io';
import { RoomManager } from '../roomManager';
import { SessionManager } from '../sessionManager';
import { ClientToServerEvents, ServerToClientEvents } from '../types';

export type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface SocketHandler {
    (io: IOServer, socket: AppSocket, roomManager: RoomManager, sessionManager: SessionManager): void;
}
