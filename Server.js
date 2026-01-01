import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomManager from './utils/roomManager.js';

// Controllers
import { handleCreateRoom, handleJoinRoom } from './controllers/roomController.js';
import { 
  handleKickUser, 
  handleToggleMute, 
  handleToggleLock, 
  handleTransferAdmin,
  handleTogglePlaybackControl 
} from './controllers/adminController.js';
import { 
  handleVideoUrlChange, 
  handlePlayVideo, 
  handlePauseVideo,
  handleAddToQueue,
  handleRemoveFromQueue,
  handlePlayNext,
  handleChangePlaybackSpeed,
  handleChangeVolume,
  handleAddBookmark,
  handleRemoveBookmark,
  handleJumpToBookmark
} from './controllers/videoController.js';
import { 
  handleSendMessage, 
  handleTyping, 
  handleReaction 
} from './controllers/chatController.js';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Room handlers
  handleCreateRoom(socket, io);
  handleJoinRoom(socket, io);

  // Admin handlers
  handleKickUser(socket, io);
  handleToggleMute(socket, io);
  handleToggleLock(socket, io);
  handleTransferAdmin(socket, io);
  handleTogglePlaybackControl(socket, io);

  // Video handlers
  handleVideoUrlChange(socket, io);
  handlePlayVideo(socket, io);
  handlePauseVideo(socket, io);
  handleAddToQueue(socket, io);
  handleRemoveFromQueue(socket, io);
  handlePlayNext(socket, io);
  handleChangePlaybackSpeed(socket, io);
  handleChangeVolume(socket, io);
  handleAddBookmark(socket, io);
  handleRemoveBookmark(socket, io);
  handleJumpToBookmark(socket, io);

  // Chat handlers
  handleSendMessage(socket, io);
  handleTyping(socket, io);
  handleReaction(socket, io);

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    const rooms = roomManager.getAllRooms();
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const user = roomManager.removeUserFromRoom(roomId, socket.id);
      
      if (user) {
        socket.to(roomId).emit('user-left', user);
        
        // Auto-transfer admin or delete room
        if (socket.id === room.admin) {
          if (room.users.length > 0) {
            roomManager.transferAdmin(roomId, room.users[0].id);
            io.to(roomId).emit('room-updated', room);
            console.log(`👑 Admin left. Transferred to ${room.users[0].username}`);
          } else {
            roomManager.deleteRoom(roomId);
            console.log(`Room ${roomId} deleted`);
          }
        } else if (room.users.length === 0) {
          roomManager.deleteRoom(roomId);
          console.log(`Room ${roomId} deleted`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});