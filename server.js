const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure data paths
const DATA_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'data');
const DATA_FILE = process.env.DATA_PATH || path.join(DATA_DIR, 'groups.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure data directory exists
const initDataDirectory = () => {
  try {
    // Create main data directory if needed
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Created data directory at ${DATA_DIR}`);
    }

    // Create backups directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`Created backups directory at ${BACKUP_DIR}`);
    }

    // Initialize groups file if it doesn't exist
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      console.log(`Created new data file at ${DATA_FILE}`);
    }

    // Verify we can write to the directory
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    console.log(`Data directory is writable: ${DATA_DIR}`);

    // Create initial backup
    createBackup();
  } catch (err) {
    console.error('Storage initialization failed:', err);
    process.exit(1);
  }
};

// Backup function
const createBackup = () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `groups-${timestamp}.json`);
    fs.copyFileSync(DATA_FILE, backupFile);
    console.log(`Created backup: ${backupFile}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
};

// Initialize data directory
initDataDirectory();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
const loadGroups = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading groups:', err);
    return [];
  }
};

const saveGroups = (groups) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf8');
    createBackup(); // Create backup after each save
    return true;
  } catch (err) {
    console.error('Error saving groups:', err);
    throw err;
  }
};

// API Endpoints
app.get('/api/groups', (req, res) => {
  try {
    const groups = loadGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

app.post('/api/groups', (req, res) => {
  try {
    const { username, groupName, groupLink, imagePath } = req.body;
    
    if (!username?.trim() || !groupName?.trim() || !groupLink?.trim()) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
      return res.status(400).json({ error: 'Invalid WhatsApp link format' });
    }

    const groups = loadGroups();
    const newGroup = {
      id: crypto.randomUUID(),
      username: username.trim(),
      groupName: groupName.trim(),
      groupLink: groupLink.trim(),
      imagePath: imagePath || `https://www.gravatar.com/avatar/${crypto.createHash('md5').update(groupName.trim()).digest('hex')}?d=identicon&s=200`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    groups.push(newGroup);
    saveGroups(groups);
    res.json({ success: true, group: newGroup });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save group' });
  }
});

app.get('/api/health', (req, res) => {
  try {
    // Verify we can read/write to the data directory
    fs.accessSync(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    res.json({ 
      status: 'healthy',
      dataFile: DATA_FILE,
      diskSpace: fs.statSync(DATA_DIR).size
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});