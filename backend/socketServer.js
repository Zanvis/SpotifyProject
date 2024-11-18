const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Store room states
const rooms = new Map();

function setupSocketServer(server) {
    const io = socketIo(server, {
        cors: {
            origin: ["http://localhost:4200", "https://soundsphere-project.vercel.app"],
            methods: ["GET", "POST"],
            credentials: true
        },
        // Ping timeout and interval for better connection management
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
        let currentRoom = null;

        // Create a new room
        socket.on('create-room', (callback) => {
            try {
                const roomId = uuidv4();
                rooms.set(roomId, {
                    users: new Map(),
                    musicState: {
                        isPlaying: false,
                        currentTime: 0,
                        timestamp: Date.now(),
                        currentSong: null
                    },
                    messages: []
                });
                
                callback({ roomId, success: true });
            } catch (error) {
                console.error('Error creating room:', error);
                callback({ error: 'Failed to create room', success: false });
            }
        });

        socket.on('join-room', (roomId, username, callback) => {
            try {
                const room = rooms.get(roomId);
                
                if (!room) {
                    callback({ error: 'Room not found', success: false });
                    return;
                }

                // Leave current room if in one
                if (currentRoom) {
                    leaveRoom(socket, currentRoom);
                }

                // Join new room with user info
                currentRoom = roomId;
                socket.join(roomId);
                
                // Store user object in the room's users Map
                const userInfo = { id: socket.id, username: username || `User-${socket.id.slice(0, 4)}` };
                room.users.set(socket.id, userInfo);

                // Send current state to new user
                callback({
                    success: true,
                    state: room.musicState,
                    messages: room.messages,
                    userCount: room.users.size,
                    users: Array.from(room.users.values())
                });

                // Notify others in room
                socket.to(roomId).emit('user-joined', { 
                    userCount: room.users.size,
                    users: Array.from(room.users.values())
                });
            } catch (error) {
                console.error('Error joining room:', error);
                callback({ error: 'Failed to join room', success: false });
            }
        });

        // Handle music state updates
        socket.on('sync-music-state', (state) => {
            try {
                if (currentRoom && rooms.has(currentRoom)) {
                    const room = rooms.get(currentRoom);
                    room.musicState = {
                        ...state,
                        timestamp: Date.now()
                    };
                    // Broadcast to all clients in the room except the sender
                    socket.to(currentRoom).emit('sync-music-state', room.musicState);
                }
            } catch (error) {
                console.error('Error syncing music state:', error);
                socket.emit('error', { message: 'Failed to sync music state' });
            }
        });

        // Handle chat messages
        function leaveRoom(socket, roomId) {
            const room = rooms.get(roomId);
            if (room) {
                socket.leave(roomId);
                room.users.delete(socket.id);
                
                // Notify remaining users
                io.to(roomId).emit('user-left', { 
                    userCount: room.users.size,
                    users: Array.from(room.users.values())
                });
                
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                }
            }
        }

        // Update message handling to include username
        socket.on('message', (message) => {
            try {
                if (currentRoom && rooms.has(currentRoom)) {
                    const room = rooms.get(currentRoom);
                    const user = room.users.get(socket.id);
                    const messageObj = {
                        id: uuidv4(),
                        text: message,
                        timestamp: Date.now(),
                        userId: socket.id,
                        username: user ? user.username : `User-${socket.id.slice(0, 4)}`
                    };
                    room.messages.push(messageObj);
                    
                    if (room.messages.length > 100) {
                        room.messages = room.messages.slice(-100);
                    }
                    
                    io.to(currentRoom).emit('message', messageObj);
                }
            } catch (error) {
                console.error('Error handling message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            if (currentRoom) {
                leaveRoom(socket, currentRoom);
            }
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    // Periodic cleanup of inactive rooms
    setInterval(() => {
        const inactivityThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const now = Date.now();
        
        for (const [roomId, room] of rooms.entries()) {
            if (room.users.size === 0 && (now - room.musicState.timestamp) > inactivityThreshold) {
                rooms.delete(roomId);
            }
        }
    }, 60 * 60 * 1000); // Run every hour

    return io;
}

module.exports = setupSocketServer;