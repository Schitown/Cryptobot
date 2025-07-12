// backtester.js - Historical Strategy Testing Engine
const fs = require('fs').promises;
const path = require('path');

class BacktestingEngine {
    constructor(bot) {
        this.bot = bot;
        this.results = {
            trades: [],
            metrics: {},
            equity: []
        };
    }

    async runBacktest(config) {
        console.log('🔄 Starting backtest...');
        console.log(`📅 Period: ${config.startDate} to ${config.endDate}`);
        console.log(`💰 Starting capital: $${config.startingCapital}`);
        
        // Reset state
        this.reset(config.startingCapital);
        
        // Load historical data
        const historicalData = await this.loadHistoricalData(config);
        
        // Simulate MarketCipher signals
        const signals = this.generateSignals(historicalData, config.timeframe);
        
        // Process each signal
        for (const signal of signals) {
            await this.processSignal(signal);
        }
        
        // Calculate final metrics
        this.calculateMetrics();
        
        return this.results;
    }

    reset(startingCapital) {
        this.balance = startingCapital;
        this.positions = new Map();
        this.results = {
            trades: [],
            metrics: {},
            equity: [{
                time: new Date(),
                balance: startingCapital
            }]
        };
    }

    async loadHistoricalData(config) {
        // In production, this would load from exchange API or database
        // For demo, we'll generate realistic data
        console.log('📊 Loading historical data...');
        
        const data = [];
        const startTime = new Date(config.startDate).getTime();
        const endTime = new Date(config.endDate).getTime();
        const interval = this.timeframeToMs(config.timeframe);
        
        let price = config.symbol.includes('BTC') ? 45000 : 2500;
        
        for (let time = startTime; time <= endTime; time += interval) {
            // Simulate realistic price movement
            const change = (Math.random() - 0.5) * 0.02; // 2% max change
            price *= (1 + change);
            
            data.push({
                time: new Date(time),
                open: price,
                high: price * 1.01,
                low: price * 0.99,
                close: price,
                volume: Math.random() * 1000000
            });
        }
        
        return data;
    }

    generateSignals(data, timeframe) {
        console.log('🎯 Generating MarketCipher signals...');
        
        const signals = [];
        
        // Simulate MarketCipher B logic
        for (let i = 20; i < data.length; i++) {
            const current = data[i];
            const previous = data.slice(i - 20, i);
            
            // Simple momentum-based signal generation
            const momentum = this.calculateMomentum(previous);
            const rsi = this.calculateRSI(previous);
            
            // Green dot conditions (simplified)
            if (momentum > 0 && rsi < 30) {
                signals.push({
                    type: 'buy',
                    time: current.time,
                    price: current.close,
                    timeframe: timeframe,
                    strength: Math.abs(momentum)
                });
            }
            // Red dot conditions (simplified)
            else if (momentum < 0 && rsi > 70) {
                signals.push({
                    type: 'sell',
                    time: current.time,
                    price: current.close,
                    timeframe: timeframe,
                    strength: Math.abs(momentum)
                });
            }
        }
        
        console.log(`✅ Generated ${signals.length} signals`);
        return signals;
    }

    calculateMomentum(data) {
        const recent = data.slice(-5).map(d => d.close);
        const older = data.slice(-10, -5).map(d => d.close);
        
        const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b) / older.length;
        
        return (recentAvg - olderAvg) / olderAvg;
    }

    calculateRSI(data, period = 14) {
        if (data.length < period) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i < period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    async processSignal(signal) {
        // Apply ML prediction
        const prediction = await this.bot.mlModel.predict(signal);
        
        if (prediction.confidence < 0.7) {
            return; // Skip low confidence signals
        }
        
        if (signal.type === 'buy') {
            this.executeBuy(signal);
        } else if (signal.type === 'sell') {
            this.executeSell(signal);
        }
    }

    executeBuy(signal) {
        // Calculate position size using risk management
        const riskAmount = this.balance * 0.02; // 2% risk
        const stopLoss = signal.price * 0.97; // 3% stop loss
        const positionSize = riskAmount / (signal.price - stopLoss);
        const cost = positionSize * signal.price;
        
        if (cost > this.balance * 0.1) {
            // Max 10% per position
            return;
        }
        
        if (cost <= this.balance) {
            this.balance -= cost;
            
            const position = {
                id: Date.now(),
                entryTime: signal.time,
                entryPrice: signal.price,
                size: positionSize,
                stopLoss: stopLoss,
                takeProfit: signal.price * 1.06 // 6% take profit
            };
            
            this.positions.set(position.id, position);
            
            this.results.trades.push({
                ...position,
                type: 'buy',
                status: 'open'
            });
        }
    }

    executeSell(signal) {
        // Close all open positions
        for (const [id, position] of this.positions) {
            const profit = (signal.price - position.entryPrice) * position.size;
            this.balance += (position.entryPrice * position.size) + profit;
            
            this.results.trades.push({
                ...position,
                exitTime: signal.time,
                exitPrice: signal.price,
                profit: profit,
                profitPercent: (profit / (position.entryPrice * position.size)) * 100,
                type: 'sell',
                status: 'closed'
            });
            
            this.positions.delete(id);
        }
        
        // Record equity
        this.results.equity.push({
            time: signal.time,
            balance: this.balance
        });
    }

    calculateMetrics() {
        const trades = this.results.trades.filter(t => t.status === 'closed');
        
        if (trades.length === 0) {
            this.results.metrics = {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                sharpeRatio: 0,
                maxDrawdown: 0
            };
            return;
        }
        
        // Win rate
        const wins = trades.filter(t => t.profit > 0);
        const winRate = (wins.length / trades.length) * 100;
        
        // Profit factor
        const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
        const totalLosses = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
        const profitFactor = totalLosses === 0 ? totalWins : totalWins / totalLosses;
        
        // Average trade
        const avgTrade = trades.reduce((sum, t) => sum + t.profit, 0) / trades.length;
        
        // Max drawdown
        let peak = this.results.equity[0].balance;
        let maxDrawdown = 0;
        
        for (const point of this.results.equity) {
            if (point.balance > peak) {
                peak = point.balance;
            }
            const drawdown = ((peak - point.balance) / peak) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        
        // Sharpe ratio (simplified)
        const returns = [];
        for (let i = 1; i < this.results.equity.length; i++) {
            const ret = (this.results.equity[i].balance - this.results.equity[i - 1].balance) / this.results.equity[i - 1].balance;
            returns.push(ret);
        }
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
        const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualized
        
        this.results.metrics = {
            totalTrades: trades.length,
            winRate: winRate.toFixed(2),
            wins: wins.length,
            losses: trades.length - wins.length,
            profitFactor: profitFactor.toFixed(2),
            sharpeRatio: sharpeRatio.toFixed(2),
            maxDrawdown: maxDrawdown.toFixed(2),
            totalProfit: (this.balance - this.results.equity[0].balance).toFixed(2),
            totalProfitPercent: (((this.balance - this.results.equity[0].balance) / this.results.equity[0].balance) * 100).toFixed(2),
            avgTrade: avgTrade.toFixed(2),
            bestTrade: Math.max(...trades.map(t => t.profit)).toFixed(2),
            worstTrade: Math.min(...trades.map(t => t.profit)).toFixed(2),
            avgWin: (totalWins / wins.length).toFixed(2),
            avgLoss: (totalLosses / (trades.length - wins.length)).toFixed(2),
            finalBalance: this.balance.toFixed(2)
        };
        
        console.log('\n📊 Backtest Results:');
        console.log(`Win Rate: ${this.results.metrics.winRate}%`);
        console.log(`Profit Factor: ${this.results.metrics.profitFactor}`);
        console.log(`Max Drawdown: ${this.results.metrics.maxDrawdown}%`);
        console.log(`Total Profit: $${this.results.metrics.totalProfit} (${this.results.metrics.totalProfitPercent}%)`);
    }

    timeframeToMs(timeframe) {
        const map = {
            '1m': 60000,
            '5m': 300000,
            '15m': 900000,
            '30m': 1800000,
            '1h': 3600000,
            '4h': 14400000,
            '1d': 86400000
        };
        return map[timeframe] || 3600000;
    }

    async saveResults(filename) {
        const resultsPath = path.join(__dirname, 'backtest-results', filename);
        await fs.mkdir(path.dirname(resultsPath), { recursive: true });
        await fs.writeFile(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`💾 Results saved to ${resultsPath}`);
    }

    generateReport() {
        const report = `
# Backtest Report
Generated: ${new Date().toLocaleString()}

## Summary
- Total Trades: ${this.results.metrics.totalTrades}
- Win Rate: ${this.results.metrics.winRate}%
- Profit Factor: ${this.results.metrics.profitFactor}
- Sharpe Ratio: ${this.results.metrics.sharpeRatio}
- Max Drawdown: ${this.results.metrics.maxDrawdown}%

## Performance
- Starting Balance: $${this.results.equity[0].balance}
- Final Balance: $${this.results.metrics.finalBalance}
- Total Profit: $${this.results.metrics.totalProfit} (${this.results.metrics.totalProfitPercent}%)

## Trade Statistics
- Winning Trades: ${this.results.metrics.wins}
- Losing Trades: ${this.results.metrics.losses}
- Average Win: $${this.results.metrics.avgWin}
- Average Loss: $${this.results.metrics.avgLoss}
- Best Trade: $${this.results.metrics.bestTrade}
- Worst Trade: $${this.results.metrics.worstTrade}

## Trade Log
${this.results.trades.filter(t => t.status === 'closed').slice(-10).map(t => 
    `- ${t.type.toUpperCase()} ${new Date(t.entryTime).toLocaleDateString()} - P/L: $${t.profit.toFixed(2)} (${t.profitPercent.toFixed(2)}%)`
).join('\n')}
        `;

        return report;
    }
}

// Strategy Optimizer
class StrategyOptimizer {
    constructor(backtester) {
        this.backtester = backtester;
    }

    async optimize(config) {
        console.log('🔧 Starting strategy optimization...');
        
        const parameters = {
            riskPerTrade: [1, 2, 3],
            stopLossPercent: [2, 3, 5],
            takeProfitPercent: [4, 6, 8],
            mlConfidenceThreshold: [0.6, 0.7, 0.8]
        };
        
        const results = [];
        
        // Test all combinations
        for (const risk of parameters.riskPerTrade) {
            for (const sl of parameters.stopLossPercent) {
                for (const tp of parameters.takeProfitPercent) {
                    for (const conf of parameters.mlConfidenceThreshold) {
                        // Update bot config
                        this.backtester.bot.config = {
                            riskPerTrade: risk,
                            stopLossPercent: sl,
                            takeProfitPercent: tp
                        };
                        
                        // Run backtest
                        const result = await this.backtester.runBacktest(config);
                        
                        results.push({
                            parameters: { risk, sl, tp, conf },
                            metrics: result.metrics
                        });
                    }
                }
            }
        }
        
        // Find best combination
        const best = results.sort((a, b) => {
            // Sort by Sharpe ratio, then profit factor
            const sharpeA = parseFloat(a.metrics.sharpeRatio) || 0;
            const sharpeB = parseFloat(b.metrics.sharpeRatio) || 0;
            return sharpeB - sharpeA;
        })[0];
        
        console.log('🏆 Best parameters found:');
        console.log(best.parameters);
        console.log('Metrics:', best.metrics);
        
        return best;
    }
}

module.exports = { BacktestingEngine, StrategyOptimizer };