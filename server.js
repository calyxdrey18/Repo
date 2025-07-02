const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
// Use Render's persistent storage path
const DATA_FILE = process.env.DATA_PATH || path.join(__dirname, 'data', 'groups.json');

// Initialize data storage
function initDataStorage() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    console.log('Created new data file at:', DATA_FILE);
  }
}

initDataStorage();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function readGroups() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading groups:', err);
    return [];
  }
}

function writeGroups(groups) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf8');
    console.log('Data successfully written to', DATA_FILE);
  } catch (err) {
    console.error('Error writing groups:', err);
    throw err;
  }
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// API Endpoints
app.get('/api/groups', (req, res) => {
  try {
    const groups = readGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

app.post('/api/groups', (req, res) => {
  try {
    const { username, groupName, groupLink, imageUrl } = req.body;
    
    if (!username || !groupName || !groupLink) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, group name, and group link are required' 
      });
    }

    if (!groupLink.startsWith('https://chat.whatsapp.com/')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid WhatsApp group link'
      });
    }

    const groups = readGroups();
    const newGroup = {
      id: generateId(),
      username: username.trim(),
      groupName: groupName.trim(),
      groupLink: groupLink.trim(),
      imageUrl: imageUrl?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName.trim())}&background=random`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    groups.push(newGroup);
    writeGroups(groups);

    res.json({ success: true, group: newGroup });
  } catch (err) {
    console.error('Error adding group:', err);
    res.status(500).json({ success: false, error: 'Failed to add group' });
  }
});

app.get('/api/groups/search', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase();
    const groups = readGroups();

    if (!query) return res.json(groups);

    const results = groups.filter(group => 
      group.groupName.toLowerCase().includes(query) ||
      group.username.toLowerCase().includes(query) ||
      group.groupLink.toLowerCase().includes(query)
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data storage: ${DATA_FILE}`);
});