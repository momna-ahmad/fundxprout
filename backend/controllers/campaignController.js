const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper: Upload file to IPFS via Pinata
const uploadToPinata = async (filePath, fileName) => {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    let data = new FormData();
    data.append('file', fs.createReadStream(filePath));
    data.append('pinataMetadata', JSON.stringify({ name: fileName }));

    try {
        const res = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${process.env.PINATA_JWT}`,
                ...data.getHeaders()
            }
        });
        return res.data.IpfsHash;
    } catch (error) {
        console.error("IPFS Error:", error);
        throw new Error("Failed to upload to IPFS");
    }
};

// 1. CREATE DRAFT CAMPAIGN
exports.createDraft = async (req, res) => {
    try {
        const { title, description, goal, duration, category, ownerWallet } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "Image is required" });

        // Step A: Upload Image to IPFS (The "Decentralized Storage" requirement )
        console.log("Uploading to IPFS...");
        const ipfsHash = await uploadToPinata(file.path, file.originalname);
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        // Step B: Save Metadata to Supabase (The "Backend Services" requirement )
        const { data, error } = await supabase
            .from('campaigns')
            .insert([{
                title,
                description,
                goal_amount: goal,
                duration_days: duration,
                category,
                image_hash: ipfsUrl,
                owner_wallet: ownerWallet,
                status: 'draft'
            }])
            .select()
            .single();

        if (error) throw error;

        // Cleanup local file
        fs.unlinkSync(file.path);

        console.log("Draft Created:", data.id);
        res.status(201).json({ success: true, campaign: data });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// 2. LINK BLOCKCHAIN ADDRESS
exports.linkContract = async (req, res) => {
    const { id, contractAddress } = req.body;

    const { data, error } = await supabase
        .from('campaigns')
        .update({ contract_address: contractAddress, status: 'deployed' })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
};