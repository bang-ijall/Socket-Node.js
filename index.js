const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const userStatus = {};

io.on('connection', (socket) => {
  console.log("User connected:", socket.id);

  socket.on('register', (userId) => {
    userStatus[userId] = {
      status: 'Online',
      socketId: socket.id,
      lastSeen: Date.now()
    };
    updateSharedHosting(userId, 'Offline');
  });

  socket.on('heartbeat', (userId) => {
    if (userStatus[userId]) {
      userStatus[userId].lastSeen = Date.now();
      if (userStatus[userId].status !== 'online') {
        userStatus[userId].status = 'online';
        updateSharedHosting(userId, 'online');
      }
    }
  });

  socket.on('disconnect', () => {
    const userId = Object.keys(userStatus).find(id => userStatus[id].socketId === socket.id);
    if (userId) {
      userStatus[userId].status = 'offline';
      userStatus[userId].lastSeen = Date.now();
      updateSharedHosting(userId, 'offline');
    }
  });
});

function updateSharedHosting(userId, status) {
  const lastSeen = new Date().toISOString();
  axios.post('https://jall.my.id/api/user/update', {
    user_id: userId,
    status: status,
    last_seen: lastSeen
  }).then(() => {
    console.log(`Updated shared hosting: ${userId} => ${status}`);
  }).catch(err => {
    console.error('Update shared hosting failed:', err.message);
  });
}

// Cek timeout heartbeat
setInterval(() => {
  const now = Date.now();
  for (const userId in userStatus) {
    const user = userStatus[userId];
    if (user.status === 'Online' && now - user.lastSeen > 90000) {
      user.status = 'Offline';
      updateSharedHosting(userId, 'Offline');
    }
  }
}, 60000);

app.get('/', (req, res) => {
  res.send('Socket.IO server is running.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});