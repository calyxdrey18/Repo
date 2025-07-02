const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_PATH || '/var/www/data/groups.json';
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/var/www/data/uploads';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize data storage
function initStorage() {
  [path.dirname(DATA_FILE), UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}

initStorage();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
const readGroups = () => JSON.parse(fs.readFileSync(DATA_FILE));
const writeGroups = (groups) => fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2));

// API Endpoints
app.post('/api/groups', upload.single('groupImage'), async (req, res) => {
  try {
    const { username, groupName, groupLink } = req.body;
    
    if (!username || !groupName || !groupLink) {
      // Clean up uploaded file if validation fails
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'All fields are required' });
    }

    const imageUrl = req.file 
      ? `/uploads/${req.file.filename}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`;

    const groups = readGroups();
    groups.push({
      id: crypto.randomUUID(),
      username,
      groupName,
      groupLink,
      imageUrl,
      createdAt: new Date().toISOString()
    });

    writeGroups(groups);
    res.json({ success: true });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.get('/api/groups', (req, res) => {
  try {
    res.json(readGroups());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  console.log(`Uploads dir: ${UPLOADS_DIR}`);
});