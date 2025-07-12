async function testAdvancedFeatures() {
    console.log('🧪 Testing advanced features...\n');
    
    // Test 1: Check status
    console.log('1️⃣ Testing status endpoint...');
    const status = await fetch('http://localhost:3000/api/status');
    const statusData = await status.json();
    console.log('Total balance:', statusData.totalBalance || statusData.balance);
    console.log('Connected exchanges:', statusData.exchanges || ['demo']);
    
    // Test 2: Run backtest
    console.log('\n2️⃣ Running backtest...');
    const backtest = await fetch('http://localhost:3000/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            symbol: 'BTC/USDT',
            timeframe: '1h',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            startingCapital: 10000
        })
    });
    const backtestData = await backtest.json();
    console.log('Backtest metrics:', backtestData.metrics);
    
    // Test 3: Check arbitrage
    console.log('\n3️⃣ Checking arbitrage opportunities...');
    const arb = await fetch('http://localhost:3000/api/arbitrage');
    const arbData = await arb.json();
    console.log('Arbitrage opportunities:', arbData.length);
    
    console.log('\n✅ All tests complete!');
}

// Run tests
testAdvancedFeatures().catch(console.error);