import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import cors from 'cors';
import { config } from 'dotenv';

config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

app.use(cors({
  origin: "*"
}));
app.use(express.json());

interface User {
  socketId: string;
  isSearching: boolean;
  roomId?: string;
}

const connectedUsers = new Map<string, User>();

io.on('connection', (socket) => {
  console.log(`Nuovo utente connesso: ${socket.id}`);

  connectedUsers.set(socket.id, {
    socketId: socket.id,
    isSearching: false
  });

  socket.on('start_search', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    user.isSearching = true;

    await findMatch(socket);
  });

  socket.on('leave_chat', async () => {
    const user = connectedUsers.get(socket.id);
    if (!user || !user.roomId) return;

    await leaveRoom(socket, user.roomId);
  });

  socket.on('send_message', async (message: string) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !user.roomId) return;

    io.to(user.roomId).emit('receive_message', {
      senderId: socket.id,
      message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.roomId) {
      await leaveRoom(socket, user.roomId);
    }
    connectedUsers.delete(socket.id);
    console.log(`Utente disconnesso: ${socket.id}`);
  });
});

async function findMatch(socket: any) {
  const searchingUsers = Array.from(connectedUsers.values())
    .filter(user => 
      user.isSearching && 
      user.socketId !== socket.id && 
      !user.roomId
    );

  if (searchingUsers.length > 0) {
    const partner = searchingUsers[0];
    const roomId = `room_${Date.now()}`;

    const currentUser = connectedUsers.get(socket.id);
    if (currentUser && partner) {
      currentUser.isSearching = false;
      currentUser.roomId = roomId;
      partner.isSearching = false;
      partner.roomId = roomId;

      socket.join(roomId);
      io.sockets.sockets.get(partner.socketId)?.join(roomId);

      io.to(roomId).emit('chat_started', { roomId });
    }
  }
}

async function leaveRoom(socket: any, roomId: string) {
  socket.leave(roomId);
  const user = connectedUsers.get(socket.id);
  if (user) {
    user.roomId = undefined;
    user.isSearching = false;
  }

  socket.to(roomId).emit('partner_left');

  const partner = Array.from(connectedUsers.values())
    .find(u => u.roomId === roomId && u.socketId !== socket.id);
  
  if (partner) {
    partner.roomId = undefined;
    partner.isSearching = false;
  }
}


const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server in esecuzione sulla porta ${PORT}`);
});