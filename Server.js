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
      videoUrl: '',
      isLocked: false,
      mutedUsers: [],
      playbackControl: 'everyone' // 'everyone' or 'admin-only'
    };
    
    rooms[roomId] = room;
    socket.join(roomId);
    
    console.log(`✅ Room ${roomId} created by ${username}`);
    
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

    // Check if room is locked
    if (room.isLocked) {
      console.log(`🔒 Room ${roomId} is locked`);
      socket.emit('error', 'Room is locked. No new members allowed.');
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
    
    // Send current video to the new joiner if one is loaded
    if (room.videoUrl) {
      socket.emit('video-url-changed', room.videoUrl);
    }
  });

  // ADMIN CONTROLS

  // Kick user
  socket.on('kick-user', ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is admin
    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can kick users');
      return;
    }

    // Find the user
    const userIndex = room.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const kickedUser = room.users[userIndex];
    room.users.splice(userIndex, 1);

    console.log(`👢 Admin kicked ${kickedUser.username} from room ${roomId}`);

    // Notify the kicked user
    io.to(userId).emit('kicked', { message: 'You have been removed from the room by the admin' });
    
    // Notify others
    socket.to(roomId).emit('user-left', kickedUser);
    socket.emit('user-kicked', kickedUser);
  });

  // Mute/unmute user
  socket.on('toggle-mute-user', ({ roomId, userId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is admin
    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can mute users');
      return;
    }

    const isMuted = room.mutedUsers.includes(userId);
    
    if (isMuted) {
      // Unmute
      room.mutedUsers = room.mutedUsers.filter(id => id !== userId);
      console.log(`🔊 Admin unmuted user ${userId} in room ${roomId}`);
    } else {
      // Mute
      room.mutedUsers.push(userId);
      console.log(`🔇 Admin muted user ${userId} in room ${roomId}`);
    }

    // Notify everyone about the update
    io.to(roomId).emit('room-updated', room);
  });

  // Lock/unlock room
  socket.on('toggle-lock-room', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is admin
    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can lock the room');
      return;
    }

    room.isLocked = !room.isLocked;
    console.log(`🔒 Room ${roomId} ${room.isLocked ? 'locked' : 'unlocked'}`);

    // Notify everyone
    io.to(roomId).emit('room-updated', room);
  });

  // Transfer admin
  socket.on('transfer-admin', ({ roomId, newAdminId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is admin
    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can transfer admin rights');
      return;
    }

    // Find both users
    const oldAdmin = room.users.find(u => u.id === socket.id);
    const newAdmin = room.users.find(u => u.id === newAdminId);

    if (!newAdmin) {
      socket.emit('error', 'User not found');
      return;
    }

    // Update admin status
    if (oldAdmin) oldAdmin.isAdmin = false;
    newAdmin.isAdmin = true;
    room.admin = newAdminId;

    console.log(`👑 Admin transferred from ${oldAdmin?.username} to ${newAdmin.username} in room ${roomId}`);

    // Notify everyone
    io.to(roomId).emit('room-updated', room);
  });

  // Toggle playback control
  socket.on('toggle-playback-control', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if requester is admin
    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can change playback control');
      return;
    }

    room.playbackControl = room.playbackControl === 'everyone' ? 'admin-only' : 'everyone';
    console.log(`🎮 Playback control in room ${roomId}: ${room.playbackControl}`);

    // Notify everyone
    io.to(roomId).emit('room-updated', room);
  });

  // VIDEO CONTROLS

  socket.on('video-url-change', ({ roomId, videoUrl }) => {
    const room = rooms[roomId];
    if (room) {
      room.videoUrl = videoUrl;
      console.log(`📹 Video changed in room ${roomId}: ${videoUrl}`);
    }
    io.to(roomId).emit('video-url-changed', videoUrl);
  });

  socket.on('play-video', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check playback permissions
    if (room.playbackControl === 'admin-only' && socket.id !== room.admin) {
      socket.emit('error', 'Only admin can control playback');
      return;
    }

    socket.to(roomId).emit('video-play', currentTime);
  });

  socket.on('pause-video', ({ roomId, currentTime }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check playback permissions
    if (room.playbackControl === 'admin-only' && socket.id !== room.admin) {
      socket.emit('error', 'Only admin can control playback');
      return;
    }

    socket.to(roomId).emit('video-pause', currentTime);
  });

  // CHAT

  socket.on('send-message', ({ roomId, message, username }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Check if user is muted
    if (room.mutedUsers.includes(socket.id)) {
      socket.emit('error', 'You have been muted by the admin');
      return;
    }

    const messageData = {
      id: Date.now() + Math.random(),
      username,
      message,
      timestamp: new Date().toISOString()
    };
    io.to(roomId).emit('new-message', messageData);
  });

  // DISCONNECT

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const userIndex = room.users.findIndex(u => u.id === socket.id);
      
      if (userIndex !== -1) {
        const user = room.users[userIndex];
        room.users.splice(userIndex, 1);
        
        socket.to(roomId).emit('user-left', user);
        
        // If admin left, transfer to first user or delete room
        if (socket.id === room.admin) {
          if (room.users.length > 0) {
            room.admin = room.users[0].id;
            room.users[0].isAdmin = true;
            io.to(roomId).emit('room-updated', room);
            console.log(`👑 Admin left. Transferred to ${room.users[0].username}`);
          } else {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted`);
          }
        } else if (room.users.length === 0) {
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