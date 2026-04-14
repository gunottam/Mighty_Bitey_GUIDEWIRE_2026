/**
 * GigAegis Income-Tied Payout Calculator
 * 
 * The core innovation that was MISSING in Phase 1.
 * 
 * Instead of paying a flat ₹2000 to everyone, payouts are calculated based on:
 *   payout = worker_hourly_rate × disruption_hours × coverage_multiplier
 * 
 * Where:
 *   - worker_hourly_rate comes from their earnings history
 *   - disruption_hours is estimated from event severity + historical duration data
 *   - coverage_multiplier scales based on their policy tier (0.7 basic, 0.85 standard, 1.0 premium)
 * 
 * Payout is capped at the worker's declared weekly coverage limit.
 */

// Disruption duration estimation based on event type and severity
const DISRUPTION_DURATION_MAP = {
  FLOOD: {
    // rainfall_mm -> estimated disruption hours
    thresholds: [
      { min: 50,  max: 80,  avgHours: 4,  label: 'Moderate Flood' },
      { min: 80,  max: 120, avgHours: 8,  label: 'Severe Flood' },
      { min: 120, max: 200, avgHours: 14, label: 'Extreme Flash Flood' },
      { min: 200, max: 9999, avgHours: 24, label: 'Catastrophic Flood' },
    ],
  },
  HEATWAVE: {
    thresholds: [
      { min: 42, max: 45, avgHours: 4, label: 'Severe Heat Advisory' },
      { min: 45, max: 48, avgHours: 8, label: 'Extreme Heat Warning' },
      { min: 48, max: 99, avgHours: 12, label: 'Lethal Heat Emergency' },
    ],
  },
  SMOG: {
    thresholds: [
      { min: 400, max: 450, avgHours: 6,  label: 'Hazardous Air Quality' },
      { min: 450, max: 500, avgHours: 10, label: 'Severe Toxic Smog' },
      { min: 500, max: 9999, avgHours: 16, label: 'Emergency Air Shutdown' },
    ],
  },
  CURFEW: {
    thresholds: [
      { min: 1, max: 9999, avgHours: 12, label: 'Government Curfew Order' },
    ],
  },
};

// Coverage tier multipliers
const COVERAGE_TIERS = {
  BASIC:   { multiplier: 0.70, label: 'Basic (70%)', maxPayout: 2000 },
  STANDARD: { multiplier: 0.85, label: 'Standard (85%)', maxPayout: 3500 },
  PREMIUM:  { multiplier: 1.00, label: 'Premium (100%)', maxPayout: 5000 },
};

// Default hourly earnings benchmark (when worker has no history)
const DEFAULT_HOURLY_EARNINGS = 85; // ₹85/hr — Zomato average in Bangalore

/**
 * Estimate disruption duration based on event type and intensity.
 */
function estimateDisruptionHours(eventType, intensityValue) {
  const eventMap = DISRUPTION_DURATION_MAP[eventType];
  if (!eventMap) return { hours: 4, label: 'Unknown Disruption Type' };

  for (const level of eventMap.thresholds) {
    if (intensityValue >= level.min && intensityValue < level.max) {
      // Add ±15% variance for realism  
      const variance = level.avgHours * 0.15;
      const actualHours = Math.round((level.avgHours + (Math.random() - 0.5) * variance * 2) * 10) / 10;
      return {
        hours: Math.max(1, actualHours),
        label: level.label,
        severity_band: `${level.min}-${level.max}`,
      };
    }
  }

  return { hours: 4, label: `${eventType} (below threshold)` };
}

/**
 * Calculate the worker's effective hourly earnings rate.
 * Uses their earnings history if available, otherwise defaults.
 * 
 * @param {object} worker - Worker document with earnings history
 * @returns {object} { hourly_rate, source, confidence }
 */
function calculateHourlyRate(worker) {
  const history = worker.earnings_history || [];

  if (history.length === 0) {
    return {
      hourly_rate: DEFAULT_HOURLY_EARNINGS,
      source: 'default_benchmark',
      confidence: 0.3,
      note: 'Using Bangalore delivery partner average (no history available)',
    };
  }

  // Use weighted recent average (more recent weeks weighted higher)
  let weightedSum = 0;
  let weightTotal = 0;

  // Sort by most recent first
  const sorted = [...history].sort((a, b) =>
    new Date(b.week_ending || b.date || 0) - new Date(a.week_ending || a.date || 0)
  );

  // Use last 8 weeks max
  const recentHistory = sorted.slice(0, 8);

  recentHistory.forEach((entry, index) => {
    const weight = 1 / (index + 1); // Decaying weight
    const earnings = entry.total_earnings || entry.earnings || 0;
    const hours = entry.hours_worked || entry.hours || 1;
    const rate = earnings / hours;
    weightedSum += rate * weight;
    weightTotal += weight;
  });

  const effectiveRate = Math.round(weightedSum / weightTotal);

  return {
    hourly_rate: effectiveRate,
    source: 'earnings_history',
    confidence: Math.min(0.95, 0.4 + recentHistory.length * 0.07),
    weeks_analyzed: recentHistory.length,
    note: `Calculated from ${recentHistory.length} weeks of delivery data`,
  };
}

/**
 * Calculate income-tied payout for a worker during a disruption event.
 * 
 * @param {object} worker - Worker document
 * @param {string} eventType - FLOOD, HEATWAVE, SMOG, CURFEW
 * @param {number} intensityValue - Event intensity measurement
 * @param {string} coverageTier - BASIC, STANDARD, PREMIUM
 * @returns {object} Complete payout calculation with breakdown
 */
function calculateIncomeTiedPayout(worker, eventType, intensityValue, coverageTier = 'STANDARD') {
  // Step 1: Get the worker's hourly rate
  const rateInfo = calculateHourlyRate(worker);

  // Step 2: Estimate disruption duration
  const disruptionInfo = estimateDisruptionHours(eventType, intensityValue);

  // Step 3: Get coverage tier
  const tier = COVERAGE_TIERS[coverageTier] || COVERAGE_TIERS.STANDARD;

  // Step 4: Calculate raw payout
  const rawPayout = rateInfo.hourly_rate * disruptionInfo.hours * tier.multiplier;

  // Step 5: Cap at tier maximum
  const cappedPayout = Math.min(rawPayout, tier.maxPayout);

  // Step 6: Round to nearest ₹10
  const finalPayout = Math.round(cappedPayout / 10) * 10;

  return {
    final_payout: finalPayout,
    breakdown: {
      hourly_rate: rateInfo.hourly_rate,
      hourly_rate_source: rateInfo.source,
      hourly_rate_confidence: rateInfo.confidence,
      disruption_hours: disruptionInfo.hours,
      disruption_label: disruptionInfo.label,
      coverage_tier: tier.label,
      coverage_multiplier: tier.multiplier,
      raw_calculation: `₹${rateInfo.hourly_rate}/hr × ${disruptionInfo.hours}hrs × ${tier.multiplier} = ₹${Math.round(rawPayout)}`,
      cap_applied: rawPayout > tier.maxPayout,
      cap_limit: tier.maxPayout,
    },
    formula: `payout = hourly_earnings(₹${rateInfo.hourly_rate}) × disruption_hours(${disruptionInfo.hours}) × coverage(${tier.multiplier})`,
    event_context: {
      event_type: eventType,
      intensity_value: intensityValue,
      severity_band: disruptionInfo.severity_band,
    },
  };
}

/**
 * Calculate what the worker's weekly premium should be
 * based on their earnings (income-proportional pricing).
 * 
 * Premium = base_rate% × weekly_earnings × zone_risk_multiplier
 * 
 * @param {object} worker - Worker document
 * @param {number} mlRiskScore - ML-predicted disruption probability for their zone
 * @returns {object} Premium calculation with breakdown
 */
function calculateIncomeTiedPremium(worker, mlRiskScore = 0.3) {
  const rateInfo = calculateHourlyRate(worker);
  const typicalWeeklyHours = worker.typical_hours_per_week || 45;
  const estimatedWeeklyEarnings = rateInfo.hourly_rate * typicalWeeklyHours;

  // Base premium rate: 1.5% of weekly earnings (industry standard for parametric micro-insurance)
  const basePremiumRate = 0.015;

  // Risk adjustment: scale premium by ML-predicted disruption probability
  // Low risk (0.1) → 0.7x multiplier, High risk (0.8) → 1.5x multiplier
  const riskMultiplier = 0.5 + mlRiskScore * 1.25;

  const rawPremium = estimatedWeeklyEarnings * basePremiumRate * riskMultiplier;
  const finalPremium = Math.max(15, Math.min(200, Math.round(rawPremium)));

  return {
    weekly_premium: finalPremium,
    breakdown: {
      estimated_weekly_earnings: Math.round(estimatedWeeklyEarnings),
      hourly_rate: rateInfo.hourly_rate,
      typical_hours: typicalWeeklyHours,
      base_premium_rate: `${(basePremiumRate * 100).toFixed(1)}%`,
      ml_risk_score: mlRiskScore,
      risk_multiplier: parseFloat(riskMultiplier.toFixed(2)),
      formula: `₹${Math.round(estimatedWeeklyEarnings)} × ${(basePremiumRate * 100).toFixed(1)}% × ${riskMultiplier.toFixed(2)} = ₹${finalPremium}`,
    },
  };
}

module.exports = {
  calculateIncomeTiedPayout,
  calculateIncomeTiedPremium,
  calculateHourlyRate,
  estimateDisruptionHours,
  COVERAGE_TIERS,
  DISRUPTION_DURATION_MAP,
};
