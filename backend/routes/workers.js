/**
 * GigAegis Worker Routes
 * Handles registration, profile retrieval, and earnings management.
 */
const express = require('express');
const router = express.Router();
const { Worker } = require('../models/GigAegisDB');
const { predictZoneRisk } = require('../ml/riskModel');
const { calculateIncomeTiedPremium } = require('../ml/incomeCalculator');
const { getZone, getAllZones } = require('../config/zones');
const { getMemWorkers } = require('../config/memStore');

// In-memory fallback
const isDBActive = () => require('mongoose').connection.readyState === 1;

/**
 * POST /api/register
 * Enhanced registration with earnings profile.
 */
router.post('/register', async (req, res) => {
  const { name, zone, delivery_platform, avg_hourly_earnings, typical_hours_per_week, coverage_tier } = req.body;
  if (!name || !zone) return res.status(400).json({ error: "Name and zone are required." });

  const resolvedZone = getZone(zone);
  const zoneName = resolvedZone ? resolvedZone.id : zone;

  const hourlyRate = avg_hourly_earnings || 85;
  const weeklyHours = typical_hours_per_week || 45;

  // ML-powered premium calculation
  const mlPrediction = predictZoneRisk(zoneName);
  const premiumCalc = calculateIncomeTiedPremium(
    { avg_hourly_earnings: hourlyRate, typical_hours_per_week: weeklyHours, earnings_history: [] },
    mlPrediction.disruption_probability
  );

  const newWorker = {
    name,
    zone: zoneName,
    hardware_id: 'HW-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9999),
    wallet_address: '0x' + Math.random().toString(16).slice(2, 12).toUpperCase(),
    accelerometer_moving: true,
    balance: 0,
    is_fraud: false,
    fraud_score: 0,
    fraud_reason: "Clear",
    delivery_platform: delivery_platform || 'Zomato',
    avg_hourly_earnings: hourlyRate,
    typical_hours_per_week: weeklyHours,
    coverage_tier: coverage_tier || 'STANDARD',
    total_deliveries: 0,
    registration_date: new Date(),
    claim_count: 0,
    total_payouts_received: 0,
    earnings_history: [],
    claim_history: [],
    ml_weekly_premium: premiumCalc.weekly_premium,
    ml_risk_classification: mlPrediction.risk_classification,
    gps_lat: resolvedZone ? resolvedZone.lat : 12.95,
    gps_lng: resolvedZone ? resolvedZone.lng : 77.65,
  };

  if (isDBActive()) {
    try { await Worker.create(newWorker); } catch (e) { /* duplicate wallet safe-fail */ }
  } else {
    getMemWorkers().push(newWorker);
  }

  return res.json({
    status: "SUCCESS",
    worker: newWorker,
    premium_details: premiumCalc,
    zone_risk: {
      classification: mlPrediction.risk_classification,
      disruption_probability: mlPrediction.disruption_probability,
      zone_info: resolvedZone,
    }
  });
});

/**
 * GET /api/worker/:wallet
 * Retrieve worker profile with ML risk data.
 */
router.get('/worker/:wallet', async (req, res) => {
  const { wallet } = req.params;
  let targetWorker;

  if (isDBActive()) {
    targetWorker = await Worker.findOne({ wallet_address: wallet });
    if (targetWorker) targetWorker = targetWorker.toObject();
  } else {
    targetWorker = getMemWorkers().find(w => w.wallet_address === wallet);
  }

  if (!targetWorker) return res.status(404).json({ error: "Worker not found." });

  // Attach live ML premium
  const mlPrediction = predictZoneRisk(targetWorker.zone);
  const premiumCalc = calculateIncomeTiedPremium(targetWorker, mlPrediction.disruption_probability);

  return res.json({
    targetWorker: {
      ...targetWorker,
      ml_weekly_premium: premiumCalc.weekly_premium,
      ml_risk_classification: mlPrediction.risk_classification,
    },
    premium_details: premiumCalc,
    zone_risk: mlPrediction,
  });
});

/**
 * PUT /api/worker/:wallet/earnings
 * Log a week of earnings for income-tied calculations.
 */
router.put('/worker/:wallet/earnings', async (req, res) => {
  const { wallet } = req.params;
  const { total_earnings, hours_worked, deliveries_completed } = req.body;

  if (!total_earnings || !hours_worked) {
    return res.status(400).json({ error: "total_earnings and hours_worked are required." });
  }

  const earningsRecord = {
    week_ending: new Date(),
    total_earnings,
    hours_worked,
    deliveries_completed: deliveries_completed || 0,
  };

  if (isDBActive()) {
    await Worker.updateOne(
      { wallet_address: wallet },
      {
        $push: { earnings_history: earningsRecord },
        $set: { avg_hourly_earnings: Math.round(total_earnings / hours_worked) },
        $inc: { total_deliveries: deliveries_completed || 0 },
      }
    );
  } else {
    const worker = getMemWorkers().find(w => w.wallet_address === wallet);
    if (worker) {
      if (!worker.earnings_history) worker.earnings_history = [];
      worker.earnings_history.push(earningsRecord);
      worker.avg_hourly_earnings = Math.round(total_earnings / hours_worked);
    }
  }

  return res.json({ status: "SUCCESS", recorded: earningsRecord });
});

/**
 * GET /api/workers
 * List all workers (for admin dashboard).
 */
router.get('/workers', async (req, res) => {
  let workers;
  if (isDBActive()) {
    workers = await Worker.find({}).lean();
  } else {
    workers = getMemWorkers();
  }
  return res.json({ workers, count: workers.length });
});

/**
 * GET /api/zones
 * Get all available zones with risk data.
 */
router.get('/zones', (req, res) => {
  const zones = getAllZones().map(zone => {
    const mlPrediction = predictZoneRisk(zone.id);
    return {
      ...zone,
      ml_risk_score: mlPrediction.disruption_probability,
      ml_premium: mlPrediction.recommended_weekly_premium,
      ml_classification: mlPrediction.risk_classification,
    };
  });
  return res.json({ zones });
});

module.exports = router;
