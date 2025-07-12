require('dotenv').config();
const ccxt = require('ccxt');
const CoinbaseAdvancedTrade = require('./coinbase-advanced');  // Add this line

class MarketCipherBot {
    constructor() {
        this.isRunning = false;
        this.balance = 10000; // Starting demo balance
        this.positions = [];
        this.portfolio = {}; // Track what we own
        this.error = null;
        
        console.log('🔧 Initializing bot...');
        
        // For now, let's just run in demo mode
        this.exchange = null;
        this.demoMode = true;
        this.lastSignal = null;
    }

    async start() {
        console.log('🚀 Starting bot in DEMO MODE...');
        this.isRunning = true;
        console.log(`✅ Bot is running with $${this.balance.toFixed(2)} demo balance!`);
    }

    stop() {
        this.isRunning = false;
        console.log('🛑 Bot stopped!');
    }

    async executeBuy(symbol, amount) {
        console.log(`💚 [DEMO] Buying ${amount} of ${symbol}`);
        
        // Demo mode: Deduct from balance
        const price = this.getDemoPrice(symbol);
        const cost = price * amount;
        
        if (cost <= this.balance) {
            this.balance -= cost;
            
            // Track position
            if (!this.portfolio[symbol]) {
                this.portfolio[symbol] = 0;
            }
            this.portfolio[symbol] += amount;
            
            this.positions.push({ 
                symbol, 
                amount, 
                type: 'buy',
                price: price,
                cost: cost,
                time: new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }),
                exchange: 'Demo'
            });
            
            console.log(`✅ Bought ${amount} ${symbol} at $${price} (Cost: $${cost.toFixed(2)})`);
            console.log(`💰 New balance: $${this.balance.toFixed(2)}`);
        } else {
            console.log(`❌ Insufficient balance! Need $${cost.toFixed(2)} but only have $${this.balance.toFixed(2)}`);
        }
    }

    async executeSell(symbol, amount) {
        console.log(`🔴 [DEMO] Selling ${amount} of ${symbol}`);
        
        // Check if we own it
        if (this.portfolio[symbol] && this.portfolio[symbol] >= amount) {
            const price = this.getDemoPrice(symbol);
            const revenue = price * amount;
            
            this.balance += revenue;
            this.portfolio[symbol] -= amount;
            
            this.positions.push({ 
                symbol, 
                amount, 
                type: 'sell',
                price: price,
                revenue: revenue,
                time: new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }),
                exchange: 'Demo'
            });
            
            console.log(`✅ Sold ${amount} ${symbol} at $${price} (Revenue: $${revenue.toFixed(2)})`);
            console.log(`💰 New balance: $${this.balance.toFixed(2)}`);
        } else {
            console.log(`❌ Cannot sell ${amount} ${symbol} - you only own ${this.portfolio[symbol] || 0}`);
        }
    }

    getDemoPrice(symbol) {
        // Fake prices for demo
        const prices = {
            'BTC/USDT': 45000,
            'ETH/USDT': 2500,
            'BTCUSDT': 45000,
            'ETHUSDT': 2500
        };
        return prices[symbol] || 100;
    }

    getStatus() {
    return {
        isRunning: this.isRunning,
        balance: this.balance,
        positionCount: this.positions.length,
        positions: this.positions,
        portfolio: this.portfolio,
        exchange: this.demoMode ? 'Demo Mode' : 'Live Trading',
        exchanges: Object.keys(this.exchanges || {}), // Add this line
        demoMode: this.demoMode,
        error: this.error,
        lastSignal: this.lastSignal
    };
}
}

module.exports = new MarketCipherBot();