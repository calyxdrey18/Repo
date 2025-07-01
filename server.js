const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'groups.json');

// Create directories if they don't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// Middleware
app.use(cors());
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
  }
}

// API Routes
app.get('/api/groups', (req, res) => {
  const groups = loadGroups();
  res.json(groups);
});

app.post('/api/groups', (req, res) => {
  const { username, groupName, groupLink, imagePath } = req.body;
  
  if (!username || !groupName || !groupLink) {
    return res.status(400).json({ 
      success: false, 
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
});

app.get('/api/groups/search', (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  const groups = loadGroups();
  
  if (!query) return res.json(groups);
  
  const filtered = groups.filter(group => 
    group.groupName.toLowerCase().includes(query) ||
    group.username.toLowerCase().includes(query) ||
    group.groupLink.toLowerCase().includes(query)
  );
  
  res.json(filtered);
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});