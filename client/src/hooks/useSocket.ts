import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Use environment variable or default to current origin in production
export const BACKEND_URL = import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem('take5_sessionId')
  );

  useEffect(() => {
    const storedSessionId = localStorage.getItem('take5_sessionId');

    const socketInstance = io(BACKEND_URL, {
      auth: {
        sessionId: storedSessionId || undefined,
      },
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    socketInstance.on('sessionCreated', ({ sessionId: newId }: { sessionId: string }) => {
      localStorage.setItem('take5_sessionId', newId);
      setSessionId(newId);
      console.log('Session created:', newId);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return { socket, connected, sessionId };
};
