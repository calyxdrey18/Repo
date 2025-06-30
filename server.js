const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Example endpoint: ZIP creation is not implemented here for MS URLs
// (This is a placeholder for your backend logic)
app.post('/api/ms-zip', (req, res) => {
  const { url } = req.body;
  // In a real app, you would authenticate, fetch files from MS URL, and create a ZIP
  // For demo purposes, we just return an example file
  res.status(501).send('ZIP creation from MS URL is not implemented. Replace this with your logic!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


