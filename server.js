require('dotenv').config();
const express = require('express');
const app = express();

// Choose which bot to use
const USE_ADVANCED = true; // Set to true to use advanced features

let bot;
if (USE_ADVANCED) {
    const AdvancedTradingBot = require('./advanced-bot');
    bot = new AdvancedTradingBot();
} else {
    bot = require('./bot'); // Your original bot
}

// Import backtesting module
const { BacktestingEngine, StrategyOptimizer } = require('./backtester');
const backtester = new BacktestingEngine(bot);

// Middleware
app.use(express.json());
app.use(express.text());
app.use(express.static('public'));

// Original endpoints (keep these)
app.get('/api/status', async (req, res) => {
    const status = bot.getStatus();
    res.json(status);
});

app.post('/api/start', async (req, res) => {
    await bot.start();
    res.json({ message: 'Bot started!' });
});

app.post('/api/stop', (req, res) => {
    bot.stop();
    res.json({ message: 'Bot stopped!' });
});

// NEW: Advanced endpoints
app.get('/api/exchanges', (req, res) => {
    res.json({
        exchanges: bot.exchanges ? Object.keys(bot.exchanges) : ['demo'],
        balances: bot.balances || {}
    });
});

app.post('/api/backtest', async (req, res) => {
    const config = {
        symbol: req.body.symbol || 'BTC/USDT',
        timeframe: req.body.timeframe || '1h',
        startDate: req.body.startDate || '2024-01-01',
        endDate: req.body.endDate || '2024-12-31',
        startingCapital: req.body.startingCapital || 10000
    };
    
    try {
        const results = await backtester.runBacktest(config);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/optimize', async (req, res) => {
    const optimizer = new StrategyOptimizer(backtester);
    const results = await optimizer.optimize(req.body);
    res.json(results);
});

app.get('/api/arbitrage', (req, res) => {
    const opportunities = bot.arbitrageMonitor?.getActive() || [];
    res.json(opportunities);
});

// Enhanced webhook handler for smart trading
app.post('/webhook/tradingview', async (req, res) => {
    console.log('📨 Webhook received from TradingView!');
    
    try {
        let signal;
        
        // Parse the signal
        if (typeof req.body === 'string') {
            const parts = req.body.split(',');
            signal = {
                action: parts[0],
                symbol: parts[1],
                price: parseFloat(parts[2]),
                timeframe: parts[3] || '15m'
            };
        } else {
            signal = req.body;
        }
        
        // Use advanced bot if available
        if (bot.executeSmartBuy && (signal.action === 'buy' || signal.action === 'green_dot')) {
            await bot.executeSmartBuy(signal);
        } else if (bot.executeSmartSell && (signal.action === 'sell' || signal.action === 'red_dot')) {
            await bot.executeSmartSell(signal);
        } else {
            // Fall back to simple execution
            if (signal.action === 'buy' || signal.action === 'green_dot') {
                bot.executeBuy(signal.symbol, 0.01);
            } else {
                bot.executeSell(signal.symbol, 0.01);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌟 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Using ${USE_ADVANCED ? 'ADVANCED' : 'BASIC'} bot`);
});

// Listen for arbitrage opportunities
if (bot.on) {
    bot.on('arbitrage', (opportunity) => {
        console.log(`💰 ARBITRAGE: ${opportunity.profitPercent.toFixed(2)}% profit on ${opportunity.symbol}`);
    });
}