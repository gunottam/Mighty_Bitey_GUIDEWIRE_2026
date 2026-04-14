const mongoose = require('mongoose');

// ============================================
// WORKER SCHEMA (Enhanced for Income-Tied Model)
// ============================================
const workerSchema = new mongoose.Schema({
  name: String,
  zone: String,
  hardware_id: String,
  wallet_address: { type: String, unique: true },
  accelerometer_moving: { type: Boolean, default: true },
  balance: { type: Number, default: 0 },
  is_fraud: { type: Boolean, default: false },
  fraud_score: { type: Number, default: 0 },
  fraud_reason: { type: String, default: "Clear" },
  risk_score: { type: Number, default: 0 },
  zone_risk: String,

  // NEW: Income-tied fields
  delivery_platform: { type: String, default: 'Zomato', enum: ['Zomato', 'Swiggy', 'Zepto', 'Amazon', 'Dunzo', 'Blinkit', 'Other'] },
  avg_hourly_earnings: { type: Number, default: 85 },  // ₹/hour
  typical_hours_per_week: { type: Number, default: 45 },
  coverage_tier: { type: String, default: 'STANDARD', enum: ['BASIC', 'STANDARD', 'PREMIUM'] },
  total_deliveries: { type: Number, default: 0 },
  registration_date: { type: Date, default: Date.now },
  claim_count: { type: Number, default: 0 },
  last_claim_date: Date,
  total_payouts_received: { type: Number, default: 0 },
  gps_lat: Number,
  gps_lng: Number,

  // Earnings history: array of weekly earning records
  earnings_history: [{
    week_ending: Date,
    total_earnings: Number,
    hours_worked: Number,
    deliveries_completed: Number,
  }],

  // Claim history for fraud detection
  claim_history: [{
    timestamp: { type: Date, default: Date.now },
    event_type: String,
    amount: Number,
    status: String,
  }],

  // ML-calculated premium
  ml_weekly_premium: { type: Number, default: 40 },
  ml_risk_classification: { type: String, default: 'MEDIUM' },
});

// ============================================
// TRANSACTION SCHEMA (Enhanced with Income-Tied Breakdown)
// ============================================
const transactionSchema = new mongoose.Schema({
  worker_wallet: String,
  worker_name: String,
  payout_amount: Number,
  event_type: String,
  status: String, // SUCCESS, PRORATED, BLOCKED, FLAGGED
  timestamp: { type: Date, default: Date.now },

  // NEW: Income-tied payout breakdown
  payout_breakdown: {
    hourly_rate: Number,
    disruption_hours: Number,
    coverage_multiplier: Number,
    raw_calculation: String,
    cap_applied: Boolean,
  },

  // Fraud analysis result for this transaction
  fraud_analysis: {
    composite_score: Number,
    isolation_forest_score: Number,
    rule_engine_score: Number,
    syndicate_score: Number,
    verdict: String,
    flags: [String],
  },
});

// ============================================
// TREASURY SCHEMA (Enhanced with Analytics)
// ============================================
const treasurySchema = new mongoose.Schema({
  reservePool: { type: Number, default: 100000 },
  premiumsCollected: { type: Number, default: 0 },
  totalPayoutsIssued: { type: Number, default: 0 },
  totalClaimsProcessed: { type: Number, default: 0 },
  totalFraudBlocked: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },

  // Weekly snapshots for analytics
  weekly_snapshots: [{
    week_ending: Date,
    premiums_collected: Number,
    payouts_issued: Number,
    claims_processed: Number,
    fraud_blocked: Number,
    reserve_at_end: Number,
    loss_ratio: Number, // payouts / premiums
  }],
});

// ============================================
// SYSTEM LOG SCHEMA
// ============================================
const systemLogSchema = new mongoose.Schema({
  log_type: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

// ============================================
// CLAIM EVENT SCHEMA (NEW: Full Audit Trail)
// ============================================
const claimEventSchema = new mongoose.Schema({
  event_id: String,
  event_type: String,
  intensity_value: Number,
  zone: String,
  timestamp: { type: Date, default: Date.now },
  trigger_source: { type: String, default: 'SIMULATION' }, // SIMULATION, LIVE_API, MANUAL

  // Results
  workers_eligible: Number,
  workers_paid: Number,
  workers_blocked: Number,
  workers_flagged: Number,
  total_payout: Number,
  avg_payout_per_worker: Number,
  disruption_hours_estimated: Number,

  // ML analysis
  ml_disruption_probability: Number,
  ml_risk_classification: String,

  // Syndicate detection results
  syndicates_detected: Number,
  syndicate_members_blocked: Number,

  // Status
  status: { type: String, default: 'COMPLETED' },
  processing_time_ms: Number,
});

// ============================================
// ANALYTICS SNAPSHOT SCHEMA (NEW: Dashboard Data)
// ============================================
const analyticsSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  snapshot_type: { type: String, default: 'DAILY' }, // DAILY, WEEKLY, MONTHLY

  // Financial metrics
  reserve_pool: Number,
  total_premiums_collected: Number,
  total_payouts_issued: Number,
  loss_ratio: Number,

  // Operational metrics
  active_policies: Number,
  total_claims: Number,
  fraud_rate: Number,
  avg_payout: Number,

  // Per-zone breakdown
  zone_metrics: [{
    zone_id: String,
    risk_score: Number,
    active_workers: Number,
    premiums_collected: Number,
    payouts_issued: Number,
  }],
});

// ============================================
// MODEL EXPORTS
// ============================================
const Worker = mongoose.model('Worker', workerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Treasury = mongoose.model('Treasury', treasurySchema);
const SystemLog = mongoose.model('SystemLog', systemLogSchema);
const ClaimEvent = mongoose.model('ClaimEvent', claimEventSchema);
const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);

module.exports = { Worker, Transaction, Treasury, SystemLog, ClaimEvent, AnalyticsSnapshot };
