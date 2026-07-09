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

    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from server');
      setConnected(false);

      // The server force-disconnects this socket in the leaveRoom flow, and
      // socket.io does not auto-reconnect after a server-initiated disconnect.
      // If the page is really going away that is moot — but when the unload
      // was cancelled (download click, aborted navigation) or the page sits in
      // the back/forward cache, the tab is still alive. Reconnect after a
      // short delay: a dying page never fires the timer, a frozen page fires
      // it on restore, and a surviving page is re-seated seamlessly (the auth
      // callback re-sends the session ID and this tab's room).
      if (reason === 'io server disconnect') {
        reconnectTimer = setTimeout(() => {
          leaveEmitted = false; // page is still alive — a future unload must announce itself again
          socketInstance.connect();
        }, 250);
      }
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
      clearTimeout(reconnectTimer); // don't resurrect a socket we're closing
      socketInstance.close();
    };
  }, []);

  return { socket, connected, sessionId };
};
