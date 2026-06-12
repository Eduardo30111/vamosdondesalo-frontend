import { io, Socket } from 'socket.io-client';

const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
const WS_URL = isCapacitor
  ? 'https://salo-api.onrender.com'
  : (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function joinRoom(room: string) {
  const s = getSocket();
  s.emit('join_room', room);
}
