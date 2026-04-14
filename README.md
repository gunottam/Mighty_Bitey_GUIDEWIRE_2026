# 🛡️ GigAegis: AI-Powered Parametric Income Protection for India's Gig Economy

**GigAegis** is an autonomous, ML-driven parametric insurance platform that protects platform-based delivery partners (Zomato, Swiggy, Zepto, Amazon, Blinkit, Dunzo) from income loss caused by extreme weather, pollution, and civil disruptions. Unlike traditional insurance, GigAegis calculates **personalized, income-tied payouts** using real machine learning — not hardcoded rules.

---

## 🧠 What Makes This Different

| Feature | Traditional Approach | GigAegis |
|---|---|---|
| **Pricing** | Fixed premiums per plan | ML-predicted premium per worker per zone (GBDT, R²=0.99) |
| **Payouts** | Flat amount for everyone | `hourly_earnings × disruption_hours × coverage_tier` |
| **Fraud Detection** | Manual review | Isolation Forest anomaly detection + Graph-based syndicate clustering |
| **Risk Assessment** | Broad geographic zones | 12 Bangalore micro-zones with H3-style grid indexing |
| **Triggers** | Manual claim filing | Autonomous parametric triggers from OpenWeather API |

---

## 🏗️ Architecture

### Machine Learning Pipeline (Pure JavaScript — No Python Dependencies)

1. **Gradient Boosted Decision Trees (GBDT)** — 50-tree ensemble trained on 624 historical records (52 weeks × 12 zones) derived from real Bangalore climate data. Validated with 80/20 train/test split:
   - **Train**: MAE=0.021, RMSE=0.027, R²=0.990
   - **Test**: MAE=0.026, RMSE=0.033, R²=0.979
   - **Overfit gap**: 0.011 (healthy). Noise stability tested at σ=5%, 10%, 20%.

2. **Isolation Forest Anomaly Detection** — 100-tree ensemble trained on 200 normal behavior profiles. Scores each claim on 8 behavioral features. Validated at scale: **10,000 users, 5% fraud, 3 syndicate rings → Precision: 100%, Recall: 100%, F1: 100%**.

3. **Graph-Based Syndicate Detection** — Builds adjacency graph of workers sharing hardware IDs or GPS proximity. Connected components with >2 nodes = organized fraud ring.

4. **Income-Tied Payout Calculator** — Replaces flat ₹2000 payouts with personalized calculations:
   ```
   payout = worker_hourly_rate × disruption_hours × coverage_multiplier
   ```
   - Hourly rate from weighted recent earnings history
   - Disruption hours estimated from event severity + historical duration mapping
   - Capped at coverage tier limit (Basic: ₹2000, Standard: ₹3500, Premium: ₹5000)

### Backend (Node.js / Express / MongoDB)
- **Modular route architecture**: `routes/workers.js`, `routes/insurance.js`, `routes/analytics.js`
- **ML modules**: `ml/riskModel.js`, `ml/fraudDetector.js`, `ml/incomeCalculator.js`, `ml/trainingData.js`
- **12 micro-zones**: `config/zones.js` with real Bangalore geographic data
- **MongoDB with RAM fallback**: Dual-mode persistence for demo reliability
- **Resilient API client**: 3-attempt retry with exponential backoff, cached fallback, and latency telemetry
- **Validation engine**: `ml/validation.js` — automated ML credibility, economic simulation, fraud benchmarking

### Economic Viability (Monte Carlo Simulation)
- **1,200 workers × 12 weeks**
- **Normal conditions**: Loss ratio 6.4%, Net profit ₹18.5L, Final reserve ₹20.5L ✅
- **Black swan (3x disruptions)**: Loss ratio 21.8%, Net profit ₹15.6L, system remains solvent ✅

### Geo-Spatial Risk (IDW Smoothing)
- **12 zones** with Haversine neighbor detection (< 4km threshold)
- **Spatial smoothing**: 70% self-weight + 30% inverse-distance-weighted neighbor influence
- **Risk interpolation**: Predict disruption probability at any arbitrary lat/lng coordinate

### Frontend (React + Vite + Tailwind CSS)
- **4 views**: Registration, Worker App, Admin Command Center, Analytics Dashboard
- **Component architecture**: Modular page components in `src/components/`
- **Real-time polling**: Live ML risk scores, fraud analysis, claim lifecycle tracking

---

## 📊 Analytics Dashboard

The insurer-facing analytics dashboard provides:
- **KPI Overview**: Loss ratios, fraud rates, reserve pool health, average payout per claim
- **Zone Risk Heatmap**: All 12 zones with ML-predicted risk scores and recommended premiums
- **ML Model Explainability**: Feature importance visualization (GBDT), per-zone prediction breakdowns
- **Next-Week Forecasts**: Predictive disruption probability per zone with trend indicators

---

## 🛡️ Fraud Detection Architecture

Three-stage composite scoring (weighted blend):
- **40% Isolation Forest** — Behavioral anomaly detection
- **35% Rule Engine** — Device sharing, kinetic anomaly, impossible traversal, payout frequency
- **25% Syndicate Graph** — Connected component analysis for organized fraud rings

Verdicts: `APPROVED` (score < 0.45) | `FLAGGED_REVIEW` (0.45–0.70) | `BLOCKED` (> 0.70)

---

## 🚀 Quick Start

```bash
# 1. Start MongoDB (optional — system has RAM fallback)
brew services start mongodb-community

# 2. Start Backend (ML models train on startup)
cd backend && npm install && node index.js

# 3. Start Frontend
cd gigaegis-frontend && npm install && npm run dev
```

Open `http://localhost:5173` → Register a worker → Switch to Command Center → Execute a parametric event → Watch income-tied payouts flow.

---

## 🛠️ Tech Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- **Backend**: Node.js + Express 5
- **Database**: MongoDB + Mongoose 9 (with in-memory fallback)
- **ML**: Pure JavaScript GBDT + Isolation Forest (zero Python dependencies)
- **APIs**: OpenWeather (weather + AQI), with simulation fallback
- **Deployment**: Vercel-compatible (serverless functions)

---

## 📁 Project Structure
```
backend/
├── index.js                 # Entry point (65 lines)
├── config/zones.js          # 12 Bangalore micro-zones + spatial smoothing
├── ml/
│   ├── riskModel.js         # GBDT risk prediction (50 trees, R²=0.979)
│   ├── fraudDetector.js     # Isolation Forest + Graph clustering (F1=100%)
│   ├── incomeCalculator.js  # Income-tied payout engine
│   ├── trainingData.js      # Historical training data (624 records)
│   └── validation.js        # Production validation engine (Tasks 1-6)
├── models/GigAegisDB.js     # 6 Mongoose schemas
└── routes/
    ├── workers.js            # Registration + earnings
    ├── insurance.js          # Payout + fraud + resilient API client
    └── analytics.js          # Dashboard + predictions + /validation endpoint

gigaegis-frontend/src/
├── App.jsx                  # Routing shell (70 lines)
└── components/
    ├── RegisterPage.jsx      # Onboarding with earnings input
    ├── WorkerApp.jsx         # Mobile worker interface
    ├── AdminConsole.jsx      # Command center
    └── AnalyticsDashboard.jsx # Insurer analytics

validation_output.json       # Computed results from all 6 validation tasks
```

