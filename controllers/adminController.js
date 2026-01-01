import roomManager from '../utils/roomManager.js';

export const handleKickUser = (socket, io) => {
  socket.on('kick-user', ({ roomId, userId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can kick users');
      return;
    }

    const kickedUser = roomManager.removeUserFromRoom(roomId, userId);
    if (!kickedUser) return;

    console.log(`👢 Admin kicked ${kickedUser.username} from room ${roomId}`);

    io.to(userId).emit('kicked', { message: 'You have been removed from the room by the admin' });
    socket.to(roomId).emit('user-left', kickedUser);
    socket.emit('user-kicked', kickedUser);
  });
};

export const handleToggleMute = (socket, io) => {
  socket.on('toggle-mute-user', ({ roomId, userId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can mute users');
      return;
    }

    const isMuted = room.mutedUsers.includes(userId);
    
    if (isMuted) {
      room.mutedUsers = room.mutedUsers.filter(id => id !== userId);
      console.log(`🔊 Admin unmuted user ${userId} in room ${roomId}`);
    } else {
      room.mutedUsers.push(userId);
      console.log(`🔇 Admin muted user ${userId} in room ${roomId}`);
    }

    io.to(roomId).emit('room-updated', room);
  });
};

export const handleToggleLock = (socket, io) => {
  socket.on('toggle-lock-room', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can lock the room');
      return;
    }

    room.isLocked = !room.isLocked;
    console.log(`🔒 Room ${roomId} ${room.isLocked ? 'locked' : 'unlocked'}`);

    io.to(roomId).emit('room-updated', room);
  });
};

export const handleTransferAdmin = (socket, io) => {
  socket.on('transfer-admin', ({ roomId, newAdminId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can transfer admin rights');
      return;
    }

    const success = roomManager.transferAdmin(roomId, newAdminId);
    if (!success) {
      socket.emit('error', 'User not found');
      return;
    }

    const newAdmin = room.users.find(u => u.id === newAdminId);
    console.log(`👑 Admin transferred to ${newAdmin.username} in room ${roomId}`);

    io.to(roomId).emit('room-updated', room);
  });
};

export const handleTogglePlaybackControl = (socket, io) => {
  socket.on('toggle-playback-control', ({ roomId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    if (socket.id !== room.admin) {
      socket.emit('error', 'Only admin can change playback control');
      return;
    }

    room.playbackControl = room.playbackControl === 'everyone' ? 'admin-only' : 'everyone';
    console.log(` Playback control in room ${roomId}: ${room.playbackControl}`);

    io.to(roomId).emit('room-updated', room);
  });
};