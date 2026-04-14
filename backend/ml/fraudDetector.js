/**
 * GigAegis ML Fraud Detector
 * 
 * Two-stage fraud detection:
 * 
 * Stage 1: Isolation Forest (Anomaly Detection)
 *   - Scores each claim on behavioral features
 *   - Anomalies get high isolation scores (fewer splits to isolate = more anomalous)
 * 
 * Stage 2: Graph-Based Syndicate Detection
 *   - Builds adjacency graph of workers sharing suspicious links
 *   - Connected components with >2 nodes = syndicate cluster
 *   - Links: shared hardware_id, GPS proximity during non-work hours, 
 *     suspiciously correlated claim timing
 */

// ============================================
// ISOLATION FOREST
// ============================================

class IsolationTree {
  constructor(maxDepth) {
    this.maxDepth = maxDepth;
    this.root = null;
  }

  /**
   * Build an isolation tree from a sample of data points.
   */
  fit(data, featureIndices) {
    this.root = this._buildNode(data, featureIndices, 0);
    return this;
  }

  _buildNode(data, featureIndices, depth) {
    // Terminal conditions
    if (depth >= this.maxDepth || data.length <= 1) {
      return { isLeaf: true, size: data.length, depth };
    }

    // Random feature and random split
    const featureIdx = featureIndices[Math.floor(Math.random() * featureIndices.length)];
    const values = data.map(d => d[featureIdx]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return { isLeaf: true, size: data.length, depth };
    }

    const splitValue = min + Math.random() * (max - min);

    const left = data.filter(d => d[featureIdx] < splitValue);
    const right = data.filter(d => d[featureIdx] >= splitValue);

    return {
      isLeaf: false,
      featureIdx,
      splitValue,
      left: this._buildNode(left, featureIndices, depth + 1),
      right: this._buildNode(right, featureIndices, depth + 1),
    };
  }

  /**
   * Get path length (number of edges) to isolate a data point.
   */
  pathLength(point) {
    return this._pathLength(point, this.root, 0);
  }

  _pathLength(point, node, currentDepth) {
    if (node.isLeaf) {
      // Adjustment for unsplit data: average path length of BST
      return currentDepth + averagePathLength(node.size);
    }

    if (point[node.featureIdx] < node.splitValue) {
      return this._pathLength(point, node.left, currentDepth + 1);
    } else {
      return this._pathLength(point, node.right, currentDepth + 1);
    }
  }
}

class IsolationForest {
  constructor(config = {}) {
    this.nTrees = config.nTrees || 100;
    this.maxSamples = config.maxSamples || 256;
    this.maxDepth = config.maxDepth || Math.ceil(Math.log2(config.maxSamples || 256));
    this.trees = [];
    this.trained = false;
  }

  /**
   * Fit the isolation forest on training data.
   * @param {Array<Array<number>>} data - Array of feature vectors
   */
  fit(data) {
    const featureIndices = data[0] ? data[0].map((_, i) => i) : [];
    const n = data.length;

    // Seed RNG for reproducibility during training
    let seed = 12345;
    const rng = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const origRandom = Math.random;
    Math.random = rng;

    for (let t = 0; t < this.nTrees; t++) {
      // Bootstrap sample
      const sampleSize = Math.min(this.maxSamples, n);
      const sample = [];
      for (let i = 0; i < sampleSize; i++) {
        sample.push(data[Math.floor(rng() * n)]);
      }

      const tree = new IsolationTree(this.maxDepth);
      tree.fit(sample, featureIndices);
      this.trees.push(tree);
    }

    Math.random = origRandom;
    this.trained = true;
    this._dataSize = n;
  }

  /**
   * Score a single data point. Returns anomaly score in [0, 1].
   * Score > 0.5 = anomalous, Score ≈ 0.5 = normal, Score < 0.5 = very normal.
   */
  score(point) {
    if (!this.trained) throw new Error('Isolation Forest not trained');

    const avgPathLength = this.trees.reduce((sum, tree) => sum + tree.pathLength(point), 0) / this.trees.length;
    const c = averagePathLength(this._dataSize);

    // Anomaly score formula: s(x, n) = 2^(-E[h(x)] / c(n))
    const anomalyScore = Math.pow(2, -avgPathLength / c);
    return parseFloat(anomalyScore.toFixed(4));
  }
}

/**
 * Average path length of unsuccessful search in BST.
 * H(i) = ln(i) + 0.5772156649 (Euler's constant)
 */
function averagePathLength(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

// ============================================
// GRAPH-BASED SYNDICATE DETECTION
// ============================================

class SyndicateGraph {
  constructor() {
    this.adjacency = new Map(); // wallet -> Set<wallet>
    this.edgeReasons = new Map(); // "walletA|walletB" -> [reasons]
  }

  addNode(wallet) {
    if (!this.adjacency.has(wallet)) {
      this.adjacency.set(wallet, new Set());
    }
  }

  addEdge(wallet1, wallet2, reason) {
    this.addNode(wallet1);
    this.addNode(wallet2);
    this.adjacency.get(wallet1).add(wallet2);
    this.adjacency.get(wallet2).add(wallet1);

    const edgeKey = [wallet1, wallet2].sort().join('|');
    if (!this.edgeReasons.has(edgeKey)) {
      this.edgeReasons.set(edgeKey, []);
    }
    this.edgeReasons.get(edgeKey).push(reason);
  }

  /**
   * Find connected components using BFS.
   * Returns array of { members: [wallets], reasons: [string] }
   */
  findClusters() {
    const visited = new Set();
    const clusters = [];

    for (const [wallet] of this.adjacency) {
      if (visited.has(wallet)) continue;

      const cluster = [];
      const reasons = new Set();
      const queue = [wallet];

      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        cluster.push(current);

        for (const neighbor of this.adjacency.get(current)) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);

            const edgeKey = [current, neighbor].sort().join('|');
            const edgeReasons = this.edgeReasons.get(edgeKey) || [];
            edgeReasons.forEach(r => reasons.add(r));
          }
        }
      }

      if (cluster.length > 1) {
        clusters.push({
          members: cluster,
          size: cluster.length,
          reasons: [...reasons],
          severity: cluster.length >= 4 ? 'CRITICAL' : cluster.length >= 3 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return clusters;
  }
}

// ============================================
// FEATURE EXTRACTION FOR FRAUD SCORING
// ============================================

const FRAUD_FEATURE_NAMES = [
  'claim_frequency_7d',       // Claims in last 7 days
  'claim_frequency_30d',      // Claims in last 30 days
  'avg_payout_amount',        // Average payout received
  'payout_velocity',          // Payouts per day recently
  'location_variance',        // GPS coordinate variance (stationary = suspicious)
  'time_of_claim_hour',       // Hour of day (claims at 3am = suspicious)
  'accelerometer_activity',   // Movement signal (0 = static, 1 = moving)
  'device_sharing_count',     // Number of wallets on same hardware_id
];

/**
 * Extract fraud features from a worker + claim context.
 */
function extractFraudFeatures(worker, claimContext = {}) {
  const claimHistory = worker.claim_history || [];
  const now = Date.now();
  const day7 = 7 * 24 * 60 * 60 * 1000;
  const day30 = 30 * 24 * 60 * 60 * 1000;

  const claims7d = claimHistory.filter(c => (now - new Date(c.timestamp).getTime()) < day7).length;
  const claims30d = claimHistory.filter(c => (now - new Date(c.timestamp).getTime()) < day30).length;

  const payouts = claimHistory.map(c => c.amount || 0);
  const avgPayout = payouts.length > 0 ? payouts.reduce((a, b) => a + b, 0) / payouts.length : 0;

  // Payout velocity: payouts per day in last 7 days
  const payoutVelocity = claims7d / 7;

  // Location variance: if GPS coords barely change, they might be spoofing from one spot
  const locationVariance = claimContext.location_variance || 0.001;

  const claimHour = claimContext.claim_hour || new Date().getHours();

  const accelActivity = worker.accelerometer_moving ? 1.0 : 0.0;

  const deviceSharing = claimContext.device_sharing_count || 1;

  return [
    claims7d,
    claims30d,
    avgPayout / 1000, // Normalize
    payoutVelocity,
    locationVariance,
    claimHour / 24,   // Normalize to [0, 1]
    accelActivity,
    deviceSharing / 5, // Normalize
  ];
}

// ============================================
// MAIN FRAUD DETECTION ENGINE
// ============================================

let isolationForest = null;

/**
 * Initialize the Isolation Forest with baseline normal behavior data.
 */
function initializeFraudDetector() {
  if (isolationForest && isolationForest.trained) return;

  console.log('[GigAegis ML] Initializing Isolation Forest Fraud Detector...');

  // Generate normal behavior baseline (what legitimate workers look like)
  const normalData = [];
  for (let i = 0; i < 200; i++) {
    normalData.push([
      Math.floor(Math.random() * 2),         // claims_7d: 0-1
      Math.floor(Math.random() * 4),         // claims_30d: 0-3
      (500 + Math.random() * 1500) / 1000,   // avg_payout: ₹500-2000 normalized
      Math.random() * 0.15,                   // payout_velocity: low
      0.005 + Math.random() * 0.05,           // location_variance: moving around
      (8 + Math.random() * 12) / 24,          // claim_hour: 8am-8pm normal
      0.8 + Math.random() * 0.2,              // accel_activity: mostly moving
      1 / 5,                                   // device_sharing: 1 device
    ]);
  }

  isolationForest = new IsolationForest({ nTrees: 100, maxSamples: 128 });
  isolationForest.fit(normalData);

  console.log(`[GigAegis ML] Isolation Forest trained on ${normalData.length} normal behavior profiles.`);
}

/**
 * Run full fraud analysis on a worker during a claim.
 * @param {object} worker - Worker document
 * @param {Array} allWorkers - All workers (for syndicate graph)
 * @param {object} claimContext - Additional claim context
 * @returns {object} Fraud verdict with explanation
 */
function analyzeWorkerFraud(worker, allWorkers = [], claimContext = {}) {
  initializeFraudDetector();

  // --- Stage 1: Isolation Forest Anomaly Score ---
  const features = extractFraudFeatures(worker, claimContext);
  const isolationScore = isolationForest.score(features);

  // --- Stage 2: Rule-enhanced scoring (keeps the good parts from Phase 1) ---
  let ruleScore = 0;
  const ruleFlags = [];

  // Hardware duplication check (lowered threshold: even 2 accounts per device is suspicious)
  const hwCount = claimContext.device_sharing_count || 1;
  if (hwCount > 1) {
    ruleScore += 0.15 + (hwCount - 1) * 0.1; // Scales with severity
    ruleFlags.push(`Device shared across ${hwCount} accounts (threshold: 2)`);
  }

  // Kinetic anomaly
  if (!worker.accelerometer_moving) {
    ruleScore += 0.25;
    ruleFlags.push('No physical movement detected during claimed disruption');
  }

  // Impossible traversal
  if (claimContext.impossible_traversal) {
    ruleScore += 0.35;
    ruleFlags.push(`Location hop: ${claimContext.traversal_distance_km}km in ${claimContext.traversal_minutes}min`);
  }

  // High payout frequency (7d)
  const recentClaims = (worker.claim_history || []).filter(
    c => (Date.now() - new Date(c.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
  ).length;
  if (recentClaims >= 3) {
    ruleScore += 0.25;
    ruleFlags.push(`${recentClaims} claims in last 7 days (threshold: 3)`);
  }

  // High payout frequency (30d)
  const monthlyClaims = (worker.claim_history || []).filter(
    c => (Date.now() - new Date(c.timestamp).getTime()) < 30 * 24 * 60 * 60 * 1000
  ).length;
  if (monthlyClaims >= 5) {
    ruleScore += 0.15;
    ruleFlags.push(`${monthlyClaims} claims in last 30 days (threshold: 5)`);
  }

  // Low location variance (GPS spoofing/stationary fraud)
  if ((claimContext.location_variance || 0.05) < 0.008) {
    ruleScore += 0.15;
    ruleFlags.push(`Suspiciously low GPS variance: ${(claimContext.location_variance * 1000).toFixed(1)}m`);
  }

  // --- Stage 3: Syndicate Graph Analysis ---
  const graph = new SyndicateGraph();
  for (const w of allWorkers) {
    graph.addNode(w.wallet_address);
  }

  // Build edges based on shared hardware
  const hwGroups = {};
  for (const w of allWorkers) {
    if (!hwGroups[w.hardware_id]) hwGroups[w.hardware_id] = [];
    hwGroups[w.hardware_id].push(w.wallet_address);
  }

  for (const [hwId, wallets] of Object.entries(hwGroups)) {
    if (wallets.length > 1) {
      for (let i = 0; i < wallets.length; i++) {
        for (let j = i + 1; j < wallets.length; j++) {
          graph.addEdge(wallets[i], wallets[j], `Shared device: ${hwId}`);
        }
      }
    }
  }

  // Build edges based on GPS proximity (< 50m apart)
  for (let i = 0; i < allWorkers.length; i++) {
    for (let j = i + 1; j < allWorkers.length; j++) {
      const d = gpsDistance(
        allWorkers[i].gps_lat, allWorkers[i].gps_lng,
        allWorkers[j].gps_lat, allWorkers[j].gps_lng
      );
      if (d < 0.05 && allWorkers[i].hardware_id === allWorkers[j].hardware_id) {
        graph.addEdge(allWorkers[i].wallet_address, allWorkers[j].wallet_address, `GPS proximity: ${(d * 1000).toFixed(0)}m`);
      }
    }
  }

  const clusters = graph.findClusters();
  const workerCluster = clusters.find(c => c.members.includes(worker.wallet_address));

  let syndicateScore = 0;
  if (workerCluster) {
    syndicateScore = Math.min(0.5, workerCluster.size * 0.12);
    ruleFlags.push(`Part of ${workerCluster.size}-member syndicate cluster`);
  }

  // --- Composite Score ---
  // Weighted combination: 40% Isolation Forest + 35% Rule Engine + 25% Syndicate Graph
  const compositeScore = Math.min(1.0,
    isolationScore * 0.4 +
    ruleScore * 0.35 +
    syndicateScore * 0.25
  );

  // Verdict (lowered threshold for better recall)
  let verdict = 'APPROVED';
  if (compositeScore >= 0.65) verdict = 'BLOCKED';
  else if (compositeScore >= 0.35) verdict = 'FLAGGED_REVIEW';

  return {
    verdict,
    composite_fraud_score: parseFloat(compositeScore.toFixed(3)),
    breakdown: {
      isolation_forest_score: isolationScore,
      rule_engine_score: parseFloat(ruleScore.toFixed(2)),
      syndicate_graph_score: parseFloat(syndicateScore.toFixed(2)),
    },
    flags: ruleFlags,
    syndicate_cluster: workerCluster || null,
    all_syndicates: clusters,
    feature_vector: FRAUD_FEATURE_NAMES.reduce((obj, name, i) => {
      obj[name] = parseFloat(features[i].toFixed(4));
      return obj;
    }, {}),
  };
}

/**
 * Haversine GPS distance in kilometers.
 */
function gpsDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = {
  initializeFraudDetector,
  analyzeWorkerFraud,
  FRAUD_FEATURE_NAMES,
};
