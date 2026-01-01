import roomManager from '../utils/roomManager.js';

export const handleCreateRoom = (socket, io) => {
  socket.on('create-room', ({ username }) => {
    const roomId = roomManager.generateRoomId();
    const room = roomManager.createRoom(roomId, socket.id, username);
    
    socket.join(roomId);
    console.log(`✅ Room ${roomId} created by ${username}`);
    
    socket.emit('room-created', room);
  });
};

export const handleJoinRoom = (socket, io) => {
  socket.on('join-room', ({ roomId, username }) => {
    console.log(`User ${username} trying to join room ${roomId}`);
    
    const room = roomManager.getRoom(roomId);
    
    if (!room) {
      console.log(`❌ Room ${roomId} not found!`);
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.isLocked) {
      console.log(`🔒 Room ${roomId} is locked`);
      socket.emit('error', 'Room is locked. No new members allowed.');
      return;
    }

    const newUser = roomManager.addUserToRoom(roomId, socket.id, username);
    socket.join(roomId);

    console.log(`✅ User ${username} joined room ${roomId}`);
    
    socket.emit('room-joined', room);
    socket.to(roomId).emit('user-joined', newUser);
    
    if (room.videoUrl) {
      socket.emit('video-url-changed', room.videoUrl);
    }
  });
};