// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAudioDurationInSeconds } = require('get-audio-duration');
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
    }
});

const Song = mongoose.model('Song', songSchema, 'Songs');

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

// Get all songs
app.get('/api/songs', async (req, res) => {
    try {
        const songs = await Song.find();
        res.json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific song
app.get('/api/songs/:id', async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
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
app.post('/api/songs', upload.fields([
        { name: 'songFile', maxCount: 1 },
        { name: 'imageFile', maxCount: 1 }
    ]), async (req, res) => {
    try {
        if (!req.files['songFile']) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        const audioFile = req.files['songFile'][0];
        const imageFile = req.files['imageFile'] ? req.files['imageFile'][0] : null;
    
        const duration = await getAudioDurationInSeconds(audioFile.path);
    
        const song = new Song({
        title: req.body.title,
        artist: req.body.artist,
        album: req.body.album,
        duration: Math.round(duration),
        filePath: audioFile.path,
        imageUrl: imageFile ? imageFile.path : undefined
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});