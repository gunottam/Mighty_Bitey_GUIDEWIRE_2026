/**
 * GigAegis Insurance Routes
 * Core payout engine with ML fraud detection and income-tied calculations.
 * 
 * API Robustness (Task 4):
 *   - 3-attempt retry with exponential backoff
 *   - Timeout handling (2s per attempt)
 *   - Fallback hierarchy: Live API → Cached last-known → Simulation defaults
 *   - Latency and failure rate telemetry
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { Worker, Transaction, Treasury, SystemLog, ClaimEvent } = require('../models/GigAegisDB');
const { predictZoneRisk, getModelMetrics } = require('../ml/riskModel');
const { analyzeWorkerFraud } = require('../ml/fraudDetector');
const { calculateIncomeTiedPayout, calculateIncomeTiedPremium } = require('../ml/incomeCalculator');
const { getZone } = require('../config/zones');

const isDBActive = () => mongoose.connection.readyState === 1;
const workerHistory = new Map();

// ============================================
// TASK 4: RESILIENT WEATHER API CLIENT
// ============================================

const weatherCache = new Map(); // zone_key -> { data, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const BASE_TIMEOUT_MS = 2000;

// Telemetry counters
const apiTelemetry = {
  total_calls: 0,
  successes: 0,
  cache_hits: 0,
  retries: 0,
  failures: 0,
  simulation_fallbacks: 0,
  latencies_ms: [],
  last_failure_reason: null,
  getStats() {
    const lats = this.latencies_ms.slice(-100); // last 100
    return {
      total_calls: this.total_calls,
      success_rate: this.total_calls > 0 ? parseFloat(((this.successes / this.total_calls) * 100).toFixed(1)) : 0,
      cache_hit_rate: this.total_calls > 0 ? parseFloat(((this.cache_hits / this.total_calls) * 100).toFixed(1)) : 0,
      failure_rate: this.total_calls > 0 ? parseFloat(((this.failures / this.total_calls) * 100).toFixed(1)) : 0,
      total_retries: this.retries,
      simulation_fallbacks: this.simulation_fallbacks,
      avg_latency_ms: lats.length > 0 ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
      p95_latency_ms: lats.length > 0 ? lats.sort((a, b) => a - b)[Math.floor(lats.length * 0.95)] : 0,
      last_failure: this.last_failure_reason,
    };
  },
};

/**
 * Fetch weather with 3-tier fallback:
 *   1. Live OpenWeather API (with retry)
 *   2. Cached last-known value
 *   3. Simulation defaults
 */
async function fetchWeatherResilient(lat, lng, zoneKey) {
  apiTelemetry.total_calls++;
  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const startTime = Date.now();
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const defaults = { rainfall_mm: 0, temp_c: 30, aqi: 80, humidity: 60 };
  let source = 'SIMULATION';

  // TIER 1: Live API with retry
  if (apiKey && apiKey !== 'PLACEHOLDER') {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = BASE_TIMEOUT_MS * attempt; // Exponential: 2s, 4s, 6s
        const resp = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`,
          { timeout }
        );

        const data = {
          rainfall_mm: resp.data.rain?.['1h'] || resp.data.rain?.['3h'] || 0,
          temp_c: resp.data.main?.temp || 30,
          humidity: resp.data.main?.humidity || 60,
          aqi: 80, // Default, fetched separately below
        };

        // Fetch AQI (non-critical, single attempt)
        try {
          const aqiResp = await axios.get(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`,
            { timeout: 2000 }
          );
          const aqiIndex = aqiResp.data?.list?.[0]?.main?.aqi || 2;
          data.aqi = [0, 50, 100, 200, 350, 500][aqiIndex] || 80;
        } catch (e) { /* AQI non-critical */ }

        // SUCCESS: update cache and telemetry
        const latency = Date.now() - startTime;
        apiTelemetry.successes++;
        apiTelemetry.latencies_ms.push(latency);
        weatherCache.set(cacheKey, { data, timestamp: Date.now() });
        source = 'LIVE_API';

        if (attempt > 1) console.log(`[API] Weather fetched on attempt ${attempt} (${latency}ms)`);

        return { ...data, source, latency_ms: latency, attempt, cached: false };

      } catch (err) {
        apiTelemetry.retries++;
        const reason = err.code === 'ECONNABORTED' ? 'TIMEOUT' : err.code || err.message;
        console.log(`[API] Attempt ${attempt}/${MAX_RETRIES} failed: ${reason}`);
        apiTelemetry.last_failure_reason = reason;

        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 500 * attempt)); // Backoff: 500ms, 1000ms
        }
      }
    }
    apiTelemetry.failures++;
  }

  // TIER 2: Cached last-known value
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    apiTelemetry.cache_hits++;
    const latency = Date.now() - startTime;
    console.log(`[API] Using cached weather for ${zoneKey} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return { ...cached.data, source: 'CACHE', latency_ms: latency, cached: true, cache_age_s: Math.round((Date.now() - cached.timestamp) / 1000) };
  }

  // TIER 3: Simulation defaults
  apiTelemetry.simulation_fallbacks++;
  const latency = Date.now() - startTime;
  console.log(`[API] Fallback to simulation defaults for ${zoneKey}`);
  return { ...defaults, source: 'SIMULATION', latency_ms: latency, cached: false };
}

// In-memory fallback state
let memReservePool = 100000;
let memPremiums = 0;

// Get memory workers (shared with worker routes via require cache)
let _memWorkers = null;
const getMemWorkers = () => {
  if (!_memWorkers) {
    const honest = require('../../honest_workers.json');
    const fraud = require('../../fraud_syndicate.json');
    _memWorkers = [...honest, ...fraud].map(w => ({ ...w, balance: w.balance || 0, is_fraud: false }));
  }
  return _memWorkers;
};

async function fetchSystemState() {
  if (isDBActive()) {
    const t = await Treasury.findOne({});
    return { pool: t ? t.reservePool : memReservePool, premiums: t ? t.premiumsCollected : memPremiums };
  }
  return { pool: memReservePool, premiums: memPremiums };
}

async function writeSystemLog(logType, logMessage) {
  if (isDBActive()) await SystemLog.create({ log_type: logType, message: logMessage });
}

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    modes: { dbConnected: isDBActive() },
    ml: getModelMetrics(),
    api_telemetry: apiTelemetry.getStats(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/liquidity
 */
router.get('/liquidity', async (req, res) => {
  const state = await fetchSystemState();
  res.json({ liquidity: state.pool, premiums: state.premiums });
});

/**
 * GET /api/live-risk/:zone
 * ML-powered live risk assessment with resilient weather fetching.
 */
router.get('/live-risk/:zone', async (req, res) => {
  const { zone } = req.params;
  const zoneConfig = getZone(zone);
  const lat = zoneConfig ? zoneConfig.lat : 12.95;
  const lng = zoneConfig ? zoneConfig.lng : 77.65;

  // Resilient weather fetch (3 retries → cache → simulation)
  const weather = await fetchWeatherResilient(lat, lng, zone);
  const weatherData = { rainfall_mm: weather.rainfall_mm, temp_c: weather.temp_c, aqi: weather.aqi, humidity: weather.humidity };

  // ML prediction using weather + zone features
  const mlResult = predictZoneRisk(zone, weatherData);
  const premiumCalc = calculateIncomeTiedPremium(
    { avg_hourly_earnings: 85, typical_hours_per_week: 45, earnings_history: [] },
    mlResult.disruption_probability
  );

  return res.json({
    zone: zoneConfig ? zoneConfig.id : zone,
    zone_info: zoneConfig,
    classification: mlResult.risk_classification,
    riskScore: mlResult.disruption_probability,
    calculatedPremium: premiumCalc.weekly_premium,
    premium_breakdown: premiumCalc.breakdown,
    weatherData,
    liveRainfall: weatherData.rainfall_mm,
    liveTemp: weatherData.temp_c,
    liveAQI: weatherData.aqi,
    isFallback: weather.source === 'SIMULATION',
    data_source: weather.source,
    api_latency_ms: weather.latency_ms,
    cached: weather.cached || false,
    ml_feature_contributions: mlResult.feature_contributions,
    ml_feature_importance: mlResult.feature_importance,
    model_confidence: mlResult.model_confidence,
    api_telemetry: apiTelemetry.getStats(),
  });
});

/**
 * Real OpenWeather trigger checks — using resilient fetcher.
 */
async function checkRealTriggers(zone) {
  const zoneConfig = getZone(zone);
  const lat = zoneConfig ? zoneConfig.lat : 12.95;
  const lng = zoneConfig ? zoneConfig.lng : 77.65;
  const triggers = [];

  const weather = await fetchWeatherResilient(lat, lng, zone);

  if (weather.source !== 'SIMULATION') {
    if (weather.rainfall_mm > 50) triggers.push({ event_type: 'FLOOD', intensity_value: weather.rainfall_mm, source: weather.source });
    if (weather.temp_c > 42) triggers.push({ event_type: 'HEATWAVE', intensity_value: weather.temp_c, source: weather.source });
    if (weather.aqi > 400) triggers.push({ event_type: 'SMOG', intensity_value: weather.aqi, source: weather.source });
  }

  return triggers;
}

/**
 * Simulation trigger checks.
 */
function checkSimulatedTriggers() {
  const flood = Math.random() > 0.8 ? (Math.floor(Math.random() * 50) + 55) : 30;
  if (flood > 50) return { event_type: 'FLOOD', intensity_value: flood, source: 'SIMULATION' };

  const heat = Math.random() > 0.85 ? (Math.floor(Math.random() * 10) + 43) : 38;
  if (heat > 42) return { event_type: 'HEATWAVE', intensity_value: heat, source: 'SIMULATION' };

  const aqi = Math.random() > 0.9 ? (Math.floor(Math.random() * 100) + 451) : 250;
  if (aqi > 450) return { event_type: 'SMOG', intensity_value: aqi, source: 'SIMULATION' };

  return null;
}

/**
 * GET /api/disaster-check
 * Autonomous parametric trigger polling.
 */
router.get('/disaster-check', async (req, res) => {
  try {
    // Try real API first
    const realTriggers = await checkRealTriggers('Koramangala_1');
    if (realTriggers.length > 0) {
      const trigger = realTriggers[0];
      return res.json({
        status: "DISASTER_TRIGGER",
        triggerPayload: { zone: 'Koramangala_1', ...trigger }
      });
    }

    // Fall back to simulation
    const simTrigger = checkSimulatedTriggers();
    if (simTrigger) {
      return res.json({
        status: "DISASTER_TRIGGER",
        triggerPayload: { zone: 'Koramangala_1', ...simTrigger }
      });
    }

    return res.json({ status: "SAFE", message: "All parametric thresholds stable." });
  } catch (e) {
    return res.json({ status: "SAFE", message: "Oracle unavailable." });
  }
});

/**
 * POST /api/collect-premiums
 * ML-priced premium collection.
 */
router.post('/collect-premiums', async (req, res) => {
  let batchTotal = 0;
  const workers = isDBActive() ? await Worker.find({}).lean() : getMemWorkers();
  const premiumDetails = [];

  for (const worker of workers) {
    const mlPrediction = predictZoneRisk(worker.zone);
    const premiumCalc = calculateIncomeTiedPremium(worker, mlPrediction.disruption_probability);
    const premium = premiumCalc.weekly_premium;
    batchTotal += premium;
    premiumDetails.push({ name: worker.name, zone: worker.zone, premium, risk: mlPrediction.risk_classification });
  }

  if (isDBActive()) {
    await Treasury.updateOne({}, { $inc: { reservePool: batchTotal, premiumsCollected: batchTotal }, last_updated: Date.now() });
  } else {
    memReservePool += batchTotal;
    memPremiums += batchTotal;
  }
  await writeSystemLog("SYSTEM", `ML-priced premiums collected: ₹${batchTotal} from ${workers.length} workers.`);

  let finalState = await fetchSystemState();
  res.json({
    status: "SUCCESS",
    collectedThisBatch: batchTotal,
    reservePool: finalState.pool,
    workerCount: workers.length,
    premiumDetails,
  });
});

/**
 * POST /api/trigger-event
 * Core payout engine with ML fraud detection and income-tied payouts.
 */
router.post('/trigger-event', async (req, res) => {
  const startTime = Date.now();
  const { zone, event_type, intensity_value } = req.body;
  if (!event_type || intensity_value === undefined) {
    return res.status(400).json({ error: 'Missing event_type or intensity_value.' });
  }

  // Threshold validation
  let isTriggered = false;
  if (event_type === "FLOOD" && intensity_value > 5) isTriggered = true;
  else if (event_type === "SMOG" && intensity_value > 400) isTriggered = true;
  else if (event_type === "HEATWAVE" && intensity_value > 42) isTriggered = true;
  else if (event_type === "CURFEW" && intensity_value === true) isTriggered = true;

  if (!isTriggered) {
    return res.json({ status: "NORMAL", message: "Parametric thresholds stable." });
  }

  const eventLogs = [];
  const processedPayouts = [];
  const simulatedZone = zone || 'Koramangala_1';
  let state = await fetchSystemState();
  let targetPoolEval = state.pool;

  // ML risk assessment for the event
  const mlResult = predictZoneRisk(simulatedZone, {
    rainfall_mm: event_type === 'FLOOD' ? intensity_value : 0,
    temp_c: event_type === 'HEATWAVE' ? intensity_value : 30,
    aqi: event_type === 'SMOG' ? intensity_value : 80,
  });

  eventLogs.push(`[SYSTEM] ${event_type} event detected in ${simulatedZone}. ML Risk: ${mlResult.disruption_probability.toFixed(3)} (${mlResult.risk_classification}).`);
  await writeSystemLog("SYSTEM", eventLogs[0]);

  const workersList = isDBActive() ? await Worker.find({}).lean() : getMemWorkers();

  // Build hardware count for fraud detection
  const hwCount = {};
  for (const w of workersList) { hwCount[w.hardware_id] = (hwCount[w.hardware_id] || 0) + 1; }

  const validClaimants = [];
  const now = Date.now();

  // ---- ML FRAUD ANALYSIS FOR EACH WORKER ----
  for (const worker of workersList) {
    // Build claim context for fraud detector
    const lastHistory = workerHistory.get(worker.wallet_address);
    const claimContext = {
      device_sharing_count: hwCount[worker.hardware_id] || 1,
      claim_hour: new Date().getHours(),
      location_variance: 0.01 + Math.random() * 0.04,
      impossible_traversal: lastHistory && lastHistory.lastZone !== simulatedZone && (now - lastHistory.lastTimestamp < 300000),
      traversal_distance_km: lastHistory ? 300 : 0,
      traversal_minutes: lastHistory ? Math.round((now - lastHistory.lastTimestamp) / 60000) : 999,
    };

    // Run ML fraud analysis
    const fraudResult = analyzeWorkerFraud(worker, workersList, claimContext);

    // Update worker fraud score in DB
    const fraudScore = fraudResult.composite_fraud_score;
    const fraudReason = fraudResult.flags.length > 0 ? fraudResult.flags.join('. ') : 'Cleared';

    if (isDBActive()) {
      await Worker.updateOne(
        { wallet_address: worker.wallet_address },
        { fraud_score: fraudScore, fraud_reason: fraudReason }
      );
    } else {
      worker.fraud_score = fraudScore;
      worker.fraud_reason = fraudReason;
    }

    // Persistent hard block
    if (worker.is_fraud) {
      eventLogs.push(`[BLOCKED] Permanently locked wallet (${worker.name}). Prior syndicate flag.`);
      continue;
    }

    // Fraud verdict routing
    if (fraudResult.verdict === 'BLOCKED') {
      eventLogs.push(`[BLOCKED] ML Fraud Score ${fraudScore.toFixed(2)} for ${worker.name}: ${fraudReason}`);
      if (isDBActive()) await Worker.updateOne({ wallet_address: worker.wallet_address }, { is_fraud: true });
      else worker.is_fraud = true;
    } else if (fraudResult.verdict === 'FLAGGED_REVIEW') {
      eventLogs.push(`[FLAG] ML Fraud Score ${fraudScore.toFixed(2)} for ${worker.name}: ${fraudReason}`);
      validClaimants.push({ worker, fraudResult, flagged: true });
    } else {
      eventLogs.push(`[INFO] Cleared ${worker.name} (ML Score: ${fraudScore.toFixed(2)})`);
      validClaimants.push({ worker, fraudResult, flagged: false });
    }
  }

  // ---- INCOME-TIED PAYOUT CALCULATION ----
  if (validClaimants.length === 0) {
    return res.json({
      status: "PROCESSED", reservePool: state.pool, actualPayout: 0,
      healthStatus: "HEALTHY", logs: eventLogs.concat(["[SYSTEM] No valid claimants qualified."]),
    });
  }

  let totalRequiredCapital = 0;
  const payoutPlans = [];

  for (const { worker } of validClaimants) {
    const payoutCalc = calculateIncomeTiedPayout(worker, event_type, intensity_value, worker.coverage_tier || 'STANDARD');
    payoutPlans.push({ worker, payoutCalc });
    totalRequiredCapital += payoutCalc.final_payout;
  }

  // Proration logic
  let prorationMultiplier = 1.0;
  let isProrated = false;
  let isBankrupt = false;

  if (targetPoolEval >= totalRequiredCapital) {
    prorationMultiplier = 1.0;
  } else if (targetPoolEval > 0) {
    isProrated = true;
    prorationMultiplier = targetPoolEval / totalRequiredCapital;
  } else {
    isBankrupt = true;
  }

  let actualPayout = 0;
  const fundedWallets = [];
  const transactionRecords = [];

  for (const { worker, payoutCalc } of payoutPlans) {
    if (isBankrupt) {
      eventLogs.push(`[CRITICAL FAILURE] Reserve Pool Exhausted. Claim denied for ${worker.name}.`);
      break;
    }

    const individualPayout = Math.round(payoutCalc.final_payout * prorationMultiplier);
    actualPayout += individualPayout;
    fundedWallets.push(worker.wallet_address);

    workerHistory.set(worker.wallet_address, { lastZone: simulatedZone, lastTimestamp: Date.now() });

    if (isDBActive()) {
      await Worker.updateOne(
        { wallet_address: worker.wallet_address },
        {
          $inc: { balance: individualPayout, claim_count: 1, total_payouts_received: individualPayout },
          $set: { last_claim_date: new Date() },
          $push: { claim_history: { event_type, amount: individualPayout, status: isProrated ? 'PRORATED' : 'SUCCESS' } },
        }
      );
      await Transaction.create({
        worker_wallet: worker.wallet_address,
        worker_name: worker.name,
        payout_amount: individualPayout,
        event_type,
        status: isProrated ? 'PRORATED' : 'SUCCESS',
        payout_breakdown: {
          hourly_rate: payoutCalc.breakdown.hourly_rate,
          disruption_hours: payoutCalc.breakdown.disruption_hours,
          coverage_multiplier: payoutCalc.breakdown.coverage_multiplier,
          raw_calculation: payoutCalc.breakdown.raw_calculation,
          cap_applied: payoutCalc.breakdown.cap_applied,
        },
      });
    } else {
      worker.balance = (worker.balance || 0) + individualPayout;
      worker.claim_count = (worker.claim_count || 0) + 1;
    }

    processedPayouts.push({ name: worker.name, wallet: worker.wallet_address, payout: individualPayout });

    if (isProrated) {
      eventLogs.push(`[WARNING] Prorated ₹${individualPayout} to ${worker.name} (was ₹${payoutCalc.final_payout}). Calc: ${payoutCalc.breakdown.raw_calculation}`);
    } else {
      eventLogs.push(`[SUCCESS] ₹${individualPayout} → ${worker.name}. Calc: ${payoutCalc.breakdown.raw_calculation}`);
    }
  }

  // Update treasury
  if (isDBActive()) {
    await Treasury.updateOne({}, {
      $inc: {
        reservePool: -actualPayout,
        totalPayoutsIssued: actualPayout,
        totalClaimsProcessed: fundedWallets.length,
      },
      last_updated: Date.now(),
    });

    // Record claim event for analytics
    await ClaimEvent.create({
      event_id: `EVT-${Date.now().toString(36)}`,
      event_type,
      intensity_value,
      zone: simulatedZone,
      trigger_source: 'SIMULATION',
      workers_eligible: validClaimants.length,
      workers_paid: fundedWallets.length,
      workers_blocked: workersList.length - validClaimants.length,
      total_payout: actualPayout,
      avg_payout_per_worker: fundedWallets.length > 0 ? Math.round(actualPayout / fundedWallets.length) : 0,
      ml_disruption_probability: mlResult.disruption_probability,
      ml_risk_classification: mlResult.risk_classification,
      processing_time_ms: Date.now() - startTime,
    });
  } else {
    memReservePool -= actualPayout;
  }

  let finalState = await fetchSystemState();

  return res.json({
    status: "PROCESSED",
    reservePool: finalState.pool,
    actualPayout,
    healthStatus: isBankrupt ? "CRITICAL: BANKRUPT" : (isProrated ? "CRITICAL: PRORATING" : "HEALTHY"),
    fundedWallets,
    payoutDetails: processedPayouts,
    ml_analysis: {
      disruption_probability: mlResult.disruption_probability,
      risk_classification: mlResult.risk_classification,
      feature_contributions: mlResult.feature_contributions,
    },
    logs: eventLogs,
    processing_time_ms: Date.now() - startTime,
  });
});

module.exports = router;
