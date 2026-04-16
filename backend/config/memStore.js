/**
 * GigAegis Shared In-Memory Store
 * Single source of truth for in-memory workers and treasury state.
 * Both workers.js and insurance.js import from here to stay in sync.
 */

let _memWorkers = null;
let memReservePool = 100000;
let memPremiums = 0;

function getMemWorkers() {
  if (!_memWorkers) {
    try {
      const honest = require('../../honest_workers.json');
      const fraud = require('../../fraud_syndicate.json');
      _memWorkers = [...honest, ...fraud].map(w => ({ ...w, balance: w.balance || 0, is_fraud: false }));
    } catch (e) {
      console.log('[MemStore] JSON files not found, starting with empty workers list.');
      _memWorkers = [];
    }
  }
  return _memWorkers;
}

function getReservePool() { return memReservePool; }
function setReservePool(val) { memReservePool = val; }
function addToReservePool(val) { memReservePool += val; }
function subtractFromReservePool(val) { memReservePool -= val; }

function getPremiums() { return memPremiums; }
function addToPremiums(val) { memPremiums += val; }

module.exports = {
  getMemWorkers,
  getReservePool,
  setReservePool,
  addToReservePool,
  subtractFromReservePool,
  getPremiums,
  addToPremiums,
};
