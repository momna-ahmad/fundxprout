// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const campaignRoutes = require('./routes/campaignRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows Frontend to connect
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