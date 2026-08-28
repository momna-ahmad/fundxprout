# Marketplace QA Checklist

This checklist verifies core marketplace flows end-to-end.

- Place a buy order
  - Steps:
    1. Connect MetaMask and ensure the wallet is linked & verified in the profile.
    2. Navigate to the campaign marketplace page (Investor Dashboard → Marketplace → choose a campaign).
    3. Open the order form, choose `Buy`, fill a price and quantity, and submit.
  - Expected:
    - API returns 201 and success confirmation.
    - UI shows a success message.

- Place a matching sell order
  - Steps:
    1. From another account (or using another browser/session), connect and verify the wallet.
    2. Submit a complementary `Sell` order that matches the buy price/quantity.
  - Expected:
    - Matching engine processes match; both orders either partially or fully filled.

- Confirm trade appears in TradeHistory via socket without refresh
  - Steps:
    1. After a match, check the campaign trading page where `TradeHistory` is visible.
    2. Ensure the matched trade appears in the list automatically (no page reload).
  - Expected:
    - `tradeExecuted` socket event is emitted and the `TradeHistory` component receives and renders it.

- Confirm token_holdings updated
  - Steps:
    1. After trade settlement, verify the buyer's and seller's token holdings are updated in Supabase (or the on-chain / token accounting service).
    2. Check the investor portfolio page or token holdings table.
  - Expected:
    - Holdings reflect the executed trade amounts.

- Confirm wallet must be connected + verified before order placement
  - Steps:
    1. Attempt to open and submit the order form without connecting a wallet.
    2. Attempt to submit with a connected but unverified wallet.
  - Expected:
    - The `ConnectWalletGate` prevents the form from rendering/actions and prompts the user to connect and verify.

Notes:
- For deterministic testing, use `process.env.SKIP_KYC=true` and `process.env.SKIP_WALLET=true` only for unit tests; QA should use real verification flows.
- Observe backend logs for `emitTradeExecuted` and `emitBookUpdate` when running the server locally.
