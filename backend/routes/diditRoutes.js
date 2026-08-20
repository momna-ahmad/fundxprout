const express = require('express');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabaseAdmin');
const router = express.Router();

// Helper functions for Didit Webhook signature verification
function shortenFloats(data) {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, shortenFloats(v)]));
  }
  return data;
}

function sortKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, k) => { acc[k] = sortKeys(obj[k]); return acc; }, {});
  }
  return obj;
}

function verifySignature(rawBody, signature, timestamp, secret) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;
  const canonical = JSON.stringify(sortKeys(shortenFloats(JSON.parse(rawBody))));
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8'), b = Buffer.from(signature, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 1. Webhook endpoint (MUST use express.raw to get the unparsed body string for signature)
// Since server.js already uses express.json() globally, we override it here by getting the raw body stream manually
// Or easier: we tell the user to mount this router BEFORE express.json() in server.js!
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-Signature-V2');
    const timestamp = req.get('X-Timestamp');
    const rawBody = req.body.toString('utf8');

    console.log(`\n[Didit Webhook] Received webhook at ${new Date().toISOString()}`);

    if (!signature || !timestamp || !verifySignature(rawBody, signature, timestamp, process.env.DIDIT_WEBHOOK_SECRET)) {
      console.log("[Didit Webhook] Invalid signature rejected!");
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    console.log("[Didit Webhook] Received payload:", JSON.stringify(payload, null, 2));

    const session_id = payload.session_id || payload.id || payload.session?.id || payload.session?.session_id;
    const status = payload.status || payload.session_status || payload.session?.status;
    const decision = payload.decision || payload.decision_status || payload.session?.decision || (status === 'Approved' ? 'Approved' : null);

    let entityId = payload.vendor_data || payload.session?.vendor_data;
    let sessionKind = payload.session_kind || payload.type || payload.session?.session_kind;

    if (session_id) {
      const { data: dbSession } = await supabaseAdmin
        .from('verification_sessions')
        .select('*')
        .eq('didit_session_id', session_id)
        .maybeSingle();

      if (dbSession) {
        if (!entityId) entityId = dbSession.entity_id;
        if (!sessionKind) sessionKind = dbSession.session_kind;
      }
    }

    const isApproved = status === 'Approved' || decision === 'Approved' || status === 'Completed';

    if (session_id) {
      await supabaseAdmin
        .from('verification_sessions')
        .update({ 
          status: status || (isApproved ? 'Approved' : 'Pending'), 
          decision: payload.decision || decision || null, 
          updated_at: new Date() 
        })
        .eq('didit_session_id', session_id);
    }

    if (isApproved && entityId) {
      if (sessionKind === 'KYC') {
        console.log(`[Didit Webhook] Marking identity_verified = true for user: ${entityId}`);
        await supabaseAdmin.from('profiles').update({ identity_verified: true }).eq('user_id', entityId);
      } else if (sessionKind === 'KYB') {
        console.log(`[Didit Webhook] Marking kyb_verified = true for business/owner: ${entityId}`);
        await supabaseAdmin.from('businesses').update({ kyb_verified: true }).eq('id', entityId);
        await supabaseAdmin.from('businesses').update({ kyb_verified: true }).eq('owner_id', entityId);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
});

// We need to parse json for the following routes
router.use(express.json());

// 2. Create KYC Session Endpoint
router.post('/kyc/create-session', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required in request body" });

    const response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.DIDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: process.env.DIDIT_KYC_WORKFLOW_ID,
        callback: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyc=complete`,
        redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyc=complete`,
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyc=complete`,
        vendor_data: userId, // We pass userId so it comes back in the webhook!
      }),
    });
    
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Didit API error: ${text}`);
    }
    
    const session = await response.json();

    await supabaseAdmin.from('verification_sessions').upsert({
      entity_type: 'user',
      entity_id: userId,
      didit_session_id: session.session_id,
      session_kind: 'KYC',
      status: session.status,
    }, { onConflict: 'didit_session_id' });

    res.json({ url: session.url });
  } catch (error) {
    console.error("KYC session error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Create KYB Session Endpoint
router.post('/kyb/create-session', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required in request body" });

    // First get the business ID for this user
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (!business) return res.status(400).json({ error: 'Create a business profile first' });

    const response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.DIDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: process.env.DIDIT_KYB_WORKFLOW_ID,
        callback: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyb=complete`,
        redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyb=complete`,
        return_url: `${process.env.APP_URL || 'http://localhost:3000'}/profile?kyb=complete`,
        vendor_data: business.id, // Pass business ID
      }),
    });
    
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`Didit API error: ${text}`);
    }

    const session = await response.json();

    await supabaseAdmin.from('verification_sessions').upsert({
      entity_type: 'business',
      entity_id: business.id,
      didit_session_id: session.session_id,
      session_kind: 'KYB',
      status: session.status,
    }, { onConflict: 'didit_session_id' });

    res.json({ url: session.url });
  } catch (error) {
    console.error("KYB session error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Manual Sync Status Endpoint
router.post('/sync-status', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Check latest KYC session
    const { data: kycSession } = await supabaseAdmin
      .from('verification_sessions')
      .select('*')
      .eq('entity_id', userId)
      .eq('session_kind', 'KYC')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let updated = false;

    if (kycSession) {
      // Query Didit API for session status directly if session_id exists
      try {
        const diditRes = await fetch(`https://verification.didit.me/v3/session/${kycSession.didit_session_id}/`, {
          headers: { 'x-api-key': process.env.DIDIT_API_KEY }
        });
        if (diditRes.ok) {
          const diditData = await diditRes.json();
          console.log("[sync-status] Didit API Session Data:", diditData.status, diditData.decision);
          const isApproved = diditData.status === 'Approved' || diditData.decision === 'Approved' || diditData.status === 'Completed';
          if (isApproved) {
            await supabaseAdmin.from('profiles').update({ identity_verified: true }).eq('user_id', userId);
            await supabaseAdmin.from('verification_sessions').update({ status: 'Approved', decision: 'Approved' }).eq('didit_session_id', kycSession.didit_session_id);
            updated = true;
          }
        }
      } catch (e) {
        console.error("[sync-status] Error fetching from Didit API:", e);
      }
    }

    res.json({ success: true, updated });
  } catch (error) {
    console.error("[sync-status] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
