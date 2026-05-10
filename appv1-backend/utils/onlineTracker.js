const onlineUsers = new Map(); // userId → socketId

module.exports = {
  onlineUsers,
  isUserOnline: (userId) => onlineUsers.has(String(userId)),
  setOnline: (userId, socketId) => onlineUsers.set(String(userId), socketId),
  setOffline: (userId) => onlineUsers.delete(String(userId)),
  getOnlineCount: () => onlineUsers.size,
  getOnlineUserIds: () => Array.from(onlineUsers.keys())
};
