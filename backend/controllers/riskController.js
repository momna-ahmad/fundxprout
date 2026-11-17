const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabaseAdmin');

const scoreDraft = (campaign) => new Promise((resolve, reject) => {
  const scriptPath = path.resolve(__dirname, '..', '..', 'ai', 'score_campaigns.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  if (!fs.existsSync(scriptPath)) {
    reject(new Error('AI scorer is not available'));
    return;
  }

  const child = spawn(pythonBin, [scriptPath, '--preview'], {
    cwd: path.dirname(scriptPath),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', reject);
  child.on('close', (code) => {
    if (code !== 0) {
      reject(new Error(stderr.trim() || 'AI evaluation failed'));
      return;
    }

    const resultLine = stdout.split('\n').find((line) => line.startsWith('PRELAUNCH_RESULT='));
    if (!resultLine) {
      reject(new Error('AI evaluation did not return a result'));
      return;
    }
    try {
      resolve(JSON.parse(resultLine.slice('PRELAUNCH_RESULT='.length)));
    } catch {
      reject(new Error('AI evaluation returned an invalid result'));
    }
  });
  child.stdin.end(JSON.stringify(campaign));
});

exports.evaluatePrelaunch = async (req, res) => {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Sign in to evaluate a campaign.' });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError || !['owner', 'business_owner'].includes((profile?.role || '').toLowerCase())) {
      return res.status(403).json({ error: 'Campaign evaluation is available to campaign owners.' });
    }

    const { title, description, category, goal, duration, hasDemo } = req.body || {};
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Campaign title is required.' });
    }
    if (typeof description !== 'string' || description.trim().length < 30) {
      return res.status(400).json({ error: 'Add at least 30 characters to the description before evaluating.' });
    }

    const result = await scoreDraft({
      title: title.trim().slice(0, 200),
      description: description.trim().slice(0, 3000),
      category: typeof category === 'string' ? category.slice(0, 100) : 'Other',
      funding_goal: Number.isFinite(Number(goal)) ? Number(goal) : 0,
      duration: Number.isFinite(Number(duration)) ? Number(duration) : 30,
      product_demo_url: hasDemo ? 'provided' : '',
    });

    return res.json({ success: true, evaluation: result });
  } catch (error) {
    console.error('[prelaunch evaluation] Failed:', error.message);
    return res.status(500).json({ error: 'Unable to evaluate this campaign right now. Please try again.' });
  }
};
