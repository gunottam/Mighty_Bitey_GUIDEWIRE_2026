const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: String,
  zone: String,
  hardware_id: String,
  wallet_address: String,
  accelerometer_moving: Boolean,
  balance: { type: Number, default: 0 },
  is_fraud: { type: Boolean, default: false },
  fraud_score: { type: Number, default: 0 },
  fraud_reason: { type: String, default: "Clear" },
  risk_score: { type: Number, default: 0 },
  zone_risk: String // "High", "Medium", "Low"
});

const transactionSchema = new mongoose.Schema({
  worker_wallet: String,
  payout_amount: Number,
  event_type: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});

const treasurySchema = new mongoose.Schema({
  reservePool: { type: Number, default: 100000 },
  premiumsCollected: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now }
});

const systemLogSchema = new mongoose.Schema({
  log_type: String, // SUCCESS, BLOCKED, WARNING, SYSTEM
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const Worker = mongoose.model('Worker', workerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Treasury = mongoose.model('Treasury', treasurySchema);
const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = { Worker, Transaction, Treasury, SystemLog };
