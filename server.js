const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'groups.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Create directories if they don't exist
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function loadGroups() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading groups:', err);
    return [];
  }
}

function saveGroups(groups) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2));
  } catch (err) {
    console.error('Error saving groups:', err);
    throw err;
  }
}

// API Endpoints
app.get('/api/groups', (req, res) => {
  try {
    const groups = loadGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

app.post('/api/groups', upload.single('groupImage'), async (req, res) => {
  try {
    const { username, groupName, groupLink } = req.body;
    
    if (!username || !groupName || !groupLink) {
      // Delete uploaded file if validation fails
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
      if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      return res.status(400).json({ error: 'Invalid WhatsApp link format' });
    }

    const groups = loadGroups();
    const newGroup = {
      id: crypto.randomUUID(),
      username,
      groupName,
      groupLink,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };
    
    groups.push(newGroup);
    saveGroups(groups);
    
    res.json({ success: true, group: newGroup });
  } catch (err) {
    console.error('Error saving group:', err);
    if (req.file) fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
    res.status(500).json({ error: 'Failed to save group' });
  }
});

app.get('/api/groups/search', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase();
    const groups = loadGroups();
    
    const filtered = query 
      ? groups.filter(group => 
          group.groupName.toLowerCase().includes(query) ||
          group.username.toLowerCase().includes(query) ||
          (group.groupLink && group.groupLink.toLowerCase().includes(query))
      : groups;
    
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
