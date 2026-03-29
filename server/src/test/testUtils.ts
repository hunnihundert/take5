import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServerApp } from '../index';
import { ServerToClientEvents, ClientToServerEvents } from '../types';
import { AddressInfo } from 'net';

export async function createTestServer() {
  const { httpServer, io, roomManager } = await createServerApp();
  
  return new Promise<{
    httpServer: any;
    io: any;
    roomManager: any;
    port: number;
    close: () => Promise<void>;
  }>((resolve) => {
    httpServer.listen(0, () => {
      const port = (httpServer.address() as AddressInfo).port;
      const close = () => new Promise<void>((res) => {
        io.close();
        httpServer.close(() => res());
      });
      resolve({ httpServer, io, roomManager, port, close });
    });
  });
}

export function createSocketClient(port: number): ClientSocket<ServerToClientEvents, ClientToServerEvents> {
  return Client(`http://localhost:${port}`, {
    reconnectionDelay: 0,
    forceNew: true,
    transports: ['websocket'],
  }) as any;
}

export function waitForEvent<T>(socket: ClientSocket<any, any>, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (data: T) => {
      resolve(data);
    });
  });
}
