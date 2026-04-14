/**
 * GigAegis Backend — Entry Point
 * 
 * Clean modular architecture. Routes are delegated to separate modules.
 * ML models are initialized on startup.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import route modules
const workerRoutes = require('./routes/workers');
const insuranceRoutes = require('./routes/insurance');
const analyticsRoutes = require('./routes/analytics');

// Initialize ML models on import
const { initializeModel } = require('./ml/riskModel');
const { initializeFraudDetector } = require('./ml/fraudDetector');

const { Worker, Treasury } = require('./models/GigAegisDB');
const honestWorkers = require('../honest_workers.json');
const fraudSyndicate = require('../fraud_syndicate.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// DATABASE CONNECTION
// ==========================================
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gigaegis';
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 })
  .then(async () => {
    console.log("[GigAegis] MongoDB Connected. Persistence Mode Active.");
    if ((await Worker.countDocuments()) === 0) {
      console.log("[GigAegis] Seeding database with worker profiles...");
      const allWorkers = [...honestWorkers, ...fraudSyndicate].map(w => ({
        ...w,
        balance: w.balance || 0,
        is_fraud: false,
      }));
      await Worker.insertMany(allWorkers);
    }
    if ((await Treasury.countDocuments()) === 0) {
      await Treasury.create({ reservePool: 100000, premiumsCollected: 0 });
    }
  })
  .catch(err => {
    console.log("[GigAegis] MongoDB offline. Using in-memory fallback.");
  });

// ==========================================
// ML MODEL INITIALIZATION
// ==========================================
console.log("[GigAegis] Starting ML model training...");
initializeModel();
initializeFraudDetector();
console.log("[GigAegis] All ML models ready.");

// ==========================================
// ROUTE MOUNTING
// ==========================================
app.use('/api', workerRoutes);
app.use('/api', insuranceRoutes);
app.use('/api/analytics', analyticsRoutes);

// ==========================================
// SERVER START
// ==========================================
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => console.log(`[GigAegis Backend] Active on Port ${PORT}`));
}
