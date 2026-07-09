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
    // auth is a callback so it is re-evaluated on every (re)connect attempt:
    // the handshake always carries the latest stored session ID and the room
    // code this tab is currently looking at. The server only auto-rejoins the
    // room named here, which lets different tabs sit in different rooms.
    const socketInstance = io(BACKEND_URL, {
      auth: (cb) => {
        cb({
          sessionId: localStorage.getItem('take5_sessionId') || undefined,
          roomCode: new URLSearchParams(window.location.search).get('room') || undefined,
        });
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
      // The auth callback reads localStorage on each connect, so storing the
      // ID here is enough for future reconnects.
      localStorage.setItem('take5_sessionId', newId);
      setSessionId(newId);
      console.log('Session created:', newId);
    });

    // Emit leaveRoom on page unload so the server starts the short voluntary
    // grace period instead of the longer involuntary one.
    // Both beforeunload and pagehide are listened to for broader browser
    // coverage (pagehide is more reliable on iOS Safari). A flag prevents
    // the event from being emitted twice for the same navigation.
    let leaveEmitted = false;
    const emitLeaveRoom = () => {
      if (leaveEmitted) return;
      leaveEmitted = true;
      socketInstance.emit('leaveRoom');
    };
    window.addEventListener('beforeunload', emitLeaveRoom);
    window.addEventListener('pagehide', emitLeaveRoom);

    setSocket(socketInstance);

    return () => {
      window.removeEventListener('beforeunload', emitLeaveRoom);
      window.removeEventListener('pagehide', emitLeaveRoom);
      socketInstance.close();
    };
  }, []);

  return { socket, connected, sessionId };
};
