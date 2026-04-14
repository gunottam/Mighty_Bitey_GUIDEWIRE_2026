/**
 * GigAegis Zone Configuration
 * 
 * 12 Bangalore micro-zones with H3-inspired grid indexing.
 * Each zone has real geographic, demographic, and infrastructure data
 * that feeds into the ML risk model.
 */

const ZONES = {
  'Koramangala_1': {
    display_name: 'Koramangala Block 1',
    grid_id: 'BLR-KRM-01',
    lat: 12.9352, lng: 77.6245,
    elevation_m: 895,
    flood_freq_annual: 8,
    pop_density: 28000,
    drainage_score: 0.3,
    classification: 'HIGH',
    description: 'Dense commercial hub near Agara Lake. High waterlogging history.',
    risk_color: '#ef4444',
  },
  'Koramangala_2': {
    display_name: 'Koramangala Block 5-6',
    grid_id: 'BLR-KRM-02',
    lat: 12.9258, lng: 77.6234,
    elevation_m: 890,
    flood_freq_annual: 10,
    pop_density: 31000,
    drainage_score: 0.2,
    classification: 'CRITICAL',
    description: 'Lowest elevation in Koramangala. Worst flood zone in South Bangalore.',
    risk_color: '#dc2626',
  },
  'Koramangala_3': {
    display_name: 'Koramangala Block 8',
    grid_id: 'BLR-KRM-03',
    lat: 12.9380, lng: 77.6190,
    elevation_m: 900,
    flood_freq_annual: 6,
    pop_density: 25000,
    drainage_score: 0.4,
    classification: 'HIGH',
    description: 'Better drainage than lower blocks but still flood-prone.',
    risk_color: '#ef4444',
  },
  'Indiranagar_1': {
    display_name: 'Indiranagar Stage 1',
    grid_id: 'BLR-IDR-01',
    lat: 12.9719, lng: 77.6412,
    elevation_m: 910,
    flood_freq_annual: 3,
    pop_density: 22000,
    drainage_score: 0.7,
    classification: 'LOW',
    description: 'Higher elevation with good municipal drainage infrastructure.',
    risk_color: '#22c55e',
  },
  'Indiranagar_2': {
    display_name: 'Indiranagar Stage 2',
    grid_id: 'BLR-IDR-02',
    lat: 12.9784, lng: 77.6408,
    elevation_m: 915,
    flood_freq_annual: 2,
    pop_density: 20000,
    drainage_score: 0.8,
    classification: 'LOW',
    description: 'Highest elevation zone. Minimal flood risk historically.',
    risk_color: '#22c55e',
  },
  'Whitefield_1': {
    display_name: 'Whitefield Main',
    grid_id: 'BLR-WTF-01',
    lat: 12.9698, lng: 77.7500,
    elevation_m: 920,
    flood_freq_annual: 4,
    pop_density: 18000,
    drainage_score: 0.6,
    classification: 'MEDIUM',
    description: 'IT corridor with moderate flood risk near railway underpass.',
    risk_color: '#f59e0b',
  },
  'Whitefield_2': {
    display_name: 'Whitefield Kadugodi',
    grid_id: 'BLR-WTF-02',
    lat: 12.9600, lng: 77.7450,
    elevation_m: 905,
    flood_freq_annual: 5,
    pop_density: 21000,
    drainage_score: 0.5,
    classification: 'MEDIUM',
    description: 'Growing area with developing drainage infrastructure.',
    risk_color: '#f59e0b',
  },
  'HSR_Layout': {
    display_name: 'HSR Layout',
    grid_id: 'BLR-HSR-01',
    lat: 12.9116, lng: 77.6389,
    elevation_m: 898,
    flood_freq_annual: 7,
    pop_density: 26000,
    drainage_score: 0.35,
    classification: 'HIGH',
    description: 'Near Agara Lake outflow. Heavy waterlogging during monsoons.',
    risk_color: '#ef4444',
  },
  'Bellandur': {
    display_name: 'Bellandur',
    grid_id: 'BLR-BLD-01',
    lat: 12.9261, lng: 77.6762,
    elevation_m: 885,
    flood_freq_annual: 12,
    pop_density: 30000,
    drainage_score: 0.15,
    classification: 'CRITICAL',
    description: 'Notorious flood zone. Bellandur Lake overflow causes massive disruption.',
    risk_color: '#dc2626',
  },
  'Electronic_City': {
    display_name: 'Electronic City',
    grid_id: 'BLR-ELC-01',
    lat: 12.8440, lng: 77.6603,
    elevation_m: 870,
    flood_freq_annual: 9,
    pop_density: 24000,
    drainage_score: 0.25,
    classification: 'HIGH',
    description: 'Low-lying tech hub. Hosur Road flooding halts deliveries frequently.',
    risk_color: '#ef4444',
  },
  'Marathahalli': {
    display_name: 'Marathahalli',
    grid_id: 'BLR-MRT-01',
    lat: 12.9562, lng: 77.7019,
    elevation_m: 908,
    flood_freq_annual: 5,
    pop_density: 27000,
    drainage_score: 0.45,
    classification: 'MEDIUM',
    description: 'Bridge area floods during heavy rain. Major delivery route disruption.',
    risk_color: '#f59e0b',
  },
  'JP_Nagar': {
    display_name: 'JP Nagar',
    grid_id: 'BLR-JPN-01',
    lat: 12.9063, lng: 77.5857,
    elevation_m: 912,
    flood_freq_annual: 3,
    pop_density: 19000,
    drainage_score: 0.65,
    classification: 'LOW',
    description: 'Well-planned residential area with adequate drainage.',
    risk_color: '#22c55e',
  },
};

/**
 * Get zone configuration by name. Supports fuzzy matching.
 */
function getZone(zoneName) {
  if (ZONES[zoneName]) return { id: zoneName, ...ZONES[zoneName] };

  // Fuzzy match
  const key = Object.keys(ZONES).find(k => 
    k.toLowerCase().replace(/_/g, '').includes(zoneName.toLowerCase().replace(/[\s_]/g, ''))
  );
  if (key) return { id: key, ...ZONES[key] };

  // Legacy compatibility: map old zone names to new ones
  const legacyMap = {
    'Koramangala': 'Koramangala_1',
    'Indiranagar': 'Indiranagar_1',
    'Whitefield': 'Whitefield_1',
  };
  if (legacyMap[zoneName]) return { id: legacyMap[zoneName], ...ZONES[legacyMap[zoneName]] };

  return null;
}

/**
 * Get all zones as an array for API responses.
 */
function getAllZones() {
  return Object.entries(ZONES).map(([id, zone]) => ({ id, ...zone }));
}

/**
 * Get zone classification stats for analytics.
 */
function getZoneStats() {
  const zones = getAllZones();
  return {
    total: zones.length,
    critical: zones.filter(z => z.classification === 'CRITICAL').length,
    high: zones.filter(z => z.classification === 'HIGH').length,
    medium: zones.filter(z => z.classification === 'MEDIUM').length,
    low: zones.filter(z => z.classification === 'LOW').length,
  };
}

module.exports = { ZONES, getZone, getAllZones, getZoneStats };
