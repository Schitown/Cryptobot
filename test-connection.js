require('dotenv').config();

console.log('🔍 Checking environment variables...\n');

// Check if .env is loaded
console.log('PORT:', process.env.PORT);
console.log('COINBASE_API_KEY exists:', !!process.env.COINBASE_API_KEY);
console.log('COINBASE_SECRET exists:', !!process.env.COINBASE_SECRET);

// Check API key format (show first few characters only)
if (process.env.COINBASE_API_KEY) {
    console.log('API Key starts with:', process.env.COINBASE_API_KEY.substring(0, 8) + '...');
}

// Test basic exchange connection
const ccxt = require('ccxt');
async function testConnection() {
    console.log('\n🧪 Testing Coinbase connection...\n');
    
    try {
        const exchange = new ccxt.coinbase({
            apiKey: process.env.COINBASE_API_KEY,
            secret: process.env.COINBASE_SECRET,
            enableRateLimit: true
        });
        
        // Try to fetch account info
        console.log('Fetching account info...');
        const accounts = await exchange.fetchAccounts();
        console.log(`✅ Found ${accounts.length} accounts`);
        
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        
        if (error.message.includes('apiKey')) {
            console.log('\n💡 Tip: Make sure your API key is correct in .env file');
        }
        if (error.message.includes('permission')) {
            console.log('\n💡 Tip: Your API key needs at least "View" permissions');
        }
    }
}

testConnection();