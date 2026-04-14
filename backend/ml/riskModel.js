/**
 * GigAegis ML Risk Model
 * 
 * A Gradient Boosted Decision Tree (GBDT) regression model implemented in pure JavaScript.
 * No Python, no TensorFlow, no external ML library — runs natively in Node.js.
 * 
 * The model predicts:
 *   1. disruption_probability (0.0–1.0) for a zone given current conditions
 *   2. recommended_weekly_premium (₹) based on actuarial fair pricing + margin
 * 
 * Architecture:
 *   - Ensemble of shallow decision stumps (depth-2 trees)
 *   - Gradient boosting with shrinkage (learning_rate = 0.1)
 *   - 50 boosting rounds
 *   - Feature importance tracked via split frequency
 */

const { generateTrainingData, getZoneFeatures, MONTHLY_BASELINES } = require('./trainingData');

// ============================================
// DECISION TREE PRIMITIVES
// ============================================

/**
 * A single decision stump (depth-limited tree node).
 */
class DecisionNode {
  constructor() {
    this.featureIndex = -1;
    this.threshold = 0;
    this.leftValue = 0;
    this.rightValue = 0;
    this.leftChild = null;
    this.rightChild = null;
    this.isLeaf = false;
    this.value = 0;
  }

  predict(features) {
    if (this.isLeaf) return this.value;
    if (features[this.featureIndex] <= this.threshold) {
      return this.leftChild ? this.leftChild.predict(features) : this.leftValue;
    } else {
      return this.rightChild ? this.rightChild.predict(features) : this.rightValue;
    }
  }
}

/**
 * Build a depth-limited regression tree on residuals.
 */
function buildTree(X, residuals, maxDepth, minSamplesLeaf = 5) {
  const node = new DecisionNode();

  if (maxDepth === 0 || X.length < minSamplesLeaf * 2) {
    node.isLeaf = true;
    node.value = mean(residuals);
    return node;
  }

  let bestGain = -Infinity;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeftIdx = [];
  let bestRightIdx = [];

  const nFeatures = X[0].length;
  const totalVariance = variance(residuals);

  // Try each feature, sample up to 10 thresholds
  for (let f = 0; f < nFeatures; f++) {
    const values = X.map(row => row[f]);
    const sorted = [...new Set(values)].sort((a, b) => a - b);
    const step = Math.max(1, Math.floor(sorted.length / 10));

    for (let t = 0; t < sorted.length; t += step) {
      const threshold = sorted[t];
      const leftIdx = [];
      const rightIdx = [];

      for (let i = 0; i < X.length; i++) {
        if (X[i][f] <= threshold) leftIdx.push(i);
        else rightIdx.push(i);
      }

      if (leftIdx.length < minSamplesLeaf || rightIdx.length < minSamplesLeaf) continue;

      const leftResiduals = leftIdx.map(i => residuals[i]);
      const rightResiduals = rightIdx.map(i => residuals[i]);

      const leftVar = variance(leftResiduals);
      const rightVar = variance(rightResiduals);

      const weightedVar = (leftIdx.length * leftVar + rightIdx.length * rightVar) / X.length;
      const gain = totalVariance - weightedVar;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = threshold;
        bestLeftIdx = leftIdx;
        bestRightIdx = rightIdx;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 0) {
    node.isLeaf = true;
    node.value = mean(residuals);
    return node;
  }

  node.featureIndex = bestFeature;
  node.threshold = bestThreshold;

  const leftX = bestLeftIdx.map(i => X[i]);
  const leftR = bestLeftIdx.map(i => residuals[i]);
  const rightX = bestRightIdx.map(i => X[i]);
  const rightR = bestRightIdx.map(i => residuals[i]);

  node.leftChild = buildTree(leftX, leftR, maxDepth - 1, minSamplesLeaf);
  node.rightChild = buildTree(rightX, rightR, maxDepth - 1, minSamplesLeaf);

  return node;
}

// ============================================
// GRADIENT BOOSTED MODEL
// ============================================

const FEATURE_NAMES = [
  'weekly_rainfall_mm', 'temp_max_c', 'aqi', 'humidity_pct',
  'elevation_m', 'flood_freq_annual', 'pop_density', 'drainage_score',
  'time_sin', 'time_cos'
];

class GradientBoostedModel {
  constructor(config = {}) {
    this.nEstimators = config.nEstimators || 50;
    this.learningRate = config.learningRate || 0.1;
    this.maxDepth = config.maxDepth || 3;
    this.trees = [];
    this.basePrediction = 0;
    this.featureImportance = {};
    this.trained = false;

    FEATURE_NAMES.forEach(name => { this.featureImportance[name] = 0; });
  }

  /**
   * Extract numeric feature vector from a data record.
   */
  extractFeatures(record) {
    return [
      record.weekly_rainfall_mm || 0,
      record.temp_max_c || 0,
      record.aqi || 0,
      record.humidity_pct || 0,
      record.elevation_m || 900,
      record.flood_freq_annual || 5,
      record.pop_density || 22000,
      record.drainage_score || 0.5,
      record.time_sin || 0,
      record.time_cos || 0,
    ];
  }

  /**
   * Train the model on the dataset.
   */
  train(data) {
    const X = data.map(d => this.extractFeatures(d));
    const y = data.map(d => d.disruption_probability);

    // Initialize with mean
    this.basePrediction = mean(y);
    let predictions = new Array(y.length).fill(this.basePrediction);

    // Boosting rounds
    for (let round = 0; round < this.nEstimators; round++) {
      // Compute residuals
      const residuals = y.map((yi, i) => yi - predictions[i]);

      // Fit a tree on residuals
      const tree = buildTree(X, residuals, this.maxDepth);
      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < X.length; i++) {
        predictions[i] += this.learningRate * tree.predict(X[i]);
      }

      // Track feature importance from this tree
      this._trackImportance(tree);
    }

    // Normalize feature importance
    const totalImp = Object.values(this.featureImportance).reduce((a, b) => a + b, 0) || 1;
    for (const key of Object.keys(this.featureImportance)) {
      this.featureImportance[key] = parseFloat((this.featureImportance[key] / totalImp).toFixed(4));
    }

    this.trained = true;

    // Calculate training metrics
    const mse = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0) / y.length;
    console.log(`[GigAegis ML] Model trained. ${this.nEstimators} trees, MSE: ${mse.toFixed(6)}, R²: ${(1 - mse / variance(y)).toFixed(4)}`);

    return { mse, r2: 1 - mse / variance(y) };
  }

  /**
   * Predict disruption probability for a single record.
   */
  predict(record) {
    if (!this.trained) throw new Error('Model not trained');

    const features = this.extractFeatures(record);
    let prediction = this.basePrediction;

    for (const tree of this.trees) {
      prediction += this.learningRate * tree.predict(features);
    }

    // Clamp to [0, 1]
    return Math.min(1.0, Math.max(0.0, parseFloat(prediction.toFixed(4))));
  }

  /**
   * Get full prediction with explainability.
   */
  predictWithExplanation(record) {
    const probability = this.predict(record);

    // Calculate per-feature contribution via permutation importance approximation
    const features = this.extractFeatures(record);
    const contributions = {};

    for (let i = 0; i < FEATURE_NAMES.length; i++) {
      const perturbed = [...features];
      perturbed[i] = 0; // Zero out the feature

      let perturbedPred = this.basePrediction;
      for (const tree of this.trees) {
        perturbedPred += this.learningRate * tree.predict(perturbed);
      }
      perturbedPred = Math.min(1.0, Math.max(0.0, perturbedPred));

      contributions[FEATURE_NAMES[i]] = parseFloat((probability - perturbedPred).toFixed(4));
    }

    // Recommended premium: actuarial fair price + 30% margin + ₹10 admin
    const avgHourlyEarnings = 85; // ₹ benchmark
    const avgDisruptionHours = 8;
    const fairPremium = probability * avgHourlyEarnings * avgDisruptionHours;
    const recommendedPremium = Math.round(fairPremium * 1.3 + 10);

    return {
      disruption_probability: probability,
      recommended_weekly_premium: Math.max(15, Math.min(200, recommendedPremium)),
      risk_classification: probability > 0.6 ? 'CRITICAL' : probability > 0.35 ? 'HIGH' : probability > 0.15 ? 'MEDIUM' : 'LOW',
      feature_contributions: contributions,
      feature_importance: this.featureImportance,
      model_confidence: parseFloat((1 - Math.abs(probability - 0.5) * 0.3).toFixed(3)),
    };
  }

  _trackImportance(node) {
    if (!node || node.isLeaf) return;
    if (node.featureIndex >= 0 && node.featureIndex < FEATURE_NAMES.length) {
      this.featureImportance[FEATURE_NAMES[node.featureIndex]] += 1;
    }
    this._trackImportance(node.leftChild);
    this._trackImportance(node.rightChild);
  }
}

// ============================================
// SINGLETON MODEL INSTANCE
// ============================================

let modelInstance = null;

/**
 * Initialize and train the model. Called once on server startup.
 */
function initializeModel() {
  if (modelInstance && modelInstance.trained) return modelInstance;

  console.log('[GigAegis ML] Initializing Gradient Boosted Risk Model...');
  const trainingData = generateTrainingData();
  console.log(`[GigAegis ML] Training on ${trainingData.length} historical records...`);

  modelInstance = new GradientBoostedModel({
    nEstimators: 50,
    learningRate: 0.1,
    maxDepth: 3,
  });

  modelInstance.train(trainingData);
  return modelInstance;
}

/**
 * Get a risk prediction for current conditions in a zone.
 * @param {string} zoneName - Zone identifier
 * @param {object} currentWeather - { rainfall_mm, temp_c, aqi, humidity }
 * @returns {object} Prediction with explainability
 */
function predictZoneRisk(zoneName, currentWeather = {}) {
  const model = initializeModel();
  const zoneFeatures = getZoneFeatures(zoneName);

  // Current time encoding
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const timeSin = Math.sin((2 * Math.PI * dayOfYear) / 365);
  const timeCos = Math.cos((2 * Math.PI * dayOfYear) / 365);

  const record = {
    weekly_rainfall_mm: currentWeather.rainfall_mm || 0,
    temp_max_c: currentWeather.temp_c || 30,
    aqi: currentWeather.aqi || 80,
    humidity_pct: currentWeather.humidity || 60,
    elevation_m: zoneFeatures.elevation_m,
    flood_freq_annual: zoneFeatures.flood_freq_annual,
    pop_density: zoneFeatures.pop_density,
    drainage_score: zoneFeatures.drainage_score,
    time_sin: timeSin,
    time_cos: timeCos,
  };

  return model.predictWithExplanation(record);
}

/**
 * Get the trained model's feature importance rankings.
 */
function getModelMetrics() {
  const model = initializeModel();
  return {
    feature_importance: model.featureImportance,
    n_estimators: model.nEstimators,
    learning_rate: model.learningRate,
    max_depth: model.maxDepth,
    trained: model.trained,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / arr.length;
}

module.exports = {
  initializeModel,
  predictZoneRisk,
  getModelMetrics,
  FEATURE_NAMES,
};
