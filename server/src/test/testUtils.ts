import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServerApp } from '../index';
import { ServerToClientEvents, ClientToServerEvents } from '../types';
import { AddressInfo } from 'net';
import { SessionManager } from '../sessionManager';

export async function createTestServer(options?: { disconnectGraceMs?: number; voluntaryDisconnectGraceMs?: number }) {
  const { httpServer, io, roomManager, sessionManager } = await createServerApp(options);

  return new Promise<{
    httpServer: any;
    io: any;
    roomManager: any;
    sessionManager: SessionManager;
    port: number;
    close: () => Promise<void>;
  }>((resolve) => {
    httpServer.listen(0, () => {
      const port = (httpServer.address() as AddressInfo).port;
      const close = () => new Promise<void>((res) => {
        io.close();
        httpServer.close(() => res());
      });
      resolve({ httpServer, io, roomManager, sessionManager, port, close });
    });
  });
}

export interface TestClient extends ClientSocket<ServerToClientEvents, ClientToServerEvents> {
  sessionId: string;
}

export function createSocketClient(port: number): TestClient {
  const client = Client(`http://localhost:${port}`, {
    reconnectionDelay: 0,
    forceNew: true,
    transports: ['websocket'],
  }) as any;

  // Capture the session ID assigned by the server
  client.on('sessionCreated', ({ sessionId }: { sessionId: string }) => {
    client.sessionId = sessionId;
  });

  return client as TestClient;
}

/** Wait for socket to connect AND receive its session ID */
export function waitForReady(client: TestClient): Promise<void> {
  return new Promise<void>((resolve) => {
    let connected = false;
    let hasSession = false;

    const check = () => {
      if (connected && hasSession) resolve();
    };

    if (client.connected) {
      connected = true;
    } else {
      client.once('connect', () => { connected = true; check(); });
    }

    if (client.sessionId) {
      hasSession = true;
    } else {
      client.once('sessionCreated', () => { hasSession = true; check(); });
    }

    check();
  });
}

export function waitForEvent<T>(socket: ClientSocket<any, any>, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (data: T) => {
      resolve(data);
    });
  });
}
