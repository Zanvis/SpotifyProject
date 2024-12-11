const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const setupSocketServer = require('./socketServer');

const app = express();
const port = 3000;
const server = http.createServer(app);

// Middleware configurations
app.use(cors({
    origin: ['https://soundsphere-project.vercel.app', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// app.use(express.static('public'));
// app.use('/public', express.static(path.join(__dirname, 'public')));
// Setup Socket.IO with authentication
const io = setupSocketServer(server);
// MongoDB connection
const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
    
// Configure Cloudinary storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'soundsphere',
        allowed_formats: ['jpg', 'png', 'mp3', 'wav', 'aac', 'webp'], 
        resource_type: 'auto'
    }
});

// Socket Authentication Middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// Socket event handlers for music-related features
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Handle song updates
    socket.on('song-progress', ({ songId, currentTime }) => {
        // Broadcast song progress to room members
        if (socket.roomId) {
            socket.to(socket.roomId).emit('song-progress-update', { songId, currentTime });
        }
    });

    // Handle playlist updates
    socket.on('playlist-update', async ({ roomId, songId, action }) => {
        try {
            const song = await Song.findById(songId).populate('uploader', 'username');
            if (song) {
                io.to(roomId).emit('playlist-changed', { song, action });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to update playlist' });
        }
    });

    // Handle song requests
    socket.on('request-song', async ({ songId, roomId }) => {
        try {
            const song = await Song.findById(songId).populate('uploader', 'username');
            if (song) {
                io.to(roomId).emit('song-requested', {
                    song,
                    requestedBy: socket.user.username
                });
            }
        } catch (error) {
            socket.emit('error', { message: 'Failed to request song' });
        }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}`);
    });
});
// Song Schema
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    duration: Number,
    filePath: String,
    imageUrl: {
        type: String
        // default: '/default-album.png'
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Song = mongoose.model('Song', songSchema, 'Songs');

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        autoPlayNext: {
            type: Boolean,
            default: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema, 'Users');
// Multer configuration for file uploads
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadDir)
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + path.extname(file.originalname))
//     }
// });

// const fileFilter = (req, file, cb) => {
//     if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
//         cb(null, true);
//     } else {
//         cb(new Error('Only audio and image files are allowed!'), false);
//     }
// };

// const upload = multer({ 
//     storage: storage,
//     fileFilter: fileFilter
// });
const upload = multer({ storage: storage });

// Routes

// Middleware for JWT validation
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Get all songs
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find().populate('uploader', 'username');
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific song
app.get('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id).populate('uploader', 'username');
        if (song) {
            res.json(song);
        } else {
            res.status(404).json({ message: 'Song not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// app.post('/api/songs', upload.fields([
//     { name: 'songFile', maxCount: 1 },
//     { name: 'imageFile', maxCount: 1 }
// ]), async (req, res) => {
//     try {
//         if (!req.files['songFile']) {
//             return res.status(400).json({ message: 'No audio file uploaded' });
//         }

//         const audioFilePath = req.files['songFile'][0].path;
//         const duration = await getAudioDurationInSeconds(audioFilePath);

//         const song = new Song({
//             title: req.body.title,
//             artist: req.body.artist,
//             album: req.body.album,
//             duration: Math.round(duration), // Round to nearest second
//             filePath: audioFilePath,
//             imageUrl: req.files['imageFile'] ? req.files['imageFile'][0].path : undefined
//         });

//         const newSong = await song.save();
//         res.status(201).json(newSong);
//     } catch (error) {
//         console.error('Error uploading song:', error);
//         res.status(400).json({ message: error.message });
//     }
// });

// Create a new song
app.post('/api/songs', authMiddleware, upload.fields([
    { name: 'songFile', maxCount: 1 },
    { name: 'imageFile', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files['songFile']) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        const audioFile = req.files['songFile'][0];
        const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;

        // Get audio metadata from Cloudinary
        const audioMetadata = await cloudinary.api.resource(audioFile.filename, { 
            resource_type: 'video',
            image_metadata: true
        });

        // Extract duration from metadata
        let duration = 0;
        if (audioMetadata.duration) {
            duration = Math.round(audioMetadata.duration);
        } else if (audioMetadata.image_metadata && audioMetadata.image_metadata.Duration) {
            const durationStr = audioMetadata.image_metadata.Duration;
            const [minutes, seconds] = durationStr.split(':').map(Number);
            duration = minutes * 60 + seconds;
        }
    
        const song = new Song({
            title: req.body.title,
            artist: req.body.artist,
            album: req.body.album,
            duration: duration,
            filePath: audioFile.path,
            imageUrl: imageFile ? imageFile.path : undefined,
            uploader: req.user._id
        });
    
        const newSong = await song.save();
        res.status(201).json(newSong);
    } catch (error) {
        console.error('Error uploading song:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update a song
app.put('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (song) {
        Object.assign(song, req.body);
        const updatedSong = await song.save();
        res.json(updatedSong);
        } else {
        res.status(404).json({ message: 'Song not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a song
// app.delete('/api/songs/:id', async (req, res) => {
//     try {
//         const song = await Song.findById(req.params.id);
//         if (song) {
//             await Song.deleteOne({ _id: req.params.id });
//             res.json({ message: 'Song deleted' });
//         } else {
//             res.status(404).json({ message: 'Song not found' });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// Delete a song
app.delete('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (song) {
            // Delete audio file from Cloudinary
            if (song.filePath) {
                const publicId = getPublicIdFromUrl(song.filePath);
                await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
            }

            // Delete image file from Cloudinary
            if (song.imageUrl) {
                const publicId = getPublicIdFromUrl(song.imageUrl);
                await cloudinary.uploader.destroy(publicId);
            }
    
            // Delete song from database
            await Song.deleteOne({ _id: req.params.id });
            
            res.json({ message: 'Song deleted' });
        } else {
            res.status(404).json({ message: 'Song not found' });
        }
    } catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ message: error.message });
    }
});

// Helper function to extract public_id from Cloudinary URL
function getPublicIdFromUrl(url) {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return 'soundsphere/' + filename.split('.')[0];
}
const playlistSchema = new mongoose.Schema({
    name: String,
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }]
});

const Playlist = mongoose.model('Playlist', playlistSchema, 'Playlists');

// Get all playlists
app.get('/api/playlists', async (req, res) => {
    try {
        const playlists = await Playlist.find().populate('songs');
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new playlist
app.post('/api/playlists', async (req, res) => {
    const playlist = new Playlist({
        name: req.body.name,
        songs: []
    });

    try {
        const newPlaylist = await playlist.save();
        res.status(201).json(newPlaylist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Add a song to a playlist
app.post('/api/playlists/:id/songs', async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (playlist) {
            playlist.songs.push(req.body.songId);
            const updatedPlaylist = await playlist.save();
            res.json(updatedPlaylist);
        } else {
            res.status(404).json({ message: 'Playlist not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Remove a song from a playlist
app.delete('/api/playlists/:id/songs/:songId', async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (playlist) {
            playlist.songs = playlist.songs.filter(song => song.toString() !== req.params.songId);
            const updatedPlaylist = await playlist.save();
            res.json(updatedPlaylist);
        } else {
            res.status(404).json({ message: 'Playlist not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a playlist
app.delete('/api/playlists/:id', async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (playlist) {
            await Playlist.deleteOne({ _id: req.params.id });
            res.json({ message: 'Playlist deleted' });
        } else {
            res.status(404).json({ message: 'Playlist not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'Username or email already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Protected route example
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// Update user profile
app.put('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        const { username } = req.body;
        
        // Check if username is already taken
        const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
        if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
        }

        // Update user
        const user = await User.findByIdAndUpdate(
        req.user._id,
        { username },
        { new: true }
        ).select('-password');

        res.json({ user });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update password
app.put('/api/users/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
    
        // Validate password requirements
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }
        
        if (!/\d/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one number' });
        }
        
        if (!/[a-zA-Z]/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one letter' });
        }
        
        // Verify current password
        const user = await User.findById(req.user._id);
        const isValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
    
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update user preferences
app.put('/api/users/preferences', authMiddleware, async (req, res) => {
    try {
        const { emailNotifications, autoPlayNext } = req.body;
        
        // Add preferences field to user schema if not exists
        const user = await User.findByIdAndUpdate(
        req.user._id,
        { 
            $set: { 
            preferences: { emailNotifications, autoPlayNext }
            }
        },
        { new: true }
        );
        
        res.json(user.preferences);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get user preferences
app.get('/api/users/preferences', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.preferences || { emailNotifications: true, autoPlayNext: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete account
// app.delete('/api/users/account', authMiddleware, async (req, res) => {
//     try {
//         // Delete user's playlists
//         await Playlist.deleteMany({ user: req.user._id });
        
//         // Delete user's songs
//         const userSongs = await Song.find({ uploader: req.user._id });
//         for (const song of userSongs) {
//         // Delete song files from storage
//         // File deletion logic TODO
//         }
//         await Song.deleteMany({ uploader: req.user._id });
        
//         // Delete user
//         await User.findByIdAndDelete(req.user._id);
        
//         res.json({ message: 'Account deleted successfully' });
//     } catch (error) {
//         res.status(400).json({ message: error.message });
//     }
// });
// Delete account
app.delete('/api/users/account', authMiddleware, async (req, res) => {
    try {
        // Delete user's playlists
        await Playlist.deleteMany({ user: req.user._id });
        
        // Find all user's songs
        const userSongs = await Song.find({ uploader: req.user._id });
        
        // Delete each song's files from Cloudinary and database
        for (const song of userSongs) {
            try {
                // Delete audio file from Cloudinary
                if (song.filePath) {
                    const audioPublicId = getPublicIdFromUrl(song.filePath);
                    await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
                }

                // Delete image file from Cloudinary
                if (song.imageUrl) {
                    const imagePublicId = getPublicIdFromUrl(song.imageUrl);
                    await cloudinary.uploader.destroy(imagePublicId);
                }
            } catch (deleteError) {
                console.error(`Error deleting files for song ${song._id}:`, deleteError);
                // Continue with the loop even if one song fails
            }
        }
        
        // Delete all user's songs from database
        await Song.deleteMany({ uploader: req.user._id });
        
        // Delete user account
        await User.findByIdAndDelete(req.user._id);
        
        res.json({ message: 'Account and all associated content deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ 
            message: 'An error occurred while deleting the account',
            error: error.message 
        });
    }
});

app.get('/api/users/check-username/:username', authMiddleware, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Don't check availability if user is checking their own current username
        if (req.user.username === username) {
            return res.json({ available: true });
        }

        const existingUser = await User.findOne({ 
        username: username,
        _id: { $ne: req.user._id } // Exclude current user from check
        });

        res.json({ available: !existingUser });
    } catch (error) {
        res.status(500).json({ message: 'Error checking username availability' });
    }
});
// New route to get active listening rooms
app.get('/api/rooms', authMiddleware, async (req, res) => {
    try {
        const rooms = Array.from(io.sockets.adapter.rooms.entries())
            .filter(([roomId, room]) => roomId.length === 36) // UUID length
            .map(([roomId, room]) => ({
                roomId,
                userCount: room.size
            }));
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// New route to get room details
app.get('/api/rooms/:roomId', authMiddleware, async (req, res) => {
    try {
        const room = io.sockets.adapter.rooms.get(req.params.roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const roomData = {
            roomId: req.params.roomId,
            userCount: room.size,
            users: Array.from(room).map(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                return {
                    username: socket.user.username,
                    id: socket.user._id
                };
            })
        };

        res.json(roomData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});