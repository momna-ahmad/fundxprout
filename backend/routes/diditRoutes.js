const express = require('express');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabaseAdmin');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Webhook signature verification
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Fetch and parse the full Didit decision from GET /v3/session/{id}/decision/
// Maps all fields (KYC personal data, checks, device info, KYB company data)
// into the flat column structure of verification_sessions.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAndStoreDiditDecision(sessionId) {
  if (!process.env.DIDIT_API_KEY) {
    console.warn('[Didit] DIDIT_API_KEY not set, skipping decision fetch');
    return null;
  }

  try {
    let d = {};
    try {
      const dRes = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
        headers: { 'x-api-key': process.env.DIDIT_API_KEY },
      });
      if (dRes.ok) d = await dRes.json();
    } catch (e) {
      console.warn('[Didit] Error fetching session decision:', e);
    }

    if (Object.keys(d).length === 0) {
      console.warn(`[Didit] Could not fetch session or decision data for ${sessionId}`);
      return null;
    }

    const feats = d.features || {};

    const rawIdVerification =
      (Array.isArray(d.id_verifications) && d.id_verifications[0]) ||
      (Array.isArray(feats.id_verifications) && feats.id_verifications[0]) ||
      (Array.isArray(d.decision?.id_verifications) && d.decision.id_verifications[0]) ||
      feats.id_verification ||
      feats.document_verification ||
      feats.kyc ||
      d.id_verification ||
      d.document_verification ||
      d.kyc ||
      {};

    const idProps = rawIdVerification.properties || rawIdVerification.data || rawIdVerification.extracted_data || rawIdVerification;
    const kyc = {
      ...idProps,
      ...(d.kyc || {}),
      ...(d.id_verification || {}),
      ...(d.personal_data || {}),
      ...(d.ocr || {}),
    };

    const rawLiveness =
      (Array.isArray(d.liveness_checks) && d.liveness_checks[0]) ||
      (Array.isArray(feats.liveness_checks) && feats.liveness_checks[0]) ||
      feats.liveness ||
      feats.passive_liveness ||
      d.liveness ||
      d.passive_liveness ||
      {};
    const liveness = { ...rawLiveness, ...(rawLiveness.properties || {}) };

    const rawFaceMatch =
      (Array.isArray(d.face_matches) && d.face_matches[0]) ||
      (Array.isArray(feats.face_matches) && feats.face_matches[0]) ||
      feats.face_match ||
      feats.face_comparison ||
      d.face_match ||
      d.face_comparison ||
      {};
    const faceMatch = { ...rawFaceMatch, ...(rawFaceMatch.properties || {}) };

    const rawAml =
      (Array.isArray(d.aml_screenings) && d.aml_screenings[0]) ||
      (Array.isArray(d.aml_checks) && d.aml_checks[0]) ||
      feats.aml ||
      feats.aml_screening ||
      d.aml ||
      d.aml_screening ||
      {};
    const aml = { ...rawAml, ...(rawAml.properties || {}) };

    const rawDevice =
      (Array.isArray(d.ip_analyses) && d.ip_analyses[0]) ||
      (Array.isArray(feats.ip_analyses) && feats.ip_analyses[0]) ||
      feats.ip_analysis ||
      feats.device_analysis ||
      feats.device_ip_analysis ||
      d.device_analysis ||
      d.device_ip_analysis ||
      d.device ||
      {};
    const device = { ...rawDevice, ...(rawDevice.properties || {}) };

    const rawRegistry =
      (Array.isArray(d.registry_checks) && d.registry_checks[0]) ||
      (Array.isArray(feats.registry_checks) && feats.registry_checks[0]) ||
      (Array.isArray(d.company_registries) && d.company_registries[0]) ||
      feats.company_registry ||
      feats.kyb ||
      d.company_registry ||
      d.kyb ||
      {};
    const kyb = {
      ...(rawRegistry.company || {}),
      ...rawRegistry,
      ...(d.company || {}),
      ...(d.kyb || {}),
    };
    const keyPeople = d.key_people || d.kyb_key_people || kyb.key_people || rawRegistry.key_people || feats.company_registry?.key_people || null;

    let livenessScore = null;
    const rawLivenessScore = liveness.score ?? liveness.value ?? liveness.confidence ?? liveness.liveness_score;
    if (rawLivenessScore !== undefined && rawLivenessScore !== null && !isNaN(Number(rawLivenessScore))) {
      livenessScore = Number(rawLivenessScore);
    }

    let faceMatchScore = null;
    const rawFaceScore = faceMatch.score ?? faceMatch.value ?? faceMatch.similarity ?? faceMatch.match_score;
    if (rawFaceScore !== undefined && rawFaceScore !== null && !isNaN(Number(rawFaceScore))) {
      faceMatchScore = Number(rawFaceScore);
    }

    const warnings = d.warnings || [];

    const enrichment = {
      didit_decision_payload: d,
      status: d.status || undefined,
      decision: d.decision_trace || (d.decision ? { status: d.decision } : (warnings.length > 0 ? { warning: typeof warnings[0] === 'string' ? warnings[0] : warnings[0].message || warnings[0].code } : null)),
      updated_at: new Date().toISOString(),

      first_name:         kyc.first_name        || kyc.firstName        || d.first_name        || null,
      last_name:          kyc.last_name         || kyc.lastName         || d.last_name         || null,
      date_of_birth:      kyc.date_of_birth     || kyc.dateOfBirth      || kyc.dob             || d.date_of_birth     || null,
      nationality:        kyc.nationality       || kyc.nationality_code || d.nationality       || null,
      document_type:      kyc.document_type     || kyc.documentType     || d.document_type     || null,
      document_number:    kyc.document_number   || kyc.documentNumber   || d.document_number   || null,
      personal_number:    kyc.personal_number   || kyc.personalNumber   || d.personal_number   || null,
      issuing_state:      kyc.issuing_state     || kyc.issuingState     || kyc.issuing_country || kyc.issuingCountry || d.issuing_state || null,
      expiration_date:    kyc.expiration_date   || kyc.expirationDate   || kyc.expiry_date     || d.expiration_date   || null,
      gender:             kyc.gender            || d.gender             || null,

      liveness_score:     livenessScore,
      liveness_status:    liveness.status       || liveness.result     || null,

      face_match_score:   faceMatchScore,
      face_match_status:  faceMatch.status      || faceMatch.result    || null,

      aml_status:         aml.status            || aml.result          || null,
      aml_hits:           Number(aml.hits_count || aml.hits || 0),

      device_ip:          device.ip             || device.ip_address   || null,
      device_country:     device.country        || device.country_name || null,
      device_platform:    device.platform       || device.device_platform || device.os || null,
      is_vpn:             device.is_vpn         === true || device.vpn === true,

      company_name:        kyb.company_name        || kyb.companyName        || kyb.name            || d.company_name        || null,
      registration_number: kyb.registration_number || kyb.registrationNumber || kyb.reg_number     || d.registration_number || null,
      company_type:        kyb.company_type        || kyb.companyType        || d.company_type        || null,
      incorporation_date:  kyb.incorporation_date  || kyb.incorporationDate  || d.incorporation_date  || null,
      company_status:      kyb.status              || kyb.company_status     || d.company_status      || null,
      company_country:     kyb.country             || kyb.company_country    || d.company_country     || null,
      kyb_key_people:      keyPeople ? JSON.parse(JSON.stringify(keyPeople)) : null,
    };

    const { error } = await supabaseAdmin
      .from('verification_sessions')
      .update(enrichment)
      .eq('didit_session_id', sessionId);

    if (error) {
      console.warn('[Didit] Error storing full decision data (falling back to base columns):', error.message);
      await supabaseAdmin
        .from('verification_sessions')
        .update({
          status: enrichment.status,
          decision: enrichment.decision,
          updated_at: enrichment.updated_at,
        })
        .eq('didit_session_id', sessionId);
    } else {
      console.log(`[Didit] Decision data successfully stored for session ${sessionId}`);
    }

    return enrichment;
  } catch (err) {
    console.error('[Didit] fetchAndStoreDiditDecision error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Webhook endpoint (MUST use express.raw to get the unparsed body)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.get('X-Signature-V2');
    const timestamp = req.get('X-Timestamp');
    const rawBody = req.body.toString('utf8');

    console.log(`\n[Didit Webhook] Received webhook at ${new Date().toISOString()}`);

    if (!signature || !timestamp || !verifySignature(rawBody, signature, timestamp, process.env.DIDIT_WEBHOOK_SECRET)) {
      console.log('[Didit Webhook] Invalid signature rejected!');
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Didit Webhook] Received payload:', JSON.stringify(payload, null, 2));

    const session_id = payload.session_id || payload.id || payload.session?.id || payload.session?.session_id;
    const status = payload.status || payload.session_status || payload.session?.status;
    const decision = payload.decision || payload.decision_status || payload.session?.decision || null;

    let entityId = payload.vendor_data || payload.session?.vendor_data;
    let sessionKind = payload.session_kind || payload.type || payload.session?.session_kind
      || payload.workflow_id_type || payload.session?.session_kind;

    console.log(`[Didit Webhook] Raw fields — session_id: ${session_id}, status: ${status}, decision: ${decision}, entityId: ${entityId}, sessionKind: ${sessionKind}`);

    // ── Look up our DB session to fill in missing fields ──────────────────────
    // This is the PRIMARY source for entityId and sessionKind since Didit may omit them.
    if (session_id) {
      const { data: dbSession, error: dbErr } = await supabaseAdmin
        .from('verification_sessions')
        .select('entity_id, session_kind, entity_type')
        .eq('didit_session_id', session_id)
        .maybeSingle();

      if (dbErr) console.warn('[Didit Webhook] DB lookup error:', dbErr.message);

      if (dbSession) {
        if (!entityId) {
          entityId = dbSession.entity_id;
          console.log(`[Didit Webhook] entityId resolved from DB: ${entityId}`);
        }
        if (!sessionKind) {
          sessionKind = dbSession.session_kind;
          console.log(`[Didit Webhook] sessionKind resolved from DB: ${sessionKind}`);
        }
      } else {
        console.warn(`[Didit Webhook] ⚠ No DB session found for didit_session_id=${session_id}. Session may not have been created via /kyc/create-session.`);
      }
    }

    // Normalize sessionKind: Didit may send 'kyc' or 'KYC' or 'kyb' — uppercase it.
    if (sessionKind) sessionKind = sessionKind.toUpperCase();

    // shafqaat implemented — Strict status classification:
    // ONLY 'Approved' or 'Completed' means the user passed.
    // 'In Review', 'Needs Review', 'In Progress' means admin review is needed — DO NOT set verified.
    // 'Declined' / 'Rejected' means explicitly failed.
    const statusLower = (status || '').toLowerCase().trim();
    const decisionLower = (decision || '').toLowerCase().trim();
    const isApproved = ['approved', 'completed', 'success', 'accepted'].includes(statusLower)
      || ['approved', 'completed', 'success', 'accepted'].includes(decisionLower);
    const isDeclined = ['declined', 'rejected', 'failed', 'denied'].includes(statusLower)
      || ['declined', 'rejected', 'failed', 'denied'].includes(decisionLower);
    const isInReview = ['in review', 'in_review', 'needs review', 'needs_review', 'review', 'in progress', 'in_progress', 'pending'].includes(statusLower);
    const isTerminal = isApproved || isDeclined;

    console.log(`[Didit Webhook] Parsed — entityId: ${entityId}, sessionKind: ${sessionKind}, isApproved: ${isApproved}, isDeclined: ${isDeclined}, isInReview: ${isInReview}`);

    // ── Update session status in DB ────────────────────────────────────────
    if (session_id) {
      await supabaseAdmin
        .from('verification_sessions')
        .update({
          status: status || 'Pending',
          decision: decision || status || null,
          updated_at: new Date(),
        })
        .eq('didit_session_id', session_id);

      // ── On terminal or In Review status: fetch & store the full Didit decision payload ─
      if ((isTerminal || isInReview) && session_id) {
        console.log(`[Didit Webhook] Status "${status}" — fetching full decision for ${session_id}`);
        await fetchAndStoreDiditDecision(session_id);
      }
    }

    const { createNotification } = require('../services/notificationService');

    if (isApproved && entityId) {
      // shafqaat implemented — Only set verified for genuine Approved status
      if (sessionKind === 'KYC') {
        console.log(`[Didit Webhook] ✓ Marking identity_verified = true for user: ${entityId}`);
        await supabaseAdmin.from('profiles').update({ identity_verified: true }).eq('user_id', entityId);

        await createNotification({
          userId: entityId,
          type: 'kyc_status',
          title: 'Identity Verified ✓',
          message: 'Your KYC identity verification has been approved by Didit! You can now invest in campaigns and trade tokens on the secondary market.',
          link: '/profile',
        });
      } else if (sessionKind === 'KYB') {
        console.log(`[Didit Webhook] ✓ Marking kyb_verified = true for business/owner: ${entityId}`);
        await supabaseAdmin.from('businesses').update({ kyb_verified: true }).eq('id', entityId);
        await supabaseAdmin.from('businesses').update({ kyb_verified: true }).eq('owner_id', entityId);

        let targetOwnerId = entityId;
        const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').or(`id.eq.${entityId},owner_id.eq.${entityId}`).maybeSingle();
        if (b?.owner_id) targetOwnerId = b.owner_id;

        await createNotification({
          userId: targetOwnerId,
          type: 'kyb_status',
          title: 'Business Verified ✓',
          message: 'Your KYB business verification has been approved by Didit! You can now launch fundraising campaigns.',
          link: '/profile',
        });
      }
    } else if (isInReview && entityId) {
      // shafqaat implemented — In Review: notify user that their submission is being reviewed by admin
      // DO NOT set identity_verified/kyb_verified — admin must manually approve
      let targetUserId = entityId;
      if (sessionKind === 'KYB') {
        const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').or(`id.eq.${entityId},owner_id.eq.${entityId}`).maybeSingle();
        if (b?.owner_id) targetUserId = b.owner_id;
      }
      console.log(`[Didit Webhook] ⏳ Session is In Review — NOT marking verified. Admin approval required for entity: ${entityId}`);
      await createNotification({
        userId: targetUserId,
        type: sessionKind === 'KYC' ? 'kyc_status' : 'kyb_status',
        title: `${sessionKind || 'Verification'} Under Manual Review`,
        message: `Your ${sessionKind || 'verification'} submission is currently under manual review by our compliance team. We will notify you once a decision is made — typically within 1–2 business days.`,
        link: '/profile',
      });
    } else if (isDeclined && entityId) {
      // shafqaat implemented — Declined: notify with specific reason, ensure not marked as verified
      if (sessionKind === 'KYC') {
        await supabaseAdmin.from('profiles').update({ identity_verified: false }).eq('user_id', entityId);
      } else if (sessionKind === 'KYB') {
        await supabaseAdmin.from('businesses').update({ kyb_verified: false }).eq('id', entityId);
        await supabaseAdmin.from('businesses').update({ kyb_verified: false }).eq('owner_id', entityId);
      }
      let targetUserId = entityId;
      if (sessionKind === 'KYB') {
        const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').or(`id.eq.${entityId},owner_id.eq.${entityId}`).maybeSingle();
        if (b?.owner_id) targetUserId = b.owner_id;
      }
      const declineReason = decision && decision !== status ? decision : 'Your submitted documents did not meet the verification criteria';
      await createNotification({
        userId: targetUserId,
        type: sessionKind === 'KYC' ? 'kyc_status' : 'kyb_status',
        title: `${sessionKind || 'Verification'} Declined`,
        message: `Your ${sessionKind || 'verification'} was declined. Reason: ${declineReason}. Please re-submit with clearer documents or contact support.`,
        link: '/profile',
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// We need to parse json for the following routes
router.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// 2. Create KYC Session Endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.post('/kyc/create-session', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required in request body' });

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
        vendor_data: userId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Didit API error: ${text}`);
    }

    const session = await response.json();

    await supabaseAdmin.from('verification_sessions').upsert({
      entity_type: 'user',  // CHECK constraint only allows 'user' | 'business'
      entity_id: userId,
      didit_session_id: session.session_id,
      session_kind: 'KYC',
      status: session.status || 'Not Started',
    }, { onConflict: 'didit_session_id' });

    res.json({ url: session.url });
  } catch (error) {
    console.error('KYC session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Create KYB Session Endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.post('/kyb/create-session', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required in request body' });

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
        vendor_data: business.id,
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
      status: session.status || 'Not Started',
    }, { onConflict: 'didit_session_id' });

    res.json({ url: session.url });
  } catch (error) {
    console.error('KYB session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sync Status Endpoint (manual refresh / fallback polling)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync-status', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { data: kycSession } = await supabaseAdmin
      .from('verification_sessions')
      .select('*')
      .eq('entity_id', userId)
      .eq('session_kind', 'KYC')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch user's businesses to find KYB sessions
    const { data: userBusinesses } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name')
      .eq('owner_id', userId);

    const businessIds = (userBusinesses || []).map((b) => b.id);
    const candidateIds = businessIds.length > 0 ? [...businessIds, userId] : [userId];

    const { data: kybSession } = await supabaseAdmin
      .from('verification_sessions')
      .select('*')
      .in('entity_id', candidateIds)
      .eq('session_kind', 'KYB')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let updated = false;

    // ── KYC Sync ──
    if (kycSession) {
      try {
        const diditRes = await fetch(`https://verification.didit.me/v3/session/${kycSession.didit_session_id}/decision/`, {
          headers: { 'x-api-key': process.env.DIDIT_API_KEY },
        });
        if (diditRes.ok) {
          const diditData = await diditRes.json();
          const syncStatus = (diditData.status || '').toLowerCase().trim();
          const syncDecision = (diditData.decision_trace?.status || diditData.decision || '').toLowerCase().trim();
          console.log('[sync-status KYC] Didit status:', diditData.status, '/ decision:', diditData.decision);

          const isApproved = ['approved', 'completed', 'success', 'accepted'].includes(syncStatus)
            || ['approved', 'completed', 'success', 'accepted'].includes(syncDecision);
          const isDeclined = ['declined', 'rejected', 'failed', 'denied'].includes(syncStatus)
            || ['declined', 'rejected', 'failed', 'denied'].includes(syncDecision);

          const decisionJson = diditData.decision_trace || (diditData.decision ? { status: diditData.decision } : null);

          await supabaseAdmin.from('verification_sessions')
            .update({ status: diditData.status || kycSession.status, decision: decisionJson, updated_at: new Date().toISOString() })
            .eq('didit_session_id', kycSession.didit_session_id);

          if (isApproved) {
            await supabaseAdmin.from('profiles').update({ identity_verified: true }).eq('user_id', userId);
            await fetchAndStoreDiditDecision(kycSession.didit_session_id);
            updated = true;
          } else if (isDeclined) {
            await supabaseAdmin.from('profiles').update({ identity_verified: false }).eq('user_id', userId);
          }
        }
      } catch (e) {
        console.error('[sync-status] Error fetching KYC from Didit API:', e);
      }
    }

    // ── KYB Sync ──
    if (kybSession) {
      try {
        const diditRes = await fetch(`https://verification.didit.me/v3/session/${kybSession.didit_session_id}/decision/`, {
          headers: { 'x-api-key': process.env.DIDIT_API_KEY },
        });
        if (diditRes.ok) {
          const diditData = await diditRes.json();
          const syncStatus = (diditData.status || '').toLowerCase().trim();
          const syncDecision = (diditData.decision_trace?.status || diditData.decision || '').toLowerCase().trim();
          console.log('[sync-status KYB] Didit status:', diditData.status, '/ decision:', diditData.decision);

          const isApproved = ['approved', 'completed', 'success', 'accepted'].includes(syncStatus)
            || ['approved', 'completed', 'success', 'accepted'].includes(syncDecision);
          const isDeclined = ['declined', 'rejected', 'failed', 'denied'].includes(syncStatus)
            || ['declined', 'rejected', 'failed', 'denied'].includes(syncDecision);

          const decisionJson = diditData.decision_trace || (diditData.decision ? { status: diditData.decision } : null);

          await supabaseAdmin.from('verification_sessions')
            .update({ status: diditData.status || kybSession.status, decision: decisionJson, updated_at: new Date().toISOString() })
            .eq('didit_session_id', kybSession.didit_session_id);

          const enrichment = await fetchAndStoreDiditDecision(kybSession.didit_session_id);

          if (isApproved) {
            const bizUpdates = { kyb_verified: true };
            if (enrichment?.registration_number) bizUpdates.registration_number = enrichment.registration_number;

            if (businessIds.length > 0) {
              await supabaseAdmin.from('businesses').update(bizUpdates).in('id', businessIds);
            } else {
              await supabaseAdmin.from('businesses').insert({
                owner_id: userId,
                business_name: 'My Business',
                registration_number: enrichment?.registration_number || null,
                kyb_verified: true,
              });
            }
            updated = true;
          } else if (isDeclined) {
            if (businessIds.length > 0) {
              await supabaseAdmin.from('businesses').update({ kyb_verified: false }).in('id', businessIds);
            }
          }
        }
      } catch (e) {
        console.error('[sync-status] Error fetching KYB from Didit API:', e);
      }
    }

    res.json({ success: true, updated });
  } catch (error) {
    console.error('[sync-status] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Admin: Fetch full Didit session data on-demand (for admin dashboard)
//    GET /api/didit/admin/session/:sessionId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Fetch from DB first
    const { data: dbSession } = await supabaseAdmin
      .from('verification_sessions')
      .select('*')
      .eq('didit_session_id', sessionId)
      .maybeSingle();

    // If decision data is missing or stale, re-fetch from Didit API
    const shouldRefetch = !dbSession?.didit_decision_payload ||
      (dbSession?.status === 'Approved' && !dbSession?.first_name);

    if (shouldRefetch && sessionId) {
      console.log(`[Admin] Re-fetching Didit decision for ${sessionId}`);
      await fetchAndStoreDiditDecision(sessionId);

      // Return freshly fetched data
      const { data: freshSession } = await supabaseAdmin
        .from('verification_sessions')
        .select('*')
        .eq('didit_session_id', sessionId)
        .maybeSingle();

      return res.json({ success: true, session: freshSession });
    }

    res.json({ success: true, session: dbSession });
  } catch (error) {
    console.error('[Admin] Session fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Admin: Get all sessions for an entity (KYC/KYB by user_id or business_id)
//    GET /api/didit/admin/entity/:entityId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    const { data: sessions, error } = await supabaseAdmin
      .from('verification_sessions')
      .select('*')
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For sessions missing decision data, trigger a background re-fetch
    for (const session of sessions || []) {
      if (session.status === 'Approved' && !session.didit_decision_payload) {
        fetchAndStoreDiditDecision(session.didit_session_id).catch(() => {});
      }
    }

    res.json({ success: true, sessions: sessions || [] });
  } catch (error) {
    console.error('[Admin] Entity sessions fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Admin: Override (approve/decline) a session manually
//    POST /api/didit/admin/override
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/override', async (req, res) => {
  try {
    const { sessionId, overrideStatus, reason, adminUserId } = req.body;

    if (!sessionId || !overrideStatus || !adminUserId) {
      return res.status(400).json({ error: 'sessionId, overrideStatus, and adminUserId are required' });
    }

    if (!['Approved', 'Declined', null].includes(overrideStatus)) {
      return res.status(400).json({ error: 'overrideStatus must be Approved, Declined, or null' });
    }

    const { error } = await supabaseAdmin
      .from('verification_sessions')
      .update({
        admin_override_status: overrideStatus,
        admin_override_reason: reason || null,
        admin_override_by: adminUserId,
        admin_override_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('didit_session_id', sessionId);

    if (error) throw error;

    console.log(`[Admin] Override set: session ${sessionId} → ${overrideStatus} by admin ${adminUserId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Override error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
