// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define schema and model
const titleSchema = new mongoose.Schema({
  content: String,
  tone: String,
  style: String,
  maxChars: Number,
  maxWords: Number,
  titles: [String],
  createdAt: { type: Date, default: Date.now }
});

const Title = mongoose.model('Title', titleSchema);

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate blog titles
app.post('/generate-title', async (req, res) => {
  const { blockContent, tone, style, maxChars, maxWords } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Generate 5 creative blog titles for the following content.
Tone: ${tone}
Style: ${style}
Limit to ${maxWords} words and ${maxChars} characters.
Content:
"""
${blockContent}
"""`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let titles = text
      .split('\n')
      .filter(line => line.trim())
      .map(title => title.replace(/^\d+\.?\s*/, '').trim())
      .filter(title => title.length <= maxChars && title.split(' ').length <= maxWords);

    if (titles.length > 0) {
      const entry = new Title({ content: blockContent, tone, style, maxChars, maxWords, titles });
      await entry.save();
    }

    res.json({ titles });
  } catch (error) {
    console.error('Error generating titles:', error);
    res.status(500).json({ error: 'Failed to generate titles' });
  }
});

// Fetch all saved titles
app.get('/titles', async (req, res) => {
  try {
    const allTitles = await Title.find().sort({ createdAt: -1 });
    res.json(allTitles);
  } catch (error) {
    console.error('Error fetching titles:', error);
    res.status(500).json({ error: 'Failed to fetch titles' });
  }
});

// Delete a single title entry by document ID
app.delete('/title/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Title.findByIdAndDelete(id);
    res.json({ message: 'Title entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete title entry' });
  }
});

// 🔥 NEW: Delete a specific title inside the array by index
app.delete('/title/:id/titleIndex/:index', async (req, res) => {
  const { id, index } = req.params;

  try {
    const doc = await Title.findById(id);
    if (!doc) return res.status(404).json({ error: 'Entry not found' });

    doc.titles.splice(index, 1); // remove that title

    if (doc.titles.length === 0) {
      await Title.findByIdAndDelete(id); // delete document if no titles left
    } else {
      await doc.save();
    }

    res.json({ message: 'Single title deleted successfully' });
  } catch (error) {
    console.error('Error deleting individual title:', error);
    res.status(500).json({ error: 'Failed to delete individual title' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
