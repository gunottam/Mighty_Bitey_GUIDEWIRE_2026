# 🚀 Vercel Production Deployment Sequence

The MERN architecture has been structurally modernized to actively proxy seamlessly on **Vercel** serverless blocks. We wiped the static HTTP hosts out of React, rewired standard express scripts into exported modules, and created a `vercel.json` natively telling Vercel exactly how to compile the React/Vite front-end separate from the Node routing engine.

---

### Step 1: Initializing Vercel Dashboard

1. Sign into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project** and explicitly import your `Mighty_Bytey_GUIDEWIRE_2026` repository seamlessly.
3. In the Configuration menu, leave **Framework Preset** as Vite. The `vercel.json` we created already overrides standard execution loops natively.

### Step 2: Injecting Physical Environment Variables (CRITICAL)
Before you hit `Deploy`, explicitly drop down the **Environment Variables** tab. You MUST add:

> [!IMPORTANT]
> **`OPENWEATHER_API_KEY`** -> *[Your weather API String]*
> **`MONGODB_URI`** -> *[Your literal MongoDB Atlas Connection String]*

Vercel physically operates in the cloud; it cannot access your computer's `127.0.0.1` harddrive. If you do not map a MongoDB Atlas cluster URI into that variable explicitly, the backend serverless endpoints will hard-crash mathematically.

### Step 3: Deploy
Once those variables are assigned natively, execute the **Deploy** command! Vercel will instantly map the `/api/*` proxies straight to `backend/index.js` executing deterministic actuarial payloads directly to the frontend.
