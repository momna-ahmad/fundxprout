require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

app.use(cors());

// IMPORTANT: Mount didit routes BEFORE express.json() because the webhook needs the raw body
const diditRoutes = require('./routes/diditRoutes');
app.use('/api/didit', diditRoutes);

app.use(express.json());

// Routes
const campaignRoutes = require('./routes/campaignRoutes');
app.use('/api/campaigns', campaignRoutes);

function runRiskAssessmentForCampaign(campaignId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, '..', 'ai', 'score_campaigns.py');
    const pythonBin = process.env.PYTHON_BIN || 'python';

    if (!fs.existsSync(scriptPath)) {
      reject(new Error(`AI scorer not found at ${scriptPath}`));
      return;
    }

    const child = spawn(
      pythonBin,
      [scriptPath, '--campaign-id', String(campaignId)],
      {
        cwd: path.dirname(scriptPath),
        env: process.env,
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `AI scorer exited with code ${code}`));
        return;
      }

      resolve(stdout.trim());
    });
  });
}

async function scorePendingCampaignsOnStartup() {
  if (!supabase) {
    console.warn('[risk] Supabase env vars are missing; skipping startup risk scan');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, title, risk_score')
      .is('risk_score', 'null');

    if (error) {
      console.error('[risk] Failed to load pending campaigns:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('[risk] No pending campaigns found at startup');
      return;
    }

    console.log(`[risk] Found ${data.length} pending campaign(s)`);

    for (const campaign of data) {
      try {
        console.log(`[risk] Scoring campaign ${campaign.id} (${campaign.title || 'Untitled'})`);
        const output = await runRiskAssessmentForCampaign(campaign.id);
        console.log(`[risk] Completed campaign ${campaign.id}`);
        if (output) {
          console.log(output);
        }
      } catch (err) {
        console.error(`[risk] Failed campaign ${campaign.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[risk] Startup risk scan failed:', err);
  }
}

app.get('/', (req, res) => {
  res.send('FundXprout Backend Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scorePendingCampaignsOnStartup();
});