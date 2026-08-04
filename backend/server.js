// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const campaignRoutes = require('./routes/campaignRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows Frontend to connect

// IMPORTANT: Mount didit routes BEFORE express.json() because the webhook needs the raw body
const diditRoutes = require('./routes/diditRoutes');
app.use('/api/didit', diditRoutes);

app.use(express.json()); // Parses JSON data

// Routes
app.use('/api/campaigns', campaignRoutes);

// Root Check
app.get('/', (req, res) => {
    res.send('FundXprout Backend is Live & Connected to IPFS/Supabase 🚀');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});