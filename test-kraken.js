require('dotenv').config();
const ccxt = require('ccxt');

async function testKraken() {
    console.log('🐙 Testing Kraken connection...\n');
    
    try {
        // Initialize Kraken
        const kraken = new ccxt.kraken({
            apiKey: process.env.KRAKEN_API_KEY,
            secret: process.env.KRAKEN_SECRET,
            enableRateLimit: true
        });
        
        console.log('✅ Kraken initialized');
        
        // Test 1: Fetch balance
        console.log('\n📊 Fetching balance...');
        const balance = await kraken.fetchBalance();
        console.log('USD Balance:', balance.USD?.total || 0);
        console.log('Total Balance:', balance.total);
        
        // Test 2: Fetch ticker
        console.log('\n💹 Fetching BTC price...');
        const ticker = await kraken.fetchTicker('BTC/USD');
        console.log('BTC Price: $' + ticker.last);
        console.log('Bid: $' + ticker.bid);
        console.log('Ask: $' + ticker.ask);
        
        // Test 3: Check trading pairs
        console.log('\n🔍 Checking available markets...');
        const markets = await kraken.loadMarkets();
        const usdPairs = Object.keys(markets).filter(m => m.includes('/USD')).slice(0, 10);
        console.log('Sample USD pairs:', usdPairs);
        
        console.log('\n🎉 Kraken connection successful!');
        
    } catch (error) {
        console.error('❌ Kraken test failed:', error.message);
        
        if (error.message.includes('Invalid key')) {
            console.log('\n💡 Check that your API key and secret are correct in .env');
        } else if (error.message.includes('Permission denied')) {
            console.log('\n💡 Make sure your API key has "Query Funds" permission enabled');
        }
    }
}

testKraken();