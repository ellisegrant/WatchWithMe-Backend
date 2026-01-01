class RoomManager {
  constructor() {
    this.rooms = {};
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(roomId, adminId, username) {
    this.rooms[roomId] = {
      id: roomId,
      admin: adminId,
      users: [{ 
        id: adminId, 
        username: username, 
        isAdmin: true 
      }],
      videoUrl: '',
      queue: [],
      currentVideoIndex: 0,
      playbackSpeed: 1,
      volume: 100,
      bookmarks: [],
      isLocked: false,
      mutedUsers: [],
      playbackControl: 'everyone'
    };
    return this.rooms[roomId];
  }

  getRoom(roomId) {
    return this.rooms[roomId];
  }

  deleteRoom(roomId) {
    delete this.rooms[roomId];
  }

  addUserToRoom(roomId, userId, username) {
    const room = this.rooms[roomId];
    if (!room) return null;

    const newUser = { 
      id: userId, 
      username: username, 
      isAdmin: false 
    };
    
    room.users.push(newUser);
    return newUser;
  }

  removeUserFromRoom(roomId, userId) {
    const room = this.rooms[roomId];
    if (!room) return null;

    const userIndex = room.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    const user = room.users[userIndex];
    room.users.splice(userIndex, 1);
    return user;
  }

  transferAdmin(roomId, newAdminId) {
    const room = this.rooms[roomId];
    if (!room) return false;

    const oldAdmin = room.users.find(u => u.isAdmin);
    const newAdmin = room.users.find(u => u.id === newAdminId);

    if (!newAdmin) return false;

    if (oldAdmin) oldAdmin.isAdmin = false;
    newAdmin.isAdmin = true;
    room.admin = newAdminId;
    return true;
  }

  getAllRooms() {
    return this.rooms;
  }
}

export default new RoomManager();