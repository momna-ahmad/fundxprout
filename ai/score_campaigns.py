"""
score_campaigns.py
------------------
FundXProut AI Risk Assessment Module
Reads unscored campaigns from Supabase, scores them using Gemini Flash
(Groq as backup), runs the trained Random Forest model, and writes the
risk score + 8 LLM sub-scores back to Supabase.

Usage:
    cd e:/FYP/fundxprout/ai
    python score_campaigns.py

    # Score only 1 campaign (for testing):
    python score_campaigns.py --test

    # Re-score all campaigns (overwrite existing scores):
    python score_campaigns.py --all
"""

import os
import sys
import json
import re
import time
import argparse
import warnings

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Load environment variables from ai/.env
# ─────────────────────────────────────────────────────────────────────────────
# This file must be run from the ai/ directory OR we compute the path relative
# to this script's location so it always works.
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(SCRIPT_DIR, ".env"))

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Fall back to anon key if service key not set yet (read-only mode — writes will fail)
SUPABASE_KEY = SUPABASE_SERVICE_KEY or os.getenv("SUPABASE_ANON_KEY", "")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Paths to model files  (ai/models/)
# ─────────────────────────────────────────────────────────────────────────────
MODELS_DIR          = os.path.join(SCRIPT_DIR, "models")
MODEL_PATH          = os.path.join(MODELS_DIR, "risk_model.pkl")
SCALER_PATH         = os.path.join(MODELS_DIR, "scaler.pkl")
FEATURES_PATH       = os.path.join(MODELS_DIR, "feature_columns.json")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Feature definitions (must match the training script exactly)
# ─────────────────────────────────────────────────────────────────────────────
META_FEATURES = ["goal", "backers_count", "converted_pledged_amount"]

LLM_FEATURES = [
    "problem_statement", "proof_of_capability", "idea_clarity",
    "differentiation", "gtm_strategy", "business_model",
    "vagueness", "credibility",
]

ENGINEERED_FEATURES = [
    "staff_pick", "prelaunch_activated", "video_present",
    "duration_days", "prep_time_days",
]

# ─────────────────────────────────────────────────────────────────────────────
# 4. LLM scoring prompt
# ─────────────────────────────────────────────────────────────────────────────
SCORING_PROMPT = """You are an expert venture capital analyst evaluating crowdfunding campaigns.
Analyze the campaign below and rate it on 8 dimensions from 1 (worst) to 10 (best).

Dimensions:
- problem_statement   : Does it clearly define a real, important problem?
- proof_of_capability : Does the team show evidence they can deliver (skills, prototypes, track record)?
- idea_clarity        : Is the product or service explained clearly and concisely?
- differentiation     : What makes this meaningfully different from existing solutions?
- gtm_strategy        : Is there a credible go-to-market or distribution strategy?
- business_model      : Is there a viable, sustainable way to make money?
- vagueness           : How vague or buzzword-heavy is the pitch? (1=very clear, 10=very vague)
- credibility         : Does the overall pitch feel trustworthy and professional?

Campaign Title    : {title}
Campaign Category : {category}
Campaign Description:
{description}

Respond with ONLY a valid JSON object. No markdown, no explanation, no extra text.
Example format:
{{"problem_statement": 7, "proof_of_capability": 5, "idea_clarity": 8, "differentiation": 6, "gtm_strategy": 4, "business_model": 7, "vagueness": 3, "credibility": 6}}"""


# ─────────────────────────────────────────────────────────────────────────────
# 5. LLM Clients
# ─────────────────────────────────────────────────────────────────────────────

def score_with_gemini(title: str, description: str, category: str) -> dict | None:
    """Call Gemini Flash and parse JSON response. Returns dict or None on failure."""
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = SCORING_PROMPT.format(
            title=title or "Untitled",
            description=(description or "No description provided.")[:3000],  # cap tokens
            category=category or "Other",
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        # Strip markdown code fences if present (```json ... ```)
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        scores = json.loads(raw)
        # Validate — all 8 keys must be present and numeric
        for key in LLM_FEATURES:
            if key not in scores:
                raise ValueError(f"Missing key: {key}")
            scores[key] = float(scores[key])
        print(f"  [OK] Gemini scored: {scores}")
        return scores
    except Exception as e:
        print(f"  [WARN] Gemini failed: {e}")
        return None


def score_with_groq(title: str, description: str, category: str) -> dict | None:
    """Call Groq (Llama 3.3) and parse JSON response. Returns dict or None on failure."""
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        prompt = SCORING_PROMPT.format(
            title=title or "Untitled",
            description=(description or "No description provided.")[:3000],
            category=category or "Other",
        )
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # low temperature = more consistent JSON
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"```json\s*|\s*```", "", raw).strip()
        scores = json.loads(raw)
        for key in LLM_FEATURES:
            if key not in scores:
                raise ValueError(f"Missing key: {key}")
            scores[key] = float(scores[key])
        print(f"  [OK] Groq scored: {scores}")
        return scores
    except Exception as e:
        print(f"  [WARN] Groq failed: {e}")
        return None


def get_llm_scores(title: str, description: str, category: str) -> dict:
    """
    3-tier fallback:
      1. Gemini Flash (free, primary)
      2. Groq Llama 3.3 (free, backup)
      3. Neutral defaults 5.0 (last resort)
    """
    # Attempt 1: Gemini
    if GEMINI_API_KEY:
        scores = score_with_gemini(title, description, category)
        if scores:
            return scores

    # Attempt 2: Groq
    if GROQ_API_KEY:
        scores = score_with_groq(title, description, category)
        if scores:
            return scores

    # Attempt 3: Defaults
    print("  [WARN] All LLMs unavailable - using neutral defaults (5.0)")
    return {k: 5.0 for k in LLM_FEATURES}


# ─────────────────────────────────────────────────────────────────────────────
# 6. Feature vector builder
# ─────────────────────────────────────────────────────────────────────────────

def build_feature_vector(campaign: dict, llm_scores: dict, all_feature_cols: list) -> pd.DataFrame:
    """
    Builds a single-row DataFrame with the exact 165 columns the model expects.
    Columns that don't apply to a new campaign are set to 0.
    """
    row = {}

    # --- Meta features ---
    # goal: use funding_goal (stored as string ETH on your platform, but the
    # model was trained on Kickstarter USD goals. We'll treat ETH as-is; the
    # model still learns relative magnitudes).
    row["goal"]                     = float(campaign.get("funding_goal") or 0)
    row["backers_count"]            = 0   # new campaigns have no backers yet
    row["converted_pledged_amount"] = 0   # no pledges yet

    # --- LLM sub-scores ---
    for key in LLM_FEATURES:
        row[key] = llm_scores.get(key, 5.0)

    # --- Engineered features ---
    row["staff_pick"]          = 0   # platform campaigns aren't Kickstarter staff picks
    row["prelaunch_activated"] = 0
    # video_present: 1 if campaign has a product demo URL
    has_video = bool(campaign.get("product_demo_url") or campaign.get("video"))
    row["video_present"]       = 1 if has_video else 0
    # duration_days: stored directly in campaigns table
    row["duration_days"]       = float(campaign.get("duration") or 30)
    # prep_time_days: days between created_at and now (scoring time)
    created_at_str = campaign.get("created_at")
    if created_at_str:
        try:
            from datetime import datetime, timezone
            created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            row["prep_time_days"] = max(0.0, (now - created_at).total_seconds() / 86400)
        except Exception:
            row["prep_time_days"] = 7.0
    else:
        row["prep_time_days"] = 7.0

    # --- Category one-hot encoding ---
    # Map platform category to the Kickstarter naming convention the model knows
    campaign_category = (campaign.get("category") or "Other").strip()
    cat_col = f"clean_category_{campaign_category}"

    # Set all category columns to 0 first
    for col in all_feature_cols:
        if col.startswith("clean_category_"):
            row[col] = 0

    # Set the matching category column to 1 (if the model knows this category)
    if cat_col in all_feature_cols:
        row[cat_col] = 1
    else:
        # Unknown category — leave all category cols at 0
        # (model will rely on other features)
        print(f"  [INFO] Category '{campaign_category}' not in training set. Using 'Other'.")

    # Build DataFrame with exactly the columns the model expects, in order
    df = pd.DataFrame([row])
    df = df.reindex(columns=all_feature_cols, fill_value=0)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 7. Main scoring pipeline
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="FundXProut AI Risk Scorer")
    parser.add_argument("--test", action="store_true",
                        help="Score only the first unscored campaign (for testing)")
    parser.add_argument("--all", action="store_true",
                        help="Re-score ALL campaigns, even those already scored")
    args = parser.parse_args()

    # ── Validate env vars ────────────────────────────────────────────────────
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in ai/.env")
        print("   Get service_role key from: Supabase Dashboard → Settings → API")
        sys.exit(1)

    if not GEMINI_API_KEY and not GROQ_API_KEY:
        print("[WARN] WARNING: No LLM API keys found. Will use default scores (5.0).")

    # ── Load model files ─────────────────────────────────────────────────────
    print("\n[*] Loading model files...")
    if not os.path.exists(MODEL_PATH):
        print(f"[ERROR] risk_model.pkl not found at {MODEL_PATH}")
        sys.exit(1)

    model           = joblib.load(MODEL_PATH)
    scaler          = joblib.load(SCALER_PATH)
    feature_cols    = json.load(open(FEATURES_PATH))
    print(f"   [OK] Model loaded - expects {len(feature_cols)} features")

    # ── Connect to Supabase ───────────────────────────────────────────────────
    print("\n[*] Connecting to Supabase...")
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Fetch campaigns to score ──────────────────────────────────────────────
    print("\n[*] Fetching campaigns from Supabase...")
    # Select both base LLM columns (from edge function) AND meta/engineered fields
    query = supabase.table("campaigns").select(
        "id, title, description, category, funding_goal, duration, "
        "created_at, product_demo_url, risk_score, "
        "problem_statement, proof_of_capability, idea_clarity, "
        "differentiation, gtm_strategy, business_model, vagueness, credibility"
    )

    if not args.all:
        # Default: only campaigns without a risk score
        query = query.is_("risk_score", "null")

    response = query.execute()
    campaigns = response.data

    if not campaigns:
        print("[OK] No campaigns need scoring. All done!")
        return

    if args.test:
        campaigns = campaigns[:1]   # only score 1 for testing
        print("[TEST MODE] Scoring 1 campaign only")

    print(f"   Found {len(campaigns)} campaign(s) to score\n")
    print("=" * 60)

    # ── Score each campaign ───────────────────────────────────────────────────
    success_count = 0
    fail_count    = 0

    for i, campaign in enumerate(campaigns, 1):
        cid   = str(campaign["id"])
        title = campaign.get("title") or "Untitled"
        print(f"\n[{i}/{len(campaigns)}] Scoring: \"{title}\" (id: {cid[:8]}...)")

        try:
            # Step A: Get LLM scores
            # Priority: 1) existing edge-function scores, 2) Gemini, 3) defaults
            existing = {
                k: campaign.get(k)
                for k in LLM_FEATURES
            }
            has_existing = all(existing.get(k) is not None for k in LLM_FEATURES)

            if has_existing:
                llm_scores = {k: float(existing[k]) for k in LLM_FEATURES}
                print(f"  [OK] Using existing edge-function scores: {llm_scores}")
            else:
                print("  [LLM] Base scores null - calling Gemini/Groq...")
                llm_scores = get_llm_scores(
                    title       = title,
                    description = campaign.get("description") or "",
                    category    = campaign.get("category") or "Other",
                )

            # Step B: Build feature vector
            X = build_feature_vector(campaign, llm_scores, feature_cols)

            # Step C: Scale + predict
            X_scaled    = scaler.transform(X)
            prob_success = model.predict_proba(X_scaled)[0][1]   # probability of success
            risk_score   = round((1 - prob_success) * 10, 4)     # higher = riskier

            print(f"  [DATA] Risk Score: {risk_score:.2f}/10  "
                  f"({'Low' if risk_score < 4 else 'Medium' if risk_score < 7 else 'High'} Risk)")

            # Step D: Write back to Supabase
            update_payload = {
                "risk_score":       risk_score,
                # ai_prep_time_days is the only engineered feature with no
                # existing equivalent column in the table
                "ai_prep_time_days": float(X["prep_time_days"].iloc[0]),
            }

            # If base LLM columns were null (edge function didn't run),
            # write our Gemini scores to the canonical base columns too
            if not has_existing:
                update_payload.update({
                    "problem_statement":   llm_scores["problem_statement"],
                    "proof_of_capability": llm_scores["proof_of_capability"],
                    "idea_clarity":        llm_scores["idea_clarity"],
                    "differentiation":     llm_scores["differentiation"],
                    "gtm_strategy":        llm_scores["gtm_strategy"],
                    "business_model":      llm_scores["business_model"],
                    "vagueness":           llm_scores["vagueness"],
                    "credibility":         llm_scores["credibility"],
                })

            supabase.table("campaigns").update(update_payload).eq("id", cid).execute()
            print("  [OK] Saved to Supabase")
            success_count += 1

        except Exception as e:
            print(f"  [FAIL] Failed to score campaign {cid[:8]}: {e}")
            fail_count += 1

        # Respect Gemini free tier rate limit (~15 RPM)
        if i < len(campaigns):
            time.sleep(4)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"[DONE] Scored {success_count} campaign(s). Failed: {fail_count}")
    if fail_count > 0:
        print("   Failed campaigns still have risk_score = null in Supabase.")
        print("   Re-run the script to retry them.")


if __name__ == "__main__":
    main()
