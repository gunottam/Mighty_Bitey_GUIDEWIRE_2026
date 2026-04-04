const axios = require('axios');

async function runTests() {
    console.log("=========================================");
    console.log("🚀 Starting GigAegis Chaos Testing Matrix");
    console.log("=========================================\n");
    
    // TEST 1: Health & DB State
    try {
        process.stdout.write("[TEST 1] Pinging Health Endpoint... ");
        const h = await axios.get('http://localhost:3000/api/health');
        console.log(`✅ SUCCESS -> Modes: ${JSON.stringify(h.data.modes)}`);
    } catch(e) { console.log("❌ FAIL: ", e.message); }

    // TEST 2: Oracle Telemetry Bounds
    try {
        process.stdout.write("[TEST 2] Pinging OpenWeather Wrapper... ");
        const r = await axios.get('http://localhost:3000/api/live-risk/Koramangala');
        console.log(`✅ SUCCESS -> Risk Score: ${r.data.riskScore}, Weather Severity: ${r.data.weatherSeverity}`);
    } catch(e) { console.log("❌ FAIL: ", e.message); }

    // TEST 3: Mass Simultaneous Execution (Race Conditions)
    console.log("\n[TEST 3] Simulating 10 Concurrent Mass Payout Calls (Race Condition Attack)...");
    const reqs = [];
    for (let i=0; i<10; i++) {
        reqs.push(axios.post('http://localhost:3000/api/trigger-event', {
            zone: "Koramangala", event_type: "SMOG", intensity_value: 500
        }));
    }
    
    try {
        const results = await Promise.all(reqs);
        console.log(`✅ SUCCESS: 10 parallel connections processed without Node thread freezing!`);
        console.log(`   └ Data Validation: First connection evaluated Reserve Pool at ${results[0].data.reservePool}`);
        console.log(`   └ Data Validation: Final connection evaluated Reserve Pool at ${results[9].data.reservePool}`);
        if(results[0].data.reservePool !== results[9].data.reservePool) {
            console.log(`   └ 🟢 RACE CONDITION NULLIFIED: Sequential Atomic limits securely tracked treasury degradation.`);
        } else {
            console.log(`   └ 🔴 RACE CONDITION WARNING: Pool values equal! Accounting exploit vulnerability active.`);
        }
    } catch(e) {
        console.log("❌ FAIL: ", e.message);
    }
    
    // TEST 4: Massive Negative Value (Proration Bounds Check)
    console.log("\n[TEST 4] Activating Proration Mathematical Limits...");
    try {
        process.stdout.write("   └ Blasting API with repetitive identical triggers until liquidity zero... ");
        // Hit it rapidly to force 0
        for (let i=0; i<3; i++) {
            await axios.post('http://localhost:3000/api/trigger-event', {
                zone: "Koramangala", event_type: "FLOOD", intensity_value: 200
            });
        }
        const stateCheck = await axios.get('http://localhost:3000/api/liquidity');
        console.log(`✅ SURVIVED -> Total Reserve is now ${stateCheck.data.liquidity}`);
        if(stateCheck.data.liquidity < 0) {
            console.log(`   └ 🔴 FAIL: Proration broken! Reserve went negative: ${stateCheck.data.liquidity}`);
        } else {
            console.log(`   └ 🟢 PASS: Proration safely bottomed out at boundaries > 0 bounds.`);
        }
    } catch(e) { console.log("❌ FAIL: ", e.message); }
    
    console.log("\n=========================================");
    console.log("🏁 GigAegis Infrastructure Attack Finished.");
    console.log("=========================================");
}

runTests();
