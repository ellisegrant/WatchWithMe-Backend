import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// Store active rooms
const rooms = new Map();

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', (username) => {
    const roomId = generateRoomId();
    
    const room = {
      id: roomId,
      admin: socket.id,
      users: [{
        id: socket.id,
        username: username,
        isAdmin: true
      }]
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    
    socket.emit('room-created', { roomId, room });
    console.log(`Room ${roomId} created by ${username}`);
  });

  // Join existing room
  socket.on('join-room', ({ roomId, username }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const user = {
      id: socket.id,
      username: username,
      isAdmin: false
    };
    
    room.users.push(user);
    socket.join(roomId);
    socket.roomId = roomId;
    
    socket.emit('room-joined', { roomId, room });
    socket.to(roomId).emit('user-joined', user);
    
    console.log(`${username} joined room ${roomId}`);
  });

  // Video control events
  socket.on('video-url-change', ({ roomId, videoUrl }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.admin) {
      room.videoUrl = videoUrl;
      io.to(roomId).emit('video-url-changed', videoUrl);
      console.log(`Video URL changed in room ${roomId}: ${videoUrl}`);
    }
  });

  socket.on('play-video', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video-play', currentTime);
  });

  socket.on('pause-video', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video-pause', currentTime);
  });

  socket.on('seek-video', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video-seek', currentTime);
  });

  // Chat events - NEW CODE HERE
  socket.on('send-message', ({ roomId, message, username }) => {
    const timestamp = new Date().toISOString();
    const chatMessage = {
      id: Date.now(),
      username,
      message,
      timestamp,
      userId: socket.id
    };
    
    io.to(roomId).emit('new-message', chatMessage);
    console.log(`Message in room ${roomId} from ${username}: ${message}`);
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      const room = rooms.get(socket.roomId);
      if (room) {
        room.users = room.users.filter(u => u.id !== socket.id);
        
        if (room.users.length === 0) {
          rooms.delete(socket.roomId);
          console.log(`Room ${socket.roomId} deleted (empty)`);
        } else {
          io.to(socket.roomId).emit('user-left', socket.id);
        }
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});