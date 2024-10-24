// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const { getAudioDurationInSeconds } = require('get-audio-duration');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const port = 3000;

// Ensure uploads directory exists
// const uploadDir = 'uploads';
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }
// Middleware
// app.use(cors());
app.use(cors({
    origin: ['https://soundsphere-project.vercel.app', 'http://localhost:4200'],
    // origin: ['https://soundsphere-project.vercel.app'],
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

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
// Song Schema
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    duration: Number,
    filePath: String,
    imageUrl: {
        type: String,
        default: '/default-album.png'
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});