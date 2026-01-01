import roomManager from '../utils/roomManager.js';

export const handleSendMessage = (socket, io) => {
  socket.on('send-message', ({ roomId, message, username }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

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
};

export const handleTyping = (socket, io) => {
  socket.on('typing-start', ({ roomId, username }) => {
    socket.to(roomId).emit('user-typing', { username });
  });

  socket.on('typing-stop', ({ roomId, username }) => {
    socket.to(roomId).emit('user-stopped-typing', { username });
  });
};

export const handleReaction = (socket, io) => {
  socket.on('send-reaction', ({ roomId, reaction, username }) => {
    const reactionData = {
      id: Date.now() + Math.random(),
      username,
      reaction,
      timestamp: new Date().toISOString()
    };
    io.to(roomId).emit('new-reaction', reactionData);
  });
};