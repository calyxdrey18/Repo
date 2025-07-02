const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.resolve(__dirname, 'data', 'groups.json');

// Initialize data directory
const initDataDirectory = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
};
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
const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

const loadGroups = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error loading groups:', err);
    return [];
  }
};

const saveGroups = (groups) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving groups:', err);
    throw err;
  }
};

// API Endpoints
app.get('/api/groups', (req, res) => {
  try {
    res.json(loadGroups());
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
      imagePath: imagePath || `https://www.gravatar.com/avatar/${md5(groupName.trim())}?d=identicon&s=200`,
      createdAt: new Date().toISOString()
    };
    
    groups.push(newGroup);
    saveGroups(groups);
    res.json({ success: true, group: newGroup });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save group' });
  }
});

app.get('/api/groups/search', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase().trim();
    const groups = loadGroups();
    res.json(query ? groups.filter(g => 
      g.groupName.toLowerCase().includes(query) ||
      g.username.toLowerCase().includes(query) ||
      g.groupLink.toLowerCase().includes(query)
    ) : groups);
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
  res.status(500).send('Server error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});