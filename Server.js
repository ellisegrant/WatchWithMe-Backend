import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const rooms = {};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ username }) => {
    const roomId = generateRoomId();
    
    const room = {
      id: roomId,
      admin: socket.id,
      users: [{ 
        id: socket.id, 
        username: username, 
        isAdmin: true 
      }],
      videoUrl: ''
    };
    
    rooms[roomId] = room;
    socket.join(roomId);
    
    console.log(`✅ Room ${roomId} created by ${username}`);
    console.log('Room data:', room);
    
    socket.emit('room-created', room);
  });

  socket.on('join-room', ({ roomId, username }) => {
    console.log(`User ${username} trying to join room ${roomId}`);
    
    const room = rooms[roomId];
    
    if (!room) {
      console.log(`❌ Room ${roomId} not found!`);
      socket.emit('error', 'Room not found');
      return;
    }

    const newUser = { 
      id: socket.id, 
      username: username, 
      isAdmin: false 
    };
    
    room.users.push(newUser);
    socket.join(roomId);

    console.log(`✅ User ${username} joined room ${roomId}`);
    
    socket.emit('room-joined', room);
    socket.to(roomId).emit('user-joined', newUser);
  });

  socket.on('video-url-change', ({ roomId, videoUrl }) => {
    io.to(roomId).emit('video-url-changed', videoUrl);
  });

  socket.on('play-video', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video-play', currentTime);
  });

  socket.on('pause-video', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video-pause', currentTime);
  });

  socket.on('send-message', ({ roomId, message, username }) => {
    const messageData = {
      id: Date.now() + Math.random(),
      username,
      message,
      timestamp: new Date().toISOString()
    };
    io.to(roomId).emit('new-message', messageData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      
      if (userIndex !== -1) {
        const user = room.users[userIndex];
        room.users.splice(userIndex, 1);
        
        socket.to(roomId).emit('user-left', user);
        
        if (room.users.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted`);
        }
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});