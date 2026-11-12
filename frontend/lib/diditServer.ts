// frontend/lib/diditServer.ts
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function createDiditSession(type: 'kyc' | 'kyb', userId: string, origin?: string) {
  const apiKey = process.env.DIDIT_API_KEY;
  const kycWorkflow = process.env.DIDIT_KYC_WORKFLOW_ID;
  const kybWorkflow = process.env.DIDIT_KYB_WORKFLOW_ID;
  const appUrl = origin || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!apiKey) {
    throw new Error('DIDIT_API_KEY is not configured in environment variables');
  }

  const workflowId = type === 'kyc' ? kycWorkflow : kybWorkflow;
  if (!workflowId) {
    throw new Error(`DIDIT_${type.toUpperCase()}_WORKFLOW_ID is not configured in environment variables`);
  }

  let vendorData = userId;
  let entityType = 'user';
  let entityId = userId;

  if (type === 'kyb') {
    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    if (!business) {
      throw new Error('Please create a business profile first before initiating KYB verification');
    }
    vendorData = business.id;
    entityType = 'business';
    entityId = business.id;
  }

  const callbackUrl = `${appUrl}/profile?${type}=complete`;

  const response = await fetch('https://verification.didit.me/v3/session/', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      callback: callbackUrl,
      redirect_url: callbackUrl,
      return_url: callbackUrl,
      vendor_data: vendorData,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Didit API error (${response.status}): ${errorText}`);
  }

  const session = await response.json();

  if (!session.url || !session.session_id) {
    throw new Error('Didit API did not return a valid session URL or session_id');
  }

  // Save session record in Supabase verification_sessions
  await supabaseAdmin.from('verification_sessions').upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      didit_session_id: session.session_id,
      session_kind: type.toUpperCase(),
      status: session.status || 'Not Started',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'didit_session_id' }
  );

  return { url: session.url, session_id: session.session_id };
}

export async function fetchAndStoreDiditDecision(sessionId: string) {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey || !sessionId) return null;

  try {
    // In Didit v3, the complete session and decision payload is returned from /decision/
    let d: Record<string, any> = {};
    try {
      const dRes = await fetch(`https://verification.didit.me/v3/session/${sessionId}/decision/`, {
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
      });
      if (dRes.ok) {
        d = await dRes.json();
      } else {
        console.warn(`[Didit] Decision endpoint returned status ${dRes.status}`);
      }
    } catch (e) {
      console.warn('[Didit] Error fetching session decision:', e);
    }

    if (Object.keys(d).length === 0) {
      console.warn(`[Didit] Could not fetch decision data for ${sessionId}`);
      return null;
    }

    // Extract features across all Didit v3 variations (handling array structures & property nests)
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

    // Resolve liveness score (0..1 or 0..100)
    let livenessScore: number | null = null;
    const rawLivenessScore = liveness.score ?? liveness.value ?? liveness.confidence ?? liveness.liveness_score;
    if (rawLivenessScore !== undefined && rawLivenessScore !== null && !isNaN(Number(rawLivenessScore))) {
      livenessScore = Number(rawLivenessScore);
    }

    // Resolve face match score
    let faceMatchScore: number | null = null;
    const rawFaceScore = faceMatch.score ?? faceMatch.value ?? faceMatch.similarity ?? faceMatch.match_score;
    if (rawFaceScore !== undefined && rawFaceScore !== null && !isNaN(Number(rawFaceScore))) {
      faceMatchScore = Number(rawFaceScore);
    }

    // Resolve warnings (e.g. "MRZ is not valid", "Face not matched")
    const warnings = d.warnings || [];

    const enrichment = {
      didit_decision_payload: d,
      status: d.status || undefined,
      decision: d.decision_trace || (d.decision ? { status: d.decision } : (warnings.length > 0 ? { warning: typeof warnings[0] === 'string' ? warnings[0] : warnings[0].message || warnings[0].code } : null)),
      updated_at: new Date().toISOString(),
      first_name: kyc.first_name || kyc.firstName || d.first_name || null,
      last_name: kyc.last_name || kyc.lastName || d.last_name || null,
      date_of_birth: kyc.date_of_birth || kyc.dateOfBirth || kyc.dob || d.date_of_birth || null,
      nationality: kyc.nationality || kyc.nationality_code || d.nationality || null,
      document_type: kyc.document_type || kyc.documentType || d.document_type || null,
      document_number: kyc.document_number || kyc.documentNumber || d.document_number || null,
      personal_number: kyc.personal_number || kyc.personalNumber || d.personal_number || null,
      issuing_state: kyc.issuing_state || kyc.issuingState || kyc.issuing_country || kyc.issuingCountry || d.issuing_state || null,
      expiration_date: kyc.expiration_date || kyc.expirationDate || kyc.expiry_date || d.expiration_date || null,
      gender: kyc.gender || d.gender || null,
      liveness_score: livenessScore,
      liveness_status: liveness.status || liveness.result || null,
      face_match_score: faceMatchScore,
      face_match_status: faceMatch.status || faceMatch.result || null,
      aml_status: aml.status || aml.result || null,
      aml_hits: Number(aml.hits_count || aml.hits || 0),
      device_ip: device.ip || device.ip_address || null,
      device_country: device.country || device.country_name || null,
      device_platform: device.platform || device.device_platform || device.os || null,
      is_vpn: device.is_vpn === true || device.vpn === true,
      company_name: kyb.company_name || kyb.companyName || kyb.name || d.company_name || null,
      registration_number: kyb.registration_number || kyb.registrationNumber || kyb.reg_number || d.registration_number || null,
      company_type: kyb.company_type || kyb.companyType || d.company_type || null,
      incorporation_date: kyb.incorporation_date || kyb.incorporationDate || d.incorporation_date || null,
      company_status: kyb.status || kyb.company_status || d.company_status || null,
      company_country: kyb.country || kyb.company_country || d.company_country || null,
      kyb_key_people: Array.isArray(keyPeople) ? keyPeople : null,
    };

    // Attempt to update verification_sessions with all columns
    const { error: updateError } = await supabaseAdmin
      .from('verification_sessions')
      .update(enrichment)
      .eq('didit_session_id', sessionId);

    if (updateError) {
      console.warn('[Didit] Full column update failed (migration 0009 may need to be run in Supabase SQL editor):', updateError.message);
      // Fallback: update only base columns so status and decision are never lost
      await supabaseAdmin
        .from('verification_sessions')
        .update({
          status: enrichment.status,
          decision: enrichment.decision,
          updated_at: enrichment.updated_at,
        })
        .eq('didit_session_id', sessionId);
    }

    return enrichment;
  } catch (err) {
    console.warn('[Didit] fetchAndStoreDiditDecision error:', err);
    return null;
  }
}

export async function syncDiditStatus(userId: string) {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!userId) throw new Error('userId is required');
  if (!apiKey) {
    return { updated: false, message: 'DIDIT_API_KEY not set' };
  }

  // 1. Fetch user's business(es) if any, to support both KYC and KYB sync
  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .eq('owner_id', userId);

  const businessIds = (businesses || []).map((b) => b.id);

  // 2. Find most recent KYC session
  const { data: kycSession } = await supabaseAdmin
    .from('verification_sessions')
    .select('*')
    .eq('entity_id', userId)
    .eq('session_kind', 'KYC')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Find most recent KYB session (can be linked to business.id or user.id)
  const candidateIds = businessIds.length > 0 ? [...businessIds, userId] : [userId];
  const { data: kybSession } = await supabaseAdmin
    .from('verification_sessions')
    .select('*')
    .in('entity_id', candidateIds)
    .eq('session_kind', 'KYB')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!kycSession && !kybSession) {
    return { updated: false, message: 'No KYC or KYB verification session found for user' };
  }

  let kycUpdated = false;
  let kybUpdated = false;
  let kycStatus = kycSession?.status || null;
  let kybStatus = kybSession?.status || null;

  // Helper to persist system notification to user
  const notifyUser = async (title: string, message: string, type: string = 'kyc_status') => {
    try {
      await supabaseAdmin.from('notifications').insert([
        {
          user_id: userId,
          type,
          title,
          message,
          link: '/profile',
          metadata: { timestamp: new Date().toISOString() },
        },
      ]);
    } catch (err) {
      console.warn('[syncDiditStatus] notification insert error:', err);
    }
  };

  // ── Sync KYC Session ──
  if (kycSession) {
    try {
      const diditRes = await fetch(`https://verification.didit.me/v3/session/${kycSession.didit_session_id}/decision/`, {
        headers: { 'x-api-key': apiKey },
      });
      if (diditRes.ok) {
        const diditData = await diditRes.json();
        kycStatus = diditData.status || kycSession.status;
        const syncStatus = (diditData.status || '').toLowerCase().trim();
        const syncDecision = (diditData.decision_trace?.status || diditData.decision || '').toLowerCase().trim();

        const isApproved =
          ['approved', 'completed', 'success', 'accepted'].includes(syncStatus) ||
          ['approved', 'completed', 'success', 'accepted'].includes(syncDecision);
        const isDeclined =
          ['declined', 'rejected', 'failed', 'denied'].includes(syncStatus) ||
          ['declined', 'rejected', 'failed', 'denied'].includes(syncDecision);
        const isInReview =
          syncStatus.includes('review') || syncStatus.includes('progress') || syncStatus.includes('needs');

        await supabaseAdmin
          .from('verification_sessions')
          .update({
            status: diditData.status || kycSession.status,
            decision: diditData.decision_trace || (diditData.decision ? { status: diditData.decision } : null),
            updated_at: new Date().toISOString(),
          })
          .eq('didit_session_id', kycSession.didit_session_id);

        // Fetch & enrich full fields (name, dob, nationality, etc.)
        const enrichment = await fetchAndStoreDiditDecision(kycSession.didit_session_id);

        if (isApproved) {
          // Keep user's manually entered name & country in profiles.
          // Vendor-extracted document data (e.g. sandbox simulated data) is preserved in verification_sessions.
          await supabaseAdmin.from('profiles').update({ identity_verified: true }).eq('user_id', userId);
          await notifyUser(
            'Identity Verified ✓',
            'Your KYC identity verification has been approved by Didit! You can now invest and trade on FundXprout.'
          );
          kycUpdated = true;
        } else if (isDeclined) {
          await supabaseAdmin.from('profiles').update({ identity_verified: false }).eq('user_id', userId);
          await notifyUser(
            'KYC Verification Declined',
            `Your KYC verification was not approved. Reason: ${diditData.decision || 'Verification requirements not met'}. Please retry from your profile.`
          );
        } else if (isInReview) {
          await notifyUser(
            'KYC Submission Under Review',
            'Your identity documents have been submitted and are currently awaiting review.'
          );
        }
      }
    } catch (e) {
      console.error('[syncDiditStatus] KYC fetch error:', e);
    }
  }

  // ── Sync KYB Session ──
  if (kybSession) {
    try {
      const diditRes = await fetch(`https://verification.didit.me/v3/session/${kybSession.didit_session_id}/decision/`, {
        headers: { 'x-api-key': apiKey },
      });
      if (diditRes.ok) {
        const diditData = await diditRes.json();
        kybStatus = diditData.status || kybSession.status;
        const syncStatus = (diditData.status || '').toLowerCase().trim();
        const syncDecision = (diditData.decision_trace?.status || diditData.decision || '').toLowerCase().trim();

        const isApproved =
          ['approved', 'completed', 'success', 'accepted'].includes(syncStatus) ||
          ['approved', 'completed', 'success', 'accepted'].includes(syncDecision);
        const isDeclined =
          ['declined', 'rejected', 'failed', 'denied'].includes(syncStatus) ||
          ['declined', 'rejected', 'failed', 'denied'].includes(syncDecision);
        const isInReview =
          syncStatus.includes('review') || syncStatus.includes('progress') || syncStatus.includes('needs');

        await supabaseAdmin
          .from('verification_sessions')
          .update({
            status: diditData.status || kybSession.status,
            decision: diditData.decision_trace || (diditData.decision ? { status: diditData.decision } : null),
            updated_at: new Date().toISOString(),
          })
          .eq('didit_session_id', kybSession.didit_session_id);

        const enrichment = await fetchAndStoreDiditDecision(kybSession.didit_session_id);

        if (isApproved) {
          // Keep user's manually entered business name in businesses table.
          // Extracted company data is safely stored in verification_sessions.
          const bizUpdates: Record<string, any> = { kyb_verified: true };
          if (enrichment?.registration_number) bizUpdates.registration_number = enrichment.registration_number;

          if (businessIds.length > 0) {
            await supabaseAdmin.from('businesses').update(bizUpdates).in('id', businessIds);
          } else {
            // If user did not have a business record created yet, create it now
            await supabaseAdmin.from('businesses').insert({
              owner_id: userId,
              business_name: 'My Business',
              registration_number: enrichment?.registration_number || null,
              kyb_verified: true,
            });
          }
          await notifyUser(
            'Business Verified ✓',
            'Your KYB business verification has been approved by Didit! You can now launch fundraising campaigns.',
            'kyb_status'
          );
          kybUpdated = true;
        } else if (isDeclined) {
          if (businessIds.length > 0) {
            await supabaseAdmin.from('businesses').update({ kyb_verified: false }).in('id', businessIds);
          }
        }
      }
    } catch (e) {
      console.error('[syncDiditStatus] KYB fetch error:', e);
    }
  }

  return {
    updated: kycUpdated || kybUpdated,
    kycUpdated,
    kybUpdated,
    kycStatus,
    kybStatus,
  };
}

export async function syncAllDiditSessions() {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey) return { count: 0, message: 'DIDIT_API_KEY not configured' };

  const { data: sessions } = await supabaseAdmin
    .from('verification_sessions')
    .select('didit_session_id, status, decision, entity_id')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!sessions || sessions.length === 0) return { count: 0, message: 'No sessions found in database' };

  let updatedCount = 0;
  for (const s of sessions) {
    try {
      const res = await fetch(`https://verification.didit.me/v3/session/${s.didit_session_id}/decision/`, {
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
      });
      if (res.ok) {
        const d = await res.json();
        if (d.status && (d.status !== s.status || d.decision !== s.decision)) {
          await supabaseAdmin
            .from('verification_sessions')
            .update({
              status: d.status,
              decision: d.decision || null,
              updated_at: new Date().toISOString(),
            })
            .eq('didit_session_id', s.didit_session_id);

          await fetchAndStoreDiditDecision(s.didit_session_id);
          updatedCount++;
        }
      }
    } catch (err) {
      console.warn(`Error syncing session ${s.didit_session_id}:`, err);
    }
  }

  return { count: updatedCount, total: sessions.length };
}
