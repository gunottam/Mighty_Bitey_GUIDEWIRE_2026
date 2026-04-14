/**
 * GigAegis ML Training Data Module
 * 
 * Generates synthetic but realistic historical data for Bangalore zones.
 * Based on real climate patterns: Bangalore receives ~970mm annual rainfall,
 * concentrated in June-September monsoon. Temperature peaks in April-May.
 * AQI spikes in winter months (Nov-Jan) due to crop burning + inversions.
 * 
 * Each record represents a weekly observation for a zone.
 */

// Bangalore monthly climate baselines (real meteorological data)
const MONTHLY_BASELINES = {
  rainfall_mm: [2, 5, 8, 40, 110, 105, 130, 140, 195, 155, 45, 10],      // Jan-Dec avg
  temp_max_c:  [28, 31, 33, 34, 33, 29, 27, 28, 28, 28, 27, 26],
  aqi_avg:     [120, 100, 90, 75, 65, 55, 50, 50, 55, 80, 130, 145],
  humidity_pct:[45, 40, 35, 45, 60, 75, 80, 80, 78, 72, 60, 50],
};

// Zone-specific modifiers (based on real Bangalore geography)
const ZONE_FEATURES = {
  'Koramangala_1':     { elevation_m: 895, flood_freq_annual: 8,  pop_density: 28000, drainage_score: 0.3, lat: 12.9352, lng: 77.6245 },
  'Koramangala_2':     { elevation_m: 890, flood_freq_annual: 10, pop_density: 31000, drainage_score: 0.2, lat: 12.9258, lng: 77.6234 },
  'Koramangala_3':     { elevation_m: 900, flood_freq_annual: 6,  pop_density: 25000, drainage_score: 0.4, lat: 12.9380, lng: 77.6190 },
  'Indiranagar_1':     { elevation_m: 910, flood_freq_annual: 3,  pop_density: 22000, drainage_score: 0.7, lat: 12.9719, lng: 77.6412 },
  'Indiranagar_2':     { elevation_m: 915, flood_freq_annual: 2,  pop_density: 20000, drainage_score: 0.8, lat: 12.9784, lng: 77.6408 },
  'Whitefield_1':      { elevation_m: 920, flood_freq_annual: 4,  pop_density: 18000, drainage_score: 0.6, lat: 12.9698, lng: 77.7500 },
  'Whitefield_2':      { elevation_m: 905, flood_freq_annual: 5,  pop_density: 21000, drainage_score: 0.5, lat: 12.9600, lng: 77.7450 },
  'HSR_Layout':        { elevation_m: 898, flood_freq_annual: 7,  pop_density: 26000, drainage_score: 0.35, lat: 12.9116, lng: 77.6389 },
  'Bellandur':         { elevation_m: 885, flood_freq_annual: 12, pop_density: 30000, drainage_score: 0.15, lat: 12.9261, lng: 77.6762 },
  'Electronic_City':   { elevation_m: 870, flood_freq_annual: 9,  pop_density: 24000, drainage_score: 0.25, lat: 12.8440, lng: 77.6603 },
  'Marathahalli':      { elevation_m: 908, flood_freq_annual: 5,  pop_density: 27000, drainage_score: 0.45, lat: 12.9562, lng: 77.7019 },
  'JP_Nagar':          { elevation_m: 912, flood_freq_annual: 3,  pop_density: 19000, drainage_score: 0.65, lat: 12.9063, lng: 77.5857 },
};

// Seeded random for reproducibility
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate the full training dataset.
 * 52 weeks × 12 zones = 624 records, each with features + labels.
 */
function generateTrainingData() {
  const data = [];
  const rng = seededRandom(42);

  const zoneNames = Object.keys(ZONE_FEATURES);

  for (let week = 0; week < 52; week++) {
    const month = Math.floor(week / 4.33);
    const monthIdx = Math.min(month, 11);
    const dayOfYear = week * 7;

    // Seasonal encoding (cyclical features for ML)
    const timeSin = Math.sin((2 * Math.PI * dayOfYear) / 365);
    const timeCos = Math.cos((2 * Math.PI * dayOfYear) / 365);

    for (const zoneName of zoneNames) {
      const zone = ZONE_FEATURES[zoneName];

      // Generate weather with realistic variance
      const baseRain = MONTHLY_BASELINES.rainfall_mm[monthIdx] / 4; // weekly
      const rainVariance = baseRain * (0.3 + rng() * 1.4);
      const weeklyRainfall = Math.max(0, baseRain + rainVariance * (rng() > 0.5 ? 1 : -1));

      const baseTemp = MONTHLY_BASELINES.temp_max_c[monthIdx];
      const tempVariance = 2 + rng() * 3;
      const weeklyTempMax = baseTemp + (rng() > 0.5 ? tempVariance : -tempVariance * 0.5);

      const baseAQI = MONTHLY_BASELINES.aqi_avg[monthIdx];
      const aqiVariance = 30 + rng() * 60;
      const weeklyAQI = Math.max(20, baseAQI + (rng() > 0.6 ? aqiVariance : -aqiVariance * 0.3));

      const humidity = MONTHLY_BASELINES.humidity_pct[monthIdx] + (rng() - 0.5) * 15;

      // Zone-adjusted risk features
      const floodRisk = (weeklyRainfall / 50) * (1 - zone.drainage_score) * (1 + zone.flood_freq_annual / 15);
      const heatRisk = Math.max(0, (weeklyTempMax - 38) / 10);
      const smogRisk = Math.max(0, (weeklyAQI - 300) / 200);

      // Composite disruption probability (the label we're predicting)
      const rawDisruptionProb = Math.min(1.0,
        floodRisk * 0.5 + heatRisk * 0.25 + smogRisk * 0.25 +
        (zone.pop_density / 35000) * 0.1 +
        (1 - zone.elevation_m / 930) * 0.05
      );

      // Add noise for realism
      const disruption_probability = Math.min(1.0, Math.max(0, rawDisruptionProb + (rng() - 0.5) * 0.08));

      // Was there an actual disruption this week? (binary, probabilistic)
      const disruption_occurred = rng() < disruption_probability ? 1 : 0;

      // If disruption occurred, how many hours were lost?
      const disruption_hours = disruption_occurred
        ? Math.min(24, Math.max(2, Math.round((disruption_probability * 16 + rng() * 8) * 10) / 10))
        : 0;

      // Actuarial fair premium = E[payout] = disruption_prob × avg_payout
      // avg_payout ≈ avg_hourly_earnings(₹85) × avg_disruption_hours(8)
      const fair_premium = disruption_probability * 85 * 8;
      const recommended_premium = Math.round(fair_premium * 1.3 + 10); // 30% margin + admin cost

      data.push({
        // Features for ML
        zone_name: zoneName,
        week_of_year: week,
        time_sin: parseFloat(timeSin.toFixed(4)),
        time_cos: parseFloat(timeCos.toFixed(4)),
        weekly_rainfall_mm: parseFloat(weeklyRainfall.toFixed(1)),
        temp_max_c: parseFloat(weeklyTempMax.toFixed(1)),
        aqi: Math.round(weeklyAQI),
        humidity_pct: parseFloat(humidity.toFixed(1)),
        elevation_m: zone.elevation_m,
        flood_freq_annual: zone.flood_freq_annual,
        pop_density: zone.pop_density,
        drainage_score: zone.drainage_score,

        // Labels
        disruption_probability: parseFloat(disruption_probability.toFixed(4)),
        disruption_occurred,
        disruption_hours,
        recommended_premium,
      });
    }
  }

  return data;
}

/**
 * Get static zone features for a given zone name.
 * Falls back to nearest match or defaults.
 */
function getZoneFeatures(zoneName) {
  if (ZONE_FEATURES[zoneName]) return { name: zoneName, ...ZONE_FEATURES[zoneName] };

  // Fuzzy match: if user passes "Koramangala", match to Koramangala_1
  const fuzzyKey = Object.keys(ZONE_FEATURES).find(k =>
    k.toLowerCase().startsWith(zoneName.toLowerCase())
  );
  if (fuzzyKey) return { name: fuzzyKey, ...ZONE_FEATURES[fuzzyKey] };

  // Default fallback
  return {
    name: zoneName,
    elevation_m: 900,
    flood_freq_annual: 5,
    pop_density: 22000,
    drainage_score: 0.5,
    lat: 12.95,
    lng: 77.65
  };
}

module.exports = {
  generateTrainingData,
  getZoneFeatures,
  ZONE_FEATURES,
  MONTHLY_BASELINES
};
