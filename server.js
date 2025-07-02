const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.resolve(__dirname, 'data', 'groups.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', { mode: 0o644 });
  }
};
ensureDataDirectory();

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function loadGroups() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading groups:', err);
    return [];
  }
}

function saveGroups(groups) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving groups:', err);
    throw err; // Rethrow to handle in routes
  }
}

// API Routes
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
    
    if (!username || !groupName || !groupLink) {
      return res.status(400).json({ 
        error: 'Username, group name, and group link are required' 
      });
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
