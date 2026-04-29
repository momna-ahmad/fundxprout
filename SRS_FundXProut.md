# SOFTWARE REQUIREMENTS SPECIFICATION
## FundXProut — Blockchain-Based Equity Crowdfunding Platform

**Version:** 1.0  
**Date:** 27 April 2026  
**Prepared By:** FundXProut Development Team  
**Status:** Draft

---

## Revision History

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 27/04/2026 | 1.0 | Initial SRS draft | FundXProut Team |
| | | | |
| | | | |

---

## Table of Contents

1. Introduction
   - 1.1 Purpose
   - 1.2 Scope
   - 1.3 Definitions and Acronyms
2. System Overview
3. User Roles and Characteristics
4. Functional Requirements
   - FR01: User Registration and Authentication
   - FR02: Role Selection and Profile Initialization
   - FR03: Business Owner — Campaign Creation
   - FR04: Business Owner — Campaign Management Dashboard
   - FR05: Business Owner — Profile Management
   - FR06: Investor — Browse Campaigns
   - FR07: Investor — Campaign Detail and Investment
   - FR08: Investor — Portfolio Dashboard Overview
   - FR09: Investor — Token Holdings
   - FR10: Investor — Token Marketplace
   - FR11: Investor — Transaction History
   - FR12: Investor — Profile and Settings
   - FR13: AI Risk Assessment
   - FR14: Blockchain and Wallet Integration
   - FR15: Document Management (IPFS)
   - FR16: KYC Verification
   - FR17: Notification System *(Planned)*
   - FR18: Admin Panel *(Planned)*
   - FR19: Campaign Updates and Milestones *(Planned)*
   - FR20: Fund Withdrawal and Payout *(Planned)*
   - FR21: Revenue Sharing and Dividends *(Planned)*
   - FR22: Secondary Token Market — On-Chain Trading *(Planned)*
   - FR23: Reporting and Analytics *(Planned)*
   - FR24: Governance and Voting *(Planned)*
5. Non-Functional Requirements
6. Assumptions and Constraints
7. Glossary
8. References

---

## 1. Introduction

FundXProut is a blockchain-based equity crowdfunding platform built on the Ethereum Sepolia testnet. The platform enables small and medium-sized businesses to raise capital by issuing equity tokens to investors. Investors browse, evaluate, and invest in campaigns, receiving tokenised ownership in exchange. The platform uses AI to assess campaign risk, IPFS/Pinata for tamper-proof document storage, and Supabase for user data, authentication, and investment records.

### 1.1 Purpose

This Software Requirements Specification (SRS) describes all functional and non-functional requirements of FundXProut. It serves as the primary reference for developers, testers, and stakeholders throughout the project lifecycle. It covers both features that are already implemented and features that are planned but not yet built, clearly distinguishing between the two.

### 1.2 Scope

FundXProut consists of:

- A **Next.js 14** web application (App Router)
- **Supabase** for authentication, user profiles, campaign records, and investment records
- **Ethereum smart contracts** (Solidity) deployed on the **Sepolia testnet** for on-chain fund management and token issuance
- **Pinata/IPFS** for decentralised document and media storage
- An **AI risk assessment** service that evaluates campaign viability from submitted documents
- A **MetaMask**-based wallet integration for all blockchain interactions

The system has two primary user roles: **Business Owner** (campaign creator) and **Investor** (capital provider). A third role, **Platform Admin**, is planned for future implementation.

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|------------|
| Campaign | A fundraising initiative created by a Business Owner to raise ETH from investors |
| Equity Token | A blockchain token representing a fractional ownership share in a campaign/business |
| CID | Content Identifier — a unique hash assigned to files stored on IPFS |
| ETH | Ether, the native cryptocurrency of the Ethereum blockchain |
| KYC | Know Your Customer — identity verification process |
| IPFS | InterPlanetary File System — decentralised file storage network |
| Pinata | A pinning service that hosts files on IPFS and provides a public gateway |
| Smart Contract | Self-executing code deployed on the Ethereum blockchain |
| Sepolia | An Ethereum test network used for development and testing |
| MetaMask | A browser extension wallet for interacting with Ethereum |
| Supabase | Open-source Firebase alternative — provides PostgreSQL database and auth |
| SRS | Software Requirements Specification |
| UI | User Interface |
| CTA | Call to Action |
| AI | Artificial Intelligence |

---

## 2. System Overview

FundXProut operates as a two-sided marketplace:

**Business Owners** register, create a company profile, and submit campaign applications with supporting documents (pitch deck, business plan, financials, use-of-funds breakdown, and optionally a product demo). Once submitted, documents are uploaded to IPFS and an AI risk assessment is run. The owner reviews the risk report and, when ready, deploys a smart contract on Sepolia by clicking "Launch". The contract mints 1,000 equity tokens priced at `goal / 1000` ETH each. The campaign becomes publicly visible to investors.

**Investors** register, browse active campaigns, read AI risk reports, and invest ETH directly from their MetaMask wallet. On investment the smart contract transfers equity tokens to the investor's address and the transaction is recorded in Supabase. Investors manage their portfolio, view their token holdings, and trade tokens on the marketplace.

The platform dashboard for each role is separate:
- Business Owners → `/dashboard`
- Investors → `/investor-dashboard/*`

---

## 3. User Roles and Characteristics

| User | Computer Knowledge | Domain Knowledge | Frequency of Use |
|------|--------------------|-----------------|-----------------|
| Business Owner | Intermediate to Advanced — comfortable with web forms, MetaMask wallet | Understanding of business finance, fundraising concepts | During campaign creation, then periodically to monitor progress |
| Investor | Intermediate — comfortable with crypto wallets and DeFi concepts | Basic to advanced knowledge of investment and blockchain | Regularly during research, investment, and portfolio monitoring |
| Platform Admin *(Planned)* | Advanced | Full platform operational knowledge | Daily |

---

## 4. Functional Requirements

> **Status Legend:**
> - **[Implemented]** — feature is built and functional in the current codebase
> - **[Partial]** — feature exists but uses mock/static data or is incomplete
> - **[Planned]** — feature is required but not yet implemented

---

### FR01: User Registration and Authentication

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR01-01 | The system shall allow a new user to register with a valid email address and password. The system shall validate that the password meets minimum security requirements (at least 8 characters). | Implemented |
| FR01-02 | The system shall allow a user to sign in using their registered email and password. | Implemented |
| FR01-03 | The system shall allow a user to sign in using their Google account via OAuth 2.0 (Google Sign-In). | Implemented |
| FR01-04 | The system shall redirect authenticated users to a role-selection page if no role has been assigned to their account yet. | Implemented |
| FR01-05 | The system shall prevent unauthenticated users from accessing any dashboard, campaign creation, or investment pages by redirecting them to the login page. | Implemented |
| FR01-06 | The system shall allow an authenticated user to sign out from any page. The system shall clear the session and redirect to the homepage. | Implemented |
| FR01-07 | The system shall allow a user to reset their password via a password-change form in the settings page that calls the Supabase Auth `updateUser` API. | Implemented |
| FR01-08 | The system shall handle the OAuth callback route and automatically create a profile row for the new user in the `profiles` table if one does not yet exist. | Implemented |
| FR01-09 | The system shall allow a logged-in user to change their password from the Settings page. The system shall validate that the new password and the confirmation match and are at least 8 characters long. | Implemented |
| FR01-10 | The system shall display an appropriate error message when login credentials are invalid. | Implemented |

---

### FR02: Role Selection and Profile Initialization

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR02-01 | The system shall present a new user with two role options upon first sign-in: **Business Owner** and **Investor**. | Implemented |
| FR02-02 | Once the user selects a role, the system shall persist that role in the `profiles` table in Supabase and in the Supabase Auth user metadata. | Implemented |
| FR02-03 | After role selection, the system shall redirect a Business Owner to `/dashboard` and an Investor to `/investor-dashboard/overview`. | Implemented |
| FR02-04 | The system shall not allow a user to access the role-selection page again once a role has already been assigned. Returning users with an existing role shall be redirected directly to their respective dashboard. | Implemented |
| FR02-05 | The system shall derive and store the user's display name from their Google metadata (if Google sign-in was used) or from their email prefix if no metadata name is present. | Implemented |

---

### FR03: Business Owner — Campaign Creation

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR03-01 | The system shall provide a campaign creation form at `/create-campaign` accessible only to Business Owners. | Implemented |
| FR03-02 | The system shall require the Business Owner to enter the following campaign fields: Campaign Title, Campaign Description, Funding Goal (in ETH), Campaign Duration (in days), and Campaign Category. | Implemented |
| FR03-03 | The system shall require the Business Owner to upload the following mandatory documents as PDF files before launching: Pitch Deck, Business Plan, Financial Projections (3–5 Years), and Use of Funds Breakdown. | Implemented |
| FR03-04 | The system shall allow the Business Owner to optionally upload a Product / Service Demo file (PDF or image). | Implemented |
| FR03-05 | The system shall upload each document to IPFS via the Pinata API and return a CID. The system shall store the CIDs in the campaign record in Supabase. | Implemented |
| FR03-06 | The system shall allow the Business Owner to save a campaign as a **Draft** without launching the smart contract. The draft shall be stored in Supabase with `status = 'draft'`. | Implemented |
| FR03-07 | The system shall allow the Business Owner to return to and edit any of their **Draft** campaigns before launching. The create-campaign form shall pre-populate with the saved draft data when an `idedit=true` query parameter is provided. | Implemented |
| FR03-08 | The system shall allow the Business Owner to **Launch** a campaign by deploying a `BusinessCampaign` smart contract on the Ethereum Sepolia testnet via the `CampaignFactory` contract. The system shall require MetaMask to be connected to Sepolia (Chain ID 11155111). | Implemented |
| FR03-09 | Upon successful contract deployment, the system shall save the contract address and transaction hash to the campaign record in Supabase and update the campaign status to `launched`. | Implemented |
| FR03-10 | The system shall automatically calculate the price per equity token as `funding_goal / 1000` and store it in the campaign record. | Implemented |
| FR03-11 | The system shall allow the Business Owner to upload a campaign cover image. The image shall be stored and its URL saved to the campaign record. | Implemented |
| FR03-12 | The system shall display an error message if the Business Owner attempts to launch a campaign without MetaMask installed or without being connected to the Sepolia network. | Implemented |
| FR03-13 | The system shall support the following campaign categories: Technology, Healthcare, Agriculture, Finance, Education, Retail, Real Estate, Energy, Entertainment, and Other. | Implemented |
| FR03-14 | The system shall allow the Business Owner to delete a Draft campaign from their dashboard. | Planned |
| FR03-15 | The system shall validate that the Funding Goal is a positive number greater than zero before allowing a launch. | Planned |
| FR03-16 | The system shall validate that the Campaign Duration is between 7 and 365 days. | Planned |

---

### FR04: Business Owner — Campaign Management Dashboard

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR04-01 | The system shall display a dashboard at `/dashboard` for Business Owners that shows a list of all campaigns they have created. | Implemented |
| FR04-02 | The dashboard shall display KPI summary cards showing: total campaigns created, total funds raised (ETH), total number of investors across all campaigns, and number of active campaigns. | Implemented |
| FR04-03 | The system shall display the status of each campaign (Draft, Launched, or Ended) with distinct visual indicators. | Implemented |
| FR04-04 | The system shall display a profile completion percentage bar based on how many profile fields the Business Owner has filled in. | Implemented |
| FR04-05 | The dashboard shall support pagination of the campaign list, showing 6 campaigns per page with Previous / Next navigation. | Implemented |
| FR04-06 | The system shall allow the Business Owner to search their campaigns by title. | Implemented |
| FR04-07 | The system shall display a Market Analytics section on the dashboard showing general market trends. | Implemented |
| FR04-08 | The system shall display the number of days remaining on each active campaign based on `created_at` plus the campaign duration. | Implemented |
| FR04-09 | The system shall display the total amount raised and investor count per campaign fetched from the `investments` table in real time. | Implemented |
| FR04-10 | The system shall provide a "View" link for each campaign that navigates to the public campaign detail page. | Implemented |
| FR04-11 | The system shall notify the Business Owner when a campaign has reached its funding goal. | Planned |
| FR04-12 | The system shall allow the Business Owner to mark a launched campaign as Ended/Closed once the funding period has expired or the goal is met. | Planned |
| FR04-13 | The system shall display a timeline of investor activity for each campaign (who invested and when). | Planned |

---

### FR05: Business Owner — Profile Management

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR05-01 | The system shall allow the Business Owner to view and update their profile fields: full name, display name, phone, country, bio, and website URL. | Implemented |
| FR05-02 | The system shall allow the Business Owner to upload KYC documents (Business Registration Certificate, Tax Certificate, Bank Statement) which shall be stored on IPFS and the CIDs saved to the `profiles` table. | Partial |
| FR05-03 | The system shall calculate and display a profile completion percentage based on the number of profile fields and KYC documents that have been provided. | Implemented |
| FR05-04 | The system shall allow the Business Owner to link their MetaMask wallet address to their profile. | Partial |
| FR05-05 | The system shall allow the Business Owner to upload a business logo. The URL shall be saved in the `business_logo_url` field. | Planned |
| FR05-06 | The system shall display the Business Owner's KYC status (Not Started / Pending / Verified) based on uploaded documents. | Partial |

---

### FR06: Investor — Browse Campaigns

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR06-01 | The system shall display all campaigns with `status = 'launched'` on the investor campaigns page at `/investor-dashboard/campaigns`. | Implemented |
| FR06-02 | The system shall display the following information for each campaign card: title, description excerpt, funding goal (ETH), amount pledged (ETH), percentage funded, number of investors, days remaining, category, and risk badge. | Implemented |
| FR06-03 | The system shall allow the investor to search campaigns by title. | Implemented |
| FR06-04 | The system shall support pagination of the campaign list, showing 9 campaigns per page. | Implemented |
| FR06-05 | The system shall display a risk level badge (Low / Medium / High / Critical) on each campaign card derived from the AI risk assessment score. | Implemented |
| FR06-06 | The system shall allow the investor to filter campaigns by category. | Planned |
| FR06-07 | The system shall allow the investor to sort campaigns by: newest, highest funded, most investors, and lowest risk score. | Planned |
| FR06-08 | The homepage at `/homepage` shall display featured campaigns (campaigns with images, newest first) in a dedicated section. | Implemented |
| FR06-09 | The homepage shall display a recommended campaigns section using a scoring algorithm that considers campaign recency and funding goal size. | Implemented |
| FR06-10 | The system shall display a category navigation bar on the public homepage allowing users to filter campaigns by industry. | Implemented |

---

### FR07: Investor — Campaign Detail and Investment

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR07-01 | The system shall display a full campaign detail page at `/campaigns/[id]` showing: title, description, cover image, funding goal, amount pledged, investor count, days remaining, price per token, category, and owner wallet address. | Implemented |
| FR07-02 | The system shall display links to all uploaded campaign documents (pitch deck, business plan, financials, use of funds, product demo) via the Pinata IPFS gateway. | Implemented |
| FR07-03 | The campaign detail page shall display the AI Risk Assessment panel, showing risk score, risk level, and assessments for: problem statement, proof of capability, idea clarity, differentiation, GTM strategy, business model, vagueness, and credibility. | Implemented |
| FR07-04 | The system shall allow an authenticated investor to open an "Invest" modal from the campaign detail page. | Implemented |
| FR07-05 | The investment modal shall require the investor to enter an investment amount in ETH. | Implemented |
| FR07-06 | The system shall validate that the investor's MetaMask wallet is connected and is on the Sepolia network (Chain ID 11155111) before allowing an investment. If not connected, the system shall prompt the investor to connect and switch networks. | Implemented |
| FR07-07 | Upon investment confirmation, the system shall call the `BusinessCampaign` smart contract's `invest()` function, sending ETH and receiving equity tokens in return. | Implemented |
| FR07-08 | The system shall record the completed investment in the Supabase `investments` table, storing: investor ID, campaign ID, amount (ETH), equity tokens received, token price at time of investment, transaction hash, and investor wallet address. | Implemented |
| FR07-09 | The system shall display a success confirmation with the transaction hash after a successful investment. | Implemented |
| FR07-10 | The system shall display an error message if the blockchain transaction fails or is rejected by the user. | Implemented |
| FR07-11 | The system shall display a back navigation link to return to the campaigns list. | Implemented |
| FR07-12 | The system shall display the total number of investors and total amount raised on the campaign detail page, fetched from the `investments` table. | Implemented |
| FR07-13 | The system shall prevent a Business Owner from investing in their own campaign. | Planned |
| FR07-14 | The system shall enforce a minimum investment amount (e.g., 0.001 ETH) and display a validation error if the entered amount is below the minimum. | Planned |
| FR07-15 | The system shall display a funding progress bar visually representing (amount pledged / funding goal) × 100%. | Implemented |

---

### FR08: Investor — Portfolio Dashboard Overview

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR08-01 | The investor overview page at `/investor-dashboard/overview` shall display KPI cards: Total Invested (ETH), Portfolio Value (ETH), Total Tokens Held, and Number of Investments. | Implemented |
| FR08-02 | The system shall display a portfolio value area chart over time showing growth trend. | Implemented |
| FR08-03 | The system shall display a portfolio allocation donut/pie chart showing the percentage of investment per campaign. | Implemented |
| FR08-04 | The overview page shall display only the campaigns in which the logged-in investor has personally invested, not all platform campaigns. | Implemented |
| FR08-05 | Each invested campaign card shall display: campaign title, amount invested, tokens received, current value (calculated from token price), and investment date. | Implemented |
| FR08-06 | The system shall display an empty state with a "Browse Campaigns" CTA link when the investor has not yet made any investments. | Implemented |
| FR08-07 | The system shall display a recent transactions section on the overview page. | Implemented |
| FR08-08 | The portfolio value calculation shall reflect real market token prices when a live price oracle is integrated. Currently displays a mock 12% appreciation over invested amount. | Partial |

---

### FR09: Investor — Token Holdings

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR09-01 | The system shall display a token holdings page at `/investor-dashboard/tokens` listing all equity tokens the investor holds, grouped by campaign. | Implemented |
| FR09-02 | Each token holding shall display: token name, symbol, balance (number of tokens), current price per token, total value, 24-hour price change, and a mini price-history chart. | Implemented |
| FR09-03 | The system shall display the total portfolio value in ETH across all token holdings. | Implemented |
| FR09-04 | The system shall display a holdings allocation pie chart. | Implemented |
| FR09-05 | The system shall link each token holding to the originating campaign detail page. | Planned |
| FR09-06 | The system shall display real-time token prices sourced from an on-chain price oracle when one is deployed. Currently uses mock price data. | Planned |
| FR09-07 | The system shall allow the investor to export their token holdings as a CSV file. | Planned |

---

### FR10: Investor — Token Marketplace

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR10-01 | The system shall provide a token marketplace page at `/investor-dashboard/marketplace` where investors can view available token listings. | Implemented (static) |
| FR10-02 | The marketplace shall display the following for each listing: token name, symbol, current price, 24-hour price change percentage, available amount, seller address (truncated), and expiry date. | Implemented (static) |
| FR10-03 | The marketplace shall display market statistics: 24-hour trading volume, total active listings, trades executed today, and average trade size. | Implemented (static) |
| FR10-04 | The marketplace shall provide a search bar to search listings by token name or symbol. | Implemented (static) |
| FR10-05 | The marketplace shall provide a filter dropdown to filter listings by industry/category. | Implemented (static) |
| FR10-06 | The marketplace shall provide a sort dropdown to sort listings by volume, price, or 24-hour change. | Implemented (static) |
| FR10-07 | The system shall allow an investor to open a Buy or Sell modal for any token listing. | Implemented (static) |
| FR10-08 | The Buy/Sell modal shall allow the investor to enter a quantity and display the estimated total in ETH. | Implemented (static) |
| FR10-09 | The system shall display a sample order book for a selected token showing bid and ask prices. | Implemented (static) |
| FR10-10 | The system shall display a recent trades feed showing the last completed trades with status indicators (completed, pending, failed). | Implemented (static) |
| FR10-11 | The system shall allow an investor to **list their equity tokens for sale** on the marketplace by specifying the token, quantity, and asking price. The listing shall be stored on-chain via a marketplace smart contract. | Planned |
| FR10-12 | The system shall execute a token trade on-chain when a buyer confirms a purchase. The smart contract shall transfer tokens from seller to buyer and ETH from buyer to seller. | Planned |
| FR10-13 | The system shall record every completed marketplace trade in the Supabase `transactions` table with: buyer ID, seller ID, token, amount, price, and transaction hash. | Planned |
| FR10-14 | The system shall allow a seller to cancel an active listing. | Planned |
| FR10-15 | The system shall enforce that only investors who hold a token can list it for sale, validating the balance on-chain before allowing a listing. | Planned |
| FR10-16 | The system shall display real live order book data pulled from the on-chain marketplace contract. | Planned |

---

### FR11: Investor — Transaction History

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR11-01 | The system shall display a transactions page at `/investor-dashboard/transactions` listing all investment transactions made by the logged-in investor. | Implemented |
| FR11-02 | Each transaction entry shall display: transaction date, campaign name, amount (ETH), number of tokens received, transaction hash, and status (completed / pending / failed). | Implemented |
| FR11-03 | The system shall provide a link for each transaction hash to the Sepolia block explorer (Etherscan) so the investor can verify the transaction on-chain. | Implemented |
| FR11-04 | The system shall support pagination or infinite scroll for investors with large transaction histories. | Partial |
| FR11-05 | The system shall allow the investor to filter transactions by date range, campaign, or status. | Planned |
| FR11-06 | The system shall allow the investor to export their transaction history as a CSV or PDF file. | Planned |
| FR11-07 | The system shall display marketplace trades (buy/sell) in the transaction history once the live marketplace is implemented. | Planned |

---

### FR12: Investor — Profile and Settings

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR12-01 | The system shall display a settings page at `/investor-dashboard/settings` where the investor can view and edit their profile information. | Implemented |
| FR12-02 | The system shall allow the investor to edit the following fields inline, with per-field save functionality: Full Name, Display Name, Bio, Phone Number, Country, and Website URL. | Implemented |
| FR12-03 | The system shall save updated profile fields to the `profiles` table in Supabase using an upsert operation on the `user_id` field. | Implemented |
| FR12-04 | The system shall display the investor's profile completion percentage based on how many key profile and KYC fields are filled in. | Implemented |
| FR12-05 | The system shall display an avatar with the investor's initials derived from their full name or email. | Implemented |
| FR12-06 | The system shall display the investor's KYC status (Not Started / Pending / Verified) derived from the presence of KYC document CIDs. | Implemented |
| FR12-07 | The system shall display the investor's tier (Retail / Accredited) based on their KYC status. | Implemented |
| FR12-08 | The system shall display the investor's connected MetaMask wallet address (live from WalletContext) with a copy-to-clipboard button. | Implemented |
| FR12-09 | The system shall display the wallet address saved to the investor's profile with a copy-to-clipboard button. | Implemented |
| FR12-10 | The system shall allow the investor to toggle notification preferences (Email Alerts, Investment Updates, Market Alerts, Security Notifications). Each toggle shall auto-save to the `notification_prefs` JSONB column in the `profiles` table. | Implemented |
| FR12-11 | The system shall allow the investor to change their account password from the Settings page via the Supabase Auth `updateUser` API. | Implemented |
| FR12-12 | The system shall allow the investor to upload KYC identity documents (National ID, Selfie, Proof of Address). The documents shall be uploaded to IPFS and the CIDs stored in the `profiles` table. | Planned |
| FR12-13 | The system shall allow the investor to upload a profile photo. | Planned |
| FR12-14 | The system shall display a Two-Factor Authentication (2FA) toggle under account security settings. | Partial |

---

### FR13: AI Risk Assessment

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR13-01 | The system shall automatically run an AI risk assessment on a campaign's documents (pitch deck, business plan, financials, use of funds) when the campaign is submitted. | Implemented |
| FR13-02 | The AI shall produce a numeric risk score and qualitative assessments across the following dimensions: Problem Statement, Proof of Capability, Idea Clarity, Differentiation, GTM Strategy, Business Model, Vagueness, and Credibility. | Implemented |
| FR13-03 | The system shall store the AI assessment results in the campaign record in Supabase: `risk_score`, `ai_prep_time_days`, and the individual dimension scores. | Implemented |
| FR13-04 | The system shall display the full AI Risk Assessment panel on the campaign detail page, visible to investors. | Implemented |
| FR13-05 | The system shall display a colour-coded Risk Badge on each campaign card in browse and overview views: Green (Low), Yellow (Medium), Orange (High), Red (Critical). | Implemented |
| FR13-06 | The system shall display a "Preparation time needed" estimate in days to indicate how long the Business Owner should refine the campaign before it is investment-ready. | Implemented |
| FR13-07 | The system shall allow the Business Owner to view the AI risk assessment results for their own campaigns on the dashboard. | Planned |
| FR13-08 | The system shall re-run the AI assessment when a Business Owner uploads revised documents to an existing draft campaign. | Planned |
| FR13-09 | The AI system shall flag campaigns as high-risk if any mandatory document is missing prior to launch attempt. | Planned |

---

### FR14: Blockchain and Wallet Integration

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR14-01 | The system shall integrate MetaMask as the primary wallet provider for all blockchain interactions. | Implemented |
| FR14-02 | The system shall expose a global `WalletContext` that provides: wallet address, network chain ID, connection status, and a `connectWallet` function. | Implemented |
| FR14-03 | The investor sidebar shall display the connected wallet address (truncated) and network status (Sepolia Connected / Wrong Network / Not Connected). | Implemented |
| FR14-04 | The system shall allow any page component to invoke `connectWallet()` to trigger MetaMask's account connection dialog. | Implemented |
| FR14-05 | The system shall detect and display a "Wrong Network" warning if the connected wallet is not on Sepolia (Chain ID 11155111). | Implemented |
| FR14-06 | The system shall provide a `switchToSepolia()` utility that automatically requests MetaMask to switch to or add the Sepolia network. | Implemented |
| FR14-07 | The system shall interact with the `CampaignFactory` smart contract to deploy individual `BusinessCampaign` contracts when a campaign is launched. | Implemented |
| FR14-08 | The system shall interact with deployed `BusinessCampaign` contracts to execute investments, transferring ETH and receiving equity tokens. | Implemented |
| FR14-09 | The system shall display the Etherscan transaction URL for every confirmed on-chain transaction. | Implemented |
| FR14-10 | The system shall support mainnet Ethereum deployment by changing the factory contract address and chain ID configuration. | Planned |
| FR14-11 | The system shall integrate a Marketplace smart contract to support peer-to-peer token trading. | Planned |
| FR14-12 | The system shall integrate a price oracle (e.g., Chainlink) to provide real-time token price feeds. | Planned |

---

### FR15: Document Management (IPFS)

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR15-01 | The system shall upload files to IPFS via the Pinata API at `/api/ipfs-upload`. | Implemented |
| FR15-02 | The system shall return the IPFS CID of the uploaded file and store it in the relevant Supabase record. | Implemented |
| FR15-03 | The system shall generate a public Pinata gateway URL from any CID, formatted as `https://gateway.pinata.cloud/ipfs/{CID}`. | Implemented |
| FR15-04 | The system shall display clickable links to view uploaded campaign documents via the Pinata gateway on the campaign detail page. | Implemented |
| FR15-05 | The system shall validate file types before uploading (PDFs for documents, images for media). | Implemented |
| FR15-06 | The system shall display an upload progress indicator and error messages if the upload fails. | Implemented |
| FR15-07 | The system shall support bulk document upload for KYC identity verification documents. | Planned |
| FR15-08 | The system shall allow the Business Owner to replace a previously uploaded document and update the stored CID. | Planned |

---

### FR16: KYC Verification

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR16-01 | The system shall allow users (both Business Owners and Investors) to upload KYC documents: National ID, Selfie with ID, Proof of Address, Business Registration Certificate, Tax Certificate, and Bank Statement. | Partial |
| FR16-02 | The system shall store the IPFS CIDs of uploaded KYC documents in the user's `profiles` row: `national_id_cid`, `selfie_cid`, `proof_of_address_cid`, `business_reg_cid`, `tax_cert_cid`, `bank_statement_cid`. | Partial |
| FR16-03 | The system shall derive the user's KYC status: **Not Started** (no documents), **Pending** (some documents uploaded), **Verified** (all core documents present and approved). | Implemented |
| FR16-04 | The system shall notify the user of their current KYC status on their settings/profile page. | Implemented |
| FR16-05 | The Platform Admin shall be able to review submitted KYC documents and approve or reject them, updating the `kyc_status` field on the profile. | Planned |
| FR16-06 | The system shall send an email notification to the user when their KYC status changes (approved or rejected). | Planned |
| FR16-07 | The system shall restrict investors with non-verified KYC from investing above a defined threshold (e.g., 1 ETH per campaign) until verified. | Planned |
| FR16-08 | The system shall prevent Business Owners from launching a campaign until a minimum set of KYC documents has been submitted. | Planned |

---

### FR17: Notification System *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR17-01 | The system shall send an email notification to an investor when a campaign they have invested in reaches its funding goal. | Planned |
| FR17-02 | The system shall send an email notification to a Business Owner when a new investment is made in their campaign. | Planned |
| FR17-03 | The system shall send an in-app notification to an investor when a campaign they follow posts an update. | Planned |
| FR17-04 | The system shall send a KYC status-change notification when an admin approves or rejects a user's KYC documents. | Planned |
| FR17-05 | The system shall send a notification to a Business Owner when their campaign is within 7 days of its deadline. | Planned |
| FR17-06 | The system shall display a notification bell icon in the dashboard navigation bar with an unread count badge. | Planned |
| FR17-07 | The system shall allow users to mark notifications as read individually or all at once. | Planned |
| FR17-08 | The system shall allow users to configure which notification types they receive via the notification preferences toggles in settings (already partially built). | Implemented (Preferences only) |

---

### FR18: Admin Panel *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR18-01 | The system shall provide a separate admin dashboard accessible only to users with an `admin` role. | Planned |
| FR18-02 | The admin shall be able to view all registered users, their roles, KYC status, and account status. | Planned |
| FR18-03 | The admin shall be able to suspend or deactivate a user account. | Planned |
| FR18-04 | The admin shall be able to view all campaigns (draft, launched, and ended) with their details. | Planned |
| FR18-05 | The admin shall be able to manually change the status of any campaign (e.g., flag as suspicious, force-close). | Planned |
| FR18-06 | The admin shall be able to review and approve or reject KYC document submissions for all users. | Planned |
| FR18-07 | The admin shall be able to view a platform-wide analytics dashboard: total users, total campaigns, total ETH raised, active investments, and marketplace volume. | Planned |
| FR18-08 | The admin shall be able to configure platform parameters: minimum investment amount, supported document types, campaign category list. | Planned |
| FR18-09 | The admin shall be able to generate and export platform reports (user growth, campaign performance, revenue). | Planned |

---

### FR19: Campaign Updates and Milestones *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR19-01 | The system shall allow a Business Owner to post text updates for their active campaigns. Updates shall be visible on the campaign detail page. | Planned |
| FR19-02 | The system shall allow a Business Owner to define campaign milestones (e.g., MVP launch, first 100 customers) with target dates. | Planned |
| FR19-03 | The system shall notify all investors in a campaign when the Business Owner posts a new update. | Planned |
| FR19-04 | The system shall display a timeline of updates and milestones on the campaign detail page. | Planned |
| FR19-05 | The system shall allow investors to "like" or acknowledge a campaign update. | Planned |
| FR19-06 | The system shall display a milestone progress indicator showing how many milestones have been completed versus planned. | Planned |

---

### FR20: Fund Withdrawal and Payout *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR20-01 | The system shall allow a Business Owner to withdraw raised funds from their campaign smart contract once the campaign has reached its funding goal or ended. | Planned |
| FR20-02 | The system shall enforce a milestone-based fund release schedule, releasing portions of the raised funds only when defined milestones are verified. | Planned |
| FR20-03 | The system shall record every withdrawal as a transaction in Supabase and on the blockchain. | Planned |
| FR20-04 | The system shall allow investors to vote to approve or reject a fund withdrawal request if milestone-based governance is enabled. | Planned |
| FR20-05 | The system shall allow investors to claim a refund if a campaign fails to reach its funding goal by the deadline, via the smart contract's refund function. | Planned |
| FR20-06 | The system shall display the withdrawal history for each campaign to both the Business Owner and investors. | Planned |

---

### FR21: Revenue Sharing and Dividends *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR21-01 | The system shall allow a Business Owner to distribute revenue/dividends to all token holders proportional to their equity token balance. | Planned |
| FR21-02 | The dividend distribution shall be executed via a smart contract function, transferring ETH to each token holder's wallet. | Planned |
| FR21-03 | The system shall record dividend distributions in the `transactions` table. | Planned |
| FR21-04 | The system shall notify investors when a dividend has been distributed to their wallet. | Planned |
| FR21-05 | The system shall display a dividend history per campaign on both the Business Owner dashboard and the investor's token holdings page. | Planned |

---

### FR22: Secondary Token Market — On-Chain Trading *(Planned)*

> This section expands FR10 with the full on-chain implementation details.

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR22-01 | The system shall deploy a `Marketplace` smart contract that manages token listings, purchases, and cancellations. | Planned |
| FR22-02 | The marketplace contract shall allow an investor to list a specified quantity of their equity tokens at a specified ETH price per token. | Planned |
| FR22-03 | The marketplace contract shall allow a buyer to purchase a listed token by sending the required ETH, triggering a token transfer from seller to buyer. | Planned |
| FR22-04 | The marketplace contract shall emit events for: `TokenListed`, `TokenPurchased`, and `ListingCancelled`. | Planned |
| FR22-05 | The system shall sync marketplace contract events to Supabase in near real-time using an event listener or cron job. | Planned |
| FR22-06 | The live order book on the marketplace page shall reflect current on-chain listings fetched from the marketplace contract. | Planned |
| FR22-07 | The system shall charge a platform fee (configurable, e.g., 1%) on each marketplace trade, sent to the platform treasury wallet. | Planned |

---

### FR23: Reporting and Analytics *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR23-01 | The system shall allow an investor to download a portfolio performance report (PDF or CSV) showing all investments, current values, gains/losses, and transaction history. | Planned |
| FR23-02 | The system shall allow a Business Owner to download a campaign report showing total raised, investor list, investment timeline, and document download history. | Planned |
| FR23-03 | The admin shall be able to generate platform-wide reports: monthly active users, total ETH raised per month, top campaigns, and marketplace volume. | Planned |
| FR23-04 | The system shall provide an investor tax report summarising all investment transactions in a given financial year. | Planned |
| FR23-05 | The system shall provide interactive analytics charts on the investor overview and business owner dashboard driven by real Supabase data (no mock values). | Partial |

---

### FR24: Governance and Voting *(Planned)*

| Req. No. | Requirement | Status |
|----------|-------------|--------|
| FR24-01 | The system shall allow a Business Owner to create a governance proposal (e.g., major business decision, fund withdrawal, strategy change) visible to all token holders. | Planned |
| FR24-02 | The system shall allow investors holding tokens in a campaign to cast votes (Yes / No / Abstain) on governance proposals. | Planned |
| FR24-03 | Voting weight shall be proportional to the number of equity tokens held by the voting investor. | Planned |
| FR24-04 | The system shall record all votes on-chain via a governance smart contract. | Planned |
| FR24-05 | The system shall display voting results in real time on the campaign detail page with a progress bar for Yes vs. No votes. | Planned |
| FR24-06 | The system shall close a vote after a specified deadline and display the final outcome. | Planned |
| FR24-07 | The system shall notify all token holders by email when a new governance proposal is submitted. | Planned |

---

## 5. Non-Functional Requirements

### NFR01: Performance

| Req. No. | Requirement |
|----------|-------------|
| NFR01-01 | The average page load time for the homepage and dashboard pages shall be less than 3 seconds on a standard broadband connection. |
| NFR01-02 | The Supabase database query response time shall not exceed 2 seconds for any single query. |
| NFR01-03 | IPFS document upload shall complete within 30 seconds for files up to 10 MB. |
| NFR01-04 | Blockchain transaction confirmation display shall update within 15 seconds of MetaMask confirmation. |
| NFR01-05 | The system shall support at least 100 concurrent authenticated users without performance degradation. |

### NFR02: Security

| Req. No. | Requirement |
|----------|-------------|
| NFR02-01 | All API routes and Supabase queries shall enforce Row-Level Security (RLS) policies ensuring users can only access their own data. |
| NFR02-02 | The system shall use HTTPS for all communications. All sensitive data shall be transmitted over encrypted channels only. |
| NFR02-03 | User passwords shall be managed entirely by Supabase Auth (bcrypt hashing). The system shall never store plaintext passwords. |
| NFR02-04 | The system shall sanitise all user-provided inputs to prevent SQL injection and XSS attacks. |
| NFR02-05 | Smart contracts shall be reviewed for common vulnerabilities (reentrancy, integer overflow) before mainnet deployment. |
| NFR02-06 | API keys (Pinata, Supabase service role) shall be stored exclusively in environment variables and never exposed to the client. |
| NFR02-07 | After a user session ends, no sensitive session information shall be stored on the client machine. |
| NFR02-08 | The system shall enforce CORS policies on all API routes. |

### NFR03: Usability

| Req. No. | Requirement |
|----------|-------------|
| NFR03-01 | The system shall display clear error messages for all user-facing failures (network errors, wallet rejections, invalid inputs). |
| NFR03-02 | The system shall support both light and dark theme modes. |
| NFR03-03 | All interactive elements (buttons, links, inputs) shall be keyboard accessible. |
| NFR03-04 | The system shall provide loading indicators for all asynchronous operations (data fetching, file uploads, blockchain transactions). |
| NFR03-05 | The user interface shall be responsive and functional on desktop browsers (minimum 1024px viewport width). Mobile responsiveness is desirable but not required in the initial release. |

### NFR04: Reliability and Availability

| Req. No. | Requirement |
|----------|-------------|
| NFR04-01 | The system shall have a target uptime of 99% during the academic presentation and demonstration period. |
| NFR04-02 | The system shall gracefully handle Supabase connection failures by displaying appropriate error states rather than crashing. |
| NFR04-03 | The system shall handle MetaMask not being installed by displaying an install prompt rather than a blank or broken page. |
| NFR04-04 | Investment data written to Supabase shall be transactionally consistent — a failed Supabase write after a successful on-chain transaction shall be detectable and re-triable. |

### NFR05: Maintainability

| Req. No. | Requirement |
|----------|-------------|
| NFR05-01 | All data-access logic shall be encapsulated in utility modules under `utils/supabase/` and `utils/` rather than scattered across page components. |
| NFR05-02 | The codebase shall be organised by feature/domain: investor components, business owner components, shared utilities. |
| NFR05-03 | Smart contract addresses and chain IDs shall be stored in a single configuration file to simplify network switching. |
| NFR05-04 | The system shall use TypeScript for all new utility files, API routes, and component files to reduce runtime type errors. |

### NFR06: Scalability

| Req. No. | Requirement |
|----------|-------------|
| NFR06-01 | The Supabase database schema shall use indexed foreign keys on `campaigns.owner`, `investments.investor_id`, and `investments.campaign_id` to support efficient queries as data grows. |
| NFR06-02 | IPFS document storage via Pinata shall be scalable without changes to application code. |
| NFR06-03 | The architecture shall allow future migration from the Sepolia testnet to Ethereum mainnet by changing configuration values only. |

---

## 6. Assumptions and Constraints

- The system currently operates exclusively on the **Ethereum Sepolia testnet**. Real ETH is not used; Sepolia ETH (free from faucets) is used for all transactions.
- Users must have the **MetaMask** browser extension installed to interact with any blockchain features (investing, launching campaigns).
- All document uploads are limited to files under **10 MB** per file due to IPFS gateway constraints.
- Campaign duration values are enforced at the application level; the smart contract does not enforce deadlines autonomously in the current version.
- The AI risk assessment service must be reachable and must receive correctly formatted document URLs to produce results.
- The system requires an active internet connection for all Supabase, IPFS/Pinata, and blockchain interactions.
- The platform currently supports **English language only**.
- The platform currently supports currencies in **ETH only**. Fiat currency display (USD equivalent) is a planned feature.
- Users are responsible for the security of their own MetaMask private keys. The platform does not have access to or custody of any private keys.
- Browser support is limited to **Chrome, Brave, and Firefox** (MetaMask-compatible browsers) for blockchain-related features.

---

## 7. Glossary

| Term | Definition |
|------|------------|
| Admin | A privileged platform user who manages users, campaigns, and KYC verifications |
| AI Risk Assessment | An automated analysis of campaign documents that produces a numeric risk score and qualitative dimension scores |
| Amount Pledged | The total ETH invested in a campaign across all investors |
| Business Campaign | An individual smart contract representing one fundraising campaign, deployed by the CampaignFactory |
| CampaignFactory | A master smart contract that deploys new BusinessCampaign contracts |
| CID | Content Identifier — a hash uniquely identifying a file stored on IPFS |
| Draft | A campaign saved by a Business Owner but not yet launched on the blockchain |
| Equity Token | A blockchain-native ERC-style token representing fractional ownership in a funded business |
| ETH | Ether — the native currency of the Ethereum network, used for all investments |
| Funding Goal | The total amount of ETH the Business Owner aims to raise from investors |
| IPFS | InterPlanetary File System — a decentralised peer-to-peer file storage protocol |
| Investor | A platform user who deposits ETH to receive equity tokens in exchange |
| Business Owner | A platform user who creates and manages fundraising campaigns |
| KYC | Know Your Customer — identity verification process using uploaded documents |
| Launched | Campaign status indicating the smart contract has been deployed and the campaign is open for investment |
| Marketplace | The secondary market within the platform where investors can buy and sell equity tokens with each other |
| MetaMask | A browser-extension crypto wallet used to sign and send Ethereum transactions |
| Pinata | A third-party service that pins files to IPFS and provides a CDN-backed gateway |
| Portfolio | The collection of all equity token holdings an investor has accumulated |
| Price Per Token | The ETH cost to purchase one equity token in a campaign, calculated as `funding_goal / 1000` |
| Risk Score | A numeric score (0–100) produced by the AI assessment indicating the overall investment risk of a campaign |
| Sepolia | An Ethereum test network with the same features as mainnet but using test ETH with no real value |
| Smart Contract | Autonomous code deployed on the Ethereum blockchain that executes transactions without intermediaries |
| Supabase | The backend-as-a-service platform used for authentication, database (PostgreSQL), and storage |
| Transaction Hash | A unique identifier for an on-chain transaction, viewable on Etherscan |
| Wallet Address | A public Ethereum address (e.g., `0x1A2b...`) identifying a MetaMask account |

---

## 8. References

1. Ethereum Solidity Documentation — https://docs.soliditylang.org/
2. Next.js 14 App Router Documentation — https://nextjs.org/docs
3. Supabase Documentation — https://supabase.com/docs
4. Pinata IPFS API Documentation — https://docs.pinata.cloud/
5. MetaMask Ethereum Provider API — https://docs.metamask.io/wallet/reference/provider-api/
6. Ethers.js v6 Documentation — https://docs.ethers.org/v6/
7. Sepolia Testnet Faucet — https://sepoliafaucet.com/
8. Sepolia Etherscan Block Explorer — https://sepolia.etherscan.io/

---

*Confidential — FundXProut Final Year Project*  
*Document generated: 27 April 2026*
