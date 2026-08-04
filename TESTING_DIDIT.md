# How to Test the Didit KYC Verification Locally

Since Didit operates on the public internet, it cannot send webhooks directly to our `localhost:5000` backend when an identity check is completed. To test this locally, we have to use a "Tunnel" to give our local backend a temporary public URL. 

Here is the exact step-by-step guide to get it running on your machine:

## 1. Setup your Environment Variables
Before starting, ensure you have the correct `.env` files in both the `frontend` and `backend` folders. 
*Ask whoever set up the Didit dashboard for the `.env` values if you don't have them!*

## 2. Start the Local Servers
Open two terminal windows:
1. **Terminal 1 (Backend):**
   ```bash
   cd backend
   npm install    # (Make sure you install the new packages like multer!)
   node server.js # Runs on port 5000
   ```
2. **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev    # Runs on port 3000
   ```

## 3. Create the Cloudflare Tunnel
Open a **third terminal window** and run this command:
```bash
npx cloudflared tunnel --url http://localhost:5000
```
* Note: Keep this terminal open! If you close it, the tunnel disconnects.
* Look at the terminal output. It will give you a public URL that looks something like this:
  `https://random-words.trycloudflare.com`

## 4. Update the Webhook in Didit
Didit needs to know your specific temporary URL so it can send the approval webhook to your machine.
1. Log into the [Didit Dashboard](https://dashboard.didit.me/).
2. Make sure you are in **Sandbox (Test) mode** (toggle at the top).
3. Go to **Webhooks** in the sidebar.
4. If there is an existing webhook, delete it. Click **+ Add destination**.
5. For the **URL**, combine your Cloudflare URL with the webhook endpoint:
   `https://[YOUR_CLOUDFLARE_URL]/api/didit/webhook`
6. Select the `status.updated` event and click **Save**.
7. **CRITICAL:** Didit just generated a new `SIGNING SECRET` for your new webhook. Copy that secret and update the `DIDIT_WEBHOOK_SECRET` in your `backend/.env` file. (Restart your backend server after saving the `.env` file).

## 5. Test the Flow!
1. Go to the frontend in your browser (`http://localhost:3000/profile`).
2. Click the **Verify Identity with Didit** button.
3. Since you are in Sandbox mode, you can just click through the Didit screens to simulate a successful check without scanning a real ID.
4. When finished, Didit will ping your Cloudflare tunnel, your backend will update Supabase, and your profile page will now show a green **"Biometric Identity Verified (Didit)"** badge!
