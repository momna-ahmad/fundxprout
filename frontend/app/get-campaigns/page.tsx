"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getAllCampaigns, type Campaign } from "@/lib/getCampaigns";

// ── Helpers ───────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  technology: { bg: "#e8f4ff", text: "#1a6dd4", dot: "#3b9eff" },
  environment: { bg: "#e6f9f0", text: "#1a7a4a", dot: "#2ec97a" },
  music:       { bg: "#fdf0ff", text: "#8b1acd", dot: "#c44dff" },
  health:      { bg: "#fff0f3", text: "#c41a3d", dot: "#ff4d72" },
  games:       { bg: "#fff8e6", text: "#c47a00", dot: "#ffb830" },
  food:        { bg: "#fff3ec", text: "#c45a1a", dot: "#ff8040" },
  art:         { bg: "#f0f0ff", text: "#4040c4", dot: "#7070ff" },
  film:        { bg: "#f5f5f5", text: "#444",    dot: "#888"    },
  fashion:     { bg: "#fff0f8", text: "#c41a7a", dot: "#ff4db8" },
  education:   { bg: "#f0faff", text: "#1a8cb8", dot: "#40c0f0" },
};

const CARD_GRADIENTS = [
  "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)",
  "linear-gradient(135deg,#1a2e1a 0%,#0f3a1a 50%,#0a4a20 100%)",
  "linear-gradient(135deg,#2e1a2e 0%,#3a0f3a 50%,#4a0a50 100%)",
  "linear-gradient(135deg,#2e1a1a 0%,#3a0f1a 50%,#500a20 100%)",
  "linear-gradient(135deg,#2e2a1a 0%,#3a320f 50%,#4a400a 100%)",
  "linear-gradient(135deg,#1a2a2e 0%,#0f3238 50%,#0a4050 100%)",
];

function daysLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function progressPct(raised: string, goal: string) {
  const pct = (parseFloat(raised) / parseFloat(goal)) * 100;
  return Math.min(pct, 100);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Campaign | null>(null);

  useEffect(() => {
    getAllCampaigns().then(({ data, error }) => {
      if (error) setFetchError(error);
      else setCampaigns(data ?? []);
      setLoading(false);
    });
  }, []);

  const categories = ["all", ...Array.from(new Set(campaigns.map((c) => c.category)))];

  const filtered = campaigns.filter((c) => {
    const matchCat    = filter === "all" || c.category === filter;
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalRaised = campaigns
    .reduce((a, c) => a + parseFloat(c.amount_raised || "0"), 0)
    .toFixed(2);

  const avgFunded =
    campaigns.length === 0
      ? 0
      : Math.round(
          campaigns.reduce(
            (a, c) => a + progressPct(c.amount_raised || "0", c.goal),
            0
          ) / campaigns.length
        );

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        onBack={() => setSelected(null)}
        gradientIndex={campaigns.indexOf(selected) % CARD_GRADIENTS.length}
      />
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.headerEyebrow}>BLOCKCHAIN FUNDING</div>
            <h1 style={styles.headerTitle}>Active Campaigns</h1>
            <p style={styles.headerSub}>
              Invest in tomorrow's breakthroughs — powered by Ethereum.
            </p>
          </div>
          <div style={styles.statsRow}>
            <Stat label="Live Campaigns" value={campaigns.length} />
            <Stat label="Total Raised"   value={`${totalRaised} ETH`} />
            <Stat label="Avg. Funded"    value={`${avgFunded}%`} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          style={styles.searchInput}
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={styles.filterRow}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{ ...styles.filterBtn, ...(filter === cat ? styles.filterBtnActive : {}) }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <div style={styles.stateBox}>
          <div style={styles.spinner} />
          <p style={styles.stateText}>Loading campaigns from Supabase…</p>
        </div>
      )}

      {fetchError && (
        <div style={styles.errorBanner}>
          ⚠️ Could not load campaigns: {fetchError}
        </div>
      )}

      {/* Grid */}
      {!loading && !fetchError && (
        <div style={styles.grid}>
          {filtered.map((c, i) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div style={styles.empty}>No campaigns match your search.</div>
      )}
    </div>
  );
}

// ── Stat badge ─────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

// ── Campaign Card ──────────────────────────────────────────────────────────────
function CampaignCard({
  campaign,
  gradient,
  onClick,
}: {
  campaign: Campaign;
  gradient: string;
  onClick: () => void;
}) {
  const pct      = progressPct(campaign.amount_raised || "0", campaign.goal);
  const days     = daysLeft(campaign.deadline);
  const catStyle = CATEGORY_COLORS[campaign.category] ?? CATEGORY_COLORS.art;
  const urgent   = days <= 7 && days > 0;

  const bannerStyle: React.CSSProperties = campaign.image_url
    ? { backgroundImage: `url(${campaign.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: gradient };

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={{ ...styles.cardBanner, ...bannerStyle }}>
        <div style={styles.cardBannerOverlay} />
        <span style={{ ...styles.categoryTag, background: catStyle.bg, color: catStyle.text }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: catStyle.dot, display: "inline-block", marginRight: 5 }} />
          {campaign.category}
        </span>
        {urgent   && <span style={styles.urgentTag}>⚡ {days}d left</span>}
        {days === 0 && <span style={styles.endedTag}>Ended</span>}
      </div>

      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{campaign.title}</h3>
        <p style={styles.cardDesc}>{campaign.description}</p>

        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressBar,
              width: `${pct}%`,
              background: pct >= 100
                ? "linear-gradient(90deg,#2ec97a,#00ffaa)"
                : "linear-gradient(90deg,#f6851b,#ffb347)",
            }} />
          </div>
          <div style={styles.progressMeta}>
            <span style={styles.raisedText}><b>{campaign.amount_raised} ETH</b> raised</span>
            <span style={styles.pctText}>{Math.round(pct)}%</span>
          </div>
        </div>

        <div style={styles.cardFooter}>
          <div style={styles.footerStat}>
            <span style={styles.footerStatVal}>{campaign.goal} ETH</span>
            <span style={styles.footerStatLbl}>Goal</span>
          </div>
          <div style={styles.footerStat}>
            <span style={styles.footerStatVal}>{days > 0 ? `${days}d` : "—"}</span>
            <span style={styles.footerStatLbl}>Remaining</span>
          </div>
          <button style={styles.viewBtn}>View →</button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Detail ────────────────────────────────────────────────────────────
function CampaignDetail({
  campaign,
  onBack,
  gradientIndex,
}: {
  campaign: Campaign;
  onBack: () => void;
  gradientIndex: number;
}) {
  const [amount, setAmount]     = useState("");
  const [status, setStatus]     = useState<null | "pending" | "success" | "error">(null);
  const [txHash, setTxHash]     = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const pct      = progressPct(campaign.amount_raised || "0", campaign.goal);
  const days     = daysLeft(campaign.deadline);
  const catStyle = CATEGORY_COLORS[campaign.category] ?? CATEGORY_COLORS.art;

  const heroStyle: React.CSSProperties = campaign.image_url
    ? { backgroundImage: `url(${campaign.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: CARD_GRADIENTS[gradientIndex] };

  async function handleFund() {
    if (!amount || parseFloat(amount) <= 0) { setErrorMsg("Enter a valid ETH amount."); return; }
    setErrorMsg("");
    setStatus("pending");

    try {
      if (!window.ethereum) throw new Error("MetaMask not installed.");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const network  = await provider.getNetwork();

      if (network.chainId !== BigInt(11155111))
        throw new Error("Please switch MetaMask to Sepolia Testnet.");

      const abi      = ["function contribute() external payable"];
      const contract = new ethers.Contract(campaign.contract_address, abi, signer);

      const tx      = await contract.contribute({ value: ethers.parseEther(amount), gasLimit: 100000 });
      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Transaction failed.");
      setStatus("error");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.backRow}>
        <button onClick={onBack} style={styles.backBtn}>← Back to Campaigns</button>
      </div>

      <div style={styles.detailWrap}>
        {/* Hero */}
        <div style={{ ...styles.detailHero, ...heroStyle }}>
          <div style={styles.detailHeroOverlay} />
          <div style={styles.detailHeroContent}>
            <span style={{ ...styles.categoryTag, background: catStyle.bg, color: catStyle.text, fontSize: 13 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: catStyle.dot, display: "inline-block", marginRight: 6 }} />
              {campaign.category}
            </span>
            <h1 style={styles.detailTitle}>{campaign.title}</h1>
          </div>
        </div>

        {/* Two columns */}
        <div style={styles.detailCols}>
          {/* Left */}
          <div style={styles.detailLeft}>
            <h2 style={styles.detailSectionHead}>About this Campaign</h2>
            <p style={styles.detailDesc}>{campaign.description}</p>

            <div style={styles.metaGrid}>
              <MetaItem label="Funding Goal"    value={`${campaign.goal} ETH`}             icon="🎯" />
              <MetaItem label="Amount Raised"   value={`${campaign.amount_raised} ETH`}    icon="💰" />
              <MetaItem label="Days Remaining"  value={days > 0 ? `${days} days` : "Ended"} icon="⏱" />
              <MetaItem label="Token Price"     value={`${campaign.price_per_token} ETH`}  icon="🪙" />
              <MetaItem label="Duration"        value={`${campaign.duration} days`}         icon="📅" />
              <MetaItem label="Category"        value={campaign.category}                   icon="🏷" />
            </div>

            {/* Progress */}
            <div style={{ marginTop: 28 }}>
              <div style={styles.progressHeader}>
                <span style={styles.raisedText}>
                  <b>{campaign.amount_raised} ETH</b> of <b>{campaign.goal} ETH</b>
                </span>
                <span style={{ ...styles.pctText, fontSize: 18, fontWeight: 700 }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ ...styles.progressTrack, height: 12, marginTop: 8 }}>
                <div style={{
                  ...styles.progressBar,
                  width: `${pct}%`,
                  background: pct >= 100 ? "linear-gradient(90deg,#2ec97a,#00ffaa)" : "linear-gradient(90deg,#f6851b,#ffb347)",
                  height: 12, borderRadius: 6,
                }} />
              </div>
            </div>

            <div style={styles.txRow}>
              <span style={styles.txLabel}>Deployment TX:</span>
              <a href={`https://sepolia.etherscan.io/tx/${campaign.tx_hash}`} target="_blank" rel="noreferrer" style={styles.txLink}>
                {campaign.tx_hash?.slice(0, 22)}…
              </a>
            </div>
          </div>

          {/* Right: Fund Card */}
          <div style={styles.detailRight}>
            <div style={styles.fundCard}>
              <h3 style={styles.fundCardTitle}>Fund this Campaign</h3>
              <p style={styles.fundCardSub}>Contribute ETH directly to the smart contract on Sepolia.</p>

              <label style={styles.inputLabel}>Amount (ETH)</label>
              <div style={styles.inputRow}>
                <span style={styles.inputPrefix}>Ξ</span>
                <input
                  type="number" min="0" step="0.001" placeholder="0.00"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  style={styles.amountInput}
                />
              </div>

              <div style={styles.quickRow}>
                {["0.01", "0.05", "0.1", "0.5"].map((v) => (
                  <button key={v} onClick={() => setAmount(v)}
                    style={{ ...styles.quickBtn, ...(amount === v ? styles.quickBtnActive : {}) }}>
                    Ξ {v}
                  </button>
                ))}
              </div>

              {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

              {status === "success" && (
                <div style={styles.successBox}>
                  ✅ Transaction confirmed!<br />
                  <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer"
                    style={{ color: "#1a7a4a", fontSize: 12 }}>View on Etherscan →</a>
                </div>
              )}

              <button onClick={handleFund}
                disabled={status === "pending" || days === 0}
                style={{
                  ...styles.fundBtn,
                  ...(status === "pending" ? styles.fundBtnPending : {}),
                  ...(days === 0 ? styles.fundBtnDisabled : {}),
                }}>
                {status === "pending" ? "⏳ Awaiting MetaMask…" : days === 0 ? "Campaign Ended" : <><span style={{ fontSize: 18 }}>⟠</span> Fund via MetaMask</>}
              </button>

              <p style={styles.disclaimer}>
                Transactions run on Ethereum Sepolia testnet. Ensure MetaMask is on Sepolia before funding.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={styles.metaItem}>
      <span style={styles.metaIcon}>{icon}</span>
      <div>
        <div style={styles.metaLabel}>{label}</div>
        <div style={styles.metaValue}>{value}</div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page:            { minHeight: "100vh", background: "#FFEEE0", fontFamily: "'Georgia','Times New Roman',serif", paddingBottom: 60 },
  header:          { background: "#1a1a1a", color: "#fff", padding: "48px 24px 40px" },
  headerInner:     { maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 24 },
  headerEyebrow:   { fontSize: 11, letterSpacing: 3, color: "#f6851b", fontFamily: "monospace", marginBottom: 8 },
  headerTitle:     { fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: -1, fontFamily: "'Georgia',serif" },
  headerSub:       { color: "#aaa", marginTop: 8, fontSize: 15 },
  statsRow:        { display: "flex", gap: 32 },
  stat:            { textAlign: "right" },
  statValue:       { fontSize: 22, fontWeight: 700, color: "#f6851b", fontFamily: "monospace" },
  statLabel:       { fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  controls:        { maxWidth: 1200, margin: "0 auto", padding: "28px 24px 0" },
  searchInput:     { width: "100%", padding: "12px 18px", fontSize: 15, border: "2px solid #e0d0c4", borderRadius: 10, background: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" },
  filterRow:       { display: "flex", gap: 8, flexWrap: "wrap" },
  filterBtn:       { padding: "6px 16px", borderRadius: 20, border: "1.5px solid #d0c0b0", background: "transparent", cursor: "pointer", fontSize: 13, color: "#666", fontFamily: "inherit" },
  filterBtnActive: { background: "#1a1a1a", color: "#fff", borderColor: "#1a1a1a" },
  stateBox:        { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 16 },
  spinner:         { width: 36, height: 36, border: "3px solid #f0e0d0", borderTop: "3px solid #f6851b", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  stateText:       { color: "#888", fontSize: 15 },
  errorBanner:     { maxWidth: 1200, margin: "24px auto", padding: "14px 24px", background: "#fff0f0", border: "1px solid #fcc", borderRadius: 10, color: "#c00", fontSize: 14 },
  grid:            { maxWidth: 1200, margin: "28px auto 0", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 24 },
  card:            { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer", border: "1px solid #f0e0d0" },
  cardBanner:      { height: 160, position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 16px 14px" },
  cardBannerOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)" },
  categoryTag:     { position: "relative", zIndex: 2, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, letterSpacing: 0.5, display: "flex", alignItems: "center", textTransform: "capitalize" },
  urgentTag:       { position: "relative", zIndex: 2, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#fff3cd", color: "#856404" },
  endedTag:        { position: "relative", zIndex: 2, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "#f8d7da", color: "#721c24" },
  cardBody:        { padding: "18px 20px 20px" },
  cardTitle:       { fontSize: 17, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px", fontFamily: "'Georgia',serif" },
  cardDesc:        { fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  progressWrap:    { marginBottom: 16 },
  progressTrack:   { height: 6, background: "#f0e8e0", borderRadius: 3, overflow: "hidden" },
  progressBar:     { height: "100%", borderRadius: 3 },
  progressMeta:    { display: "flex", justifyContent: "space-between", marginTop: 6 },
  raisedText:      { fontSize: 12, color: "#555" },
  pctText:         { fontSize: 12, color: "#f6851b", fontWeight: 600 },
  cardFooter:      { display: "flex", alignItems: "center", gap: 16, paddingTop: 14, borderTop: "1px solid #f5ece4" },
  footerStat:      { display: "flex", flexDirection: "column" },
  footerStatVal:   { fontSize: 14, fontWeight: 700, color: "#1a1a1a" },
  footerStatLbl:   { fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 },
  viewBtn:         { marginLeft: "auto", padding: "8px 18px", background: "#f6851b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" },
  empty:           { textAlign: "center", color: "#999", padding: 60, fontSize: 16 },
  backRow:         { maxWidth: 1100, margin: "0 auto", padding: "20px 24px 0" },
  backBtn:         { background: "transparent", border: "none", cursor: "pointer", color: "#555", fontSize: 14, fontFamily: "inherit", padding: 0, fontWeight: 600 },
  detailWrap:      { maxWidth: 1100, margin: "16px auto 0", padding: "0 24px" },
  detailHero:      { borderRadius: 20, height: 280, position: "relative", display: "flex", alignItems: "flex-end", padding: 32, overflow: "hidden" },
  detailHeroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 60%)" },
  detailHeroContent: { position: "relative", zIndex: 2 },
  detailTitle:     { fontSize: 36, fontWeight: 700, color: "#fff", margin: "10px 0 0", fontFamily: "'Georgia',serif", letterSpacing: -0.5 },
  detailCols:      { display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, marginTop: 28, alignItems: "start" },
  detailLeft:      { background: "#fff", borderRadius: 16, padding: "28px 32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  detailSectionHead: { fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 14px", fontFamily: "'Georgia',serif" },
  detailDesc:      { fontSize: 15, color: "#444", lineHeight: 1.75, margin: "0 0 24px" },
  metaGrid:        { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  metaItem:        { display: "flex", gap: 12, alignItems: "flex-start", background: "#faf6f2", borderRadius: 10, padding: "12px 14px" },
  metaIcon:        { fontSize: 20, lineHeight: 1, marginTop: 2 },
  metaLabel:       { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "monospace" },
  metaValue:       { fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginTop: 2, textTransform: "capitalize" },
  progressHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center" },
  txRow:           { marginTop: 20, display: "flex", alignItems: "center", gap: 8 },
  txLabel:         { fontSize: 12, color: "#999", fontFamily: "monospace" },
  txLink:          { fontSize: 12, color: "#f6851b", fontFamily: "monospace", textDecoration: "none" },
  detailRight:     { position: "sticky", top: 20 },
  fundCard:        { background: "#fff", borderRadius: 16, padding: "28px 24px", boxShadow: "0 2px 20px rgba(0,0,0,0.1)", border: "1px solid #f0e0d0" },
  fundCardTitle:   { fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "#1a1a1a", fontFamily: "'Georgia',serif" },
  fundCardSub:     { fontSize: 13, color: "#888", margin: "0 0 22px", lineHeight: 1.5 },
  inputLabel:      { fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8, fontFamily: "monospace" },
  inputRow:        { display: "flex", alignItems: "center", border: "2px solid #e0d0c4", borderRadius: 10, overflow: "hidden", marginBottom: 14 },
  inputPrefix:     { padding: "12px 14px", background: "#faf6f2", color: "#f6851b", fontSize: 18, fontWeight: 700, borderRight: "2px solid #e0d0c4" },
  amountInput:     { flex: 1, border: "none", outline: "none", padding: "12px 14px", fontSize: 18, fontFamily: "monospace", fontWeight: 600, color: "#1a1a1a" },
  quickRow:        { display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  quickBtn:        { flex: 1, padding: "7px 4px", border: "1.5px solid #e0d0c4", borderRadius: 8, background: "#faf6f2", cursor: "pointer", fontSize: 12, fontFamily: "monospace", fontWeight: 600, color: "#555", minWidth: 60 },
  quickBtnActive:  { background: "#f6851b", color: "#fff", borderColor: "#f6851b" },
  errorBox:        { background: "#fff0f0", border: "1px solid #fcc", color: "#c00", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 },
  successBox:      { background: "#e6f9f0", border: "1px solid #b8eacc", color: "#1a7a4a", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, lineHeight: 1.6 },
  fundBtn:         { width: "100%", padding: 14, background: "linear-gradient(135deg,#f6851b,#e57a1a)", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 16, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(246,133,27,0.35)" },
  fundBtnPending:  { background: "#ccc", boxShadow: "none", cursor: "not-allowed" },
  fundBtnDisabled: { background: "#e0e0e0", color: "#999", boxShadow: "none", cursor: "not-allowed" },
  disclaimer:      { fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 14, lineHeight: 1.5 },
};