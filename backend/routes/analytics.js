/**
 * GigAegis Analytics Routes
 * Dashboard data: loss ratios, predictions, claim history, zone heatmaps.
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Worker, Transaction, Treasury, ClaimEvent, AnalyticsSnapshot } = require('../models/GigAegisDB');
const { predictZoneRisk, getModelMetrics } = require('../ml/riskModel');
const { getAllZones, getZoneStats } = require('../config/zones');

const isDBActive = () => mongoose.connection.readyState === 1;

/**
 * GET /api/analytics/dashboard
 * Main analytics dashboard data.
 */
router.get('/dashboard', async (req, res) => {
  let totalWorkers = 0, totalClaims = 0, totalPayouts = 0, totalPremiums = 0;
  let reservePool = 100000, fraudBlocked = 0;
  let recentTransactions = [];

  if (isDBActive()) {
    totalWorkers = await Worker.countDocuments();
    const treasury = await Treasury.findOne({});
    if (treasury) {
      reservePool = treasury.reservePool;
      totalPremiums = treasury.premiumsCollected;
      totalPayouts = treasury.totalPayoutsIssued || 0;
      totalClaims = treasury.totalClaimsProcessed || 0;
      fraudBlocked = treasury.totalFraudBlocked || 0;
    }
    recentTransactions = await Transaction.find({}).sort({ timestamp: -1 }).limit(20).lean();
  } else {
    const honest = require('../../honest_workers.json');
    const fraud = require('../../fraud_syndicate.json');
    totalWorkers = honest.length + fraud.length;
  }

  const lossRatio = totalPremiums > 0 ? parseFloat((totalPayouts / totalPremiums).toFixed(3)) : 0;
  const fraudRate = totalClaims > 0 ? parseFloat((fraudBlocked / (totalClaims + fraudBlocked)).toFixed(3)) : 0;
  const avgPayout = totalClaims > 0 ? Math.round(totalPayouts / totalClaims) : 0;

  // Zone risk heatmap
  const zones = getAllZones().map(zone => {
    const ml = predictZoneRisk(zone.id);
    return {
      id: zone.id,
      display_name: zone.display_name,
      grid_id: zone.grid_id,
      classification: zone.classification,
      risk_color: zone.risk_color,
      ml_risk_score: ml.disruption_probability,
      ml_premium: ml.recommended_weekly_premium,
    };
  });

  // Zone stats
  const zoneStats = getZoneStats();

  return res.json({
    overview: {
      active_policies: totalWorkers,
      total_claims_processed: totalClaims,
      total_premiums_collected: totalPremiums,
      total_payouts_issued: totalPayouts,
      reserve_pool: reservePool,
      loss_ratio: lossRatio,
      fraud_rate: fraudRate,
      avg_payout_per_claim: avgPayout,
      fraud_blocked: fraudBlocked,
    },
    zones,
    zone_stats: zoneStats,
    recent_transactions: recentTransactions,
    ml_model: getModelMetrics(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/analytics/predictions
 * Next-week risk forecast per zone.
 */
router.get('/predictions', async (req, res) => {
  const predictions = getAllZones().map(zone => {
    // Predict for current conditions
    const current = predictZoneRisk(zone.id);

    // Simulate next week (slightly varied weather)
    const nextWeek = predictZoneRisk(zone.id, {
      rainfall_mm: (current.feature_contributions?.weekly_rainfall_mm || 0) * 1.1,
      temp_c: 32,
      aqi: 90,
      humidity: 65,
    });

    return {
      zone_id: zone.id,
      display_name: zone.display_name,
      current_risk: current.disruption_probability,
      current_classification: current.risk_classification,
      predicted_next_week_risk: nextWeek.disruption_probability,
      predicted_classification: nextWeek.risk_classification,
      trend: nextWeek.disruption_probability > current.disruption_probability ? 'INCREASING' : 'STABLE',
      recommended_premium: nextWeek.recommended_weekly_premium,
      top_risk_factors: Object.entries(current.feature_contributions)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([feature, contribution]) => ({ feature, contribution })),
    };
  });

  return res.json({
    predictions,
    forecast_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    model_confidence: predictions.reduce((sum, p) => sum + p.current_risk, 0) / predictions.length,
  });
});

/**
 * GET /api/analytics/claims-history
 * Paginated claim event history.
 */
router.get('/claims-history', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (isDBActive()) {
    const total = await ClaimEvent.countDocuments();
    const claims = await ClaimEvent.find({})
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      claims,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  // Fallback: return empty
  return res.json({
    claims: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    note: "Database offline — claim history unavailable."
  });
});

/**
 * GET /api/analytics/ml-explainability
 * Full ML model explainability data.
 */
router.get('/ml-explainability', (req, res) => {
  const metrics = getModelMetrics();
  const zoneExplainability = getAllZones().map(zone => {
    const prediction = predictZoneRisk(zone.id);
    return {
      zone_id: zone.id,
      display_name: zone.display_name,
      prediction: prediction.disruption_probability,
      classification: prediction.risk_classification,
      feature_contributions: prediction.feature_contributions,
      model_confidence: prediction.model_confidence,
    };
  });

  return res.json({
    model_info: {
      type: 'Gradient Boosted Decision Trees (GBDT)',
      implementation: 'Pure JavaScript (no Python dependencies)',
      n_estimators: metrics.n_estimators,
      learning_rate: metrics.learning_rate,
      max_depth: metrics.max_depth,
      training_data_size: 624,
      features_used: 10,
    },
    global_feature_importance: metrics.feature_importance,
    zone_predictions: zoneExplainability,
  });
});

/**
 * GET /api/analytics/validation
 * Run full production validation suite (Tasks 1-6).
 * Returns: ML metrics, economic simulation, fraud benchmark, geo risk, judge summary.
 */
router.get('/validation', async (req, res) => {
  try {
    const { runFullValidation } = require('../ml/validation');
    const result = runFullValidation();
    return res.json({ status: 'COMPLETE', ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;

