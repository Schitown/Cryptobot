// coinbase-advanced.js - Working with Coinbase's current API (2025)
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');

class CoinbaseAdvancedTrade {
    constructor(apiKey, privateKey) {
        this.apiKey = apiKey;
        // Handle private key whether it has \n or actual newlines
        this.privateKey = privateKey.replace(/\\n/g, '\n');
        this.baseURL = 'https://api.coinbase.com/api/v3/brokerage';
    }

    generateJWT(method, path) {
        const uri = `${method} api.coinbase.com${path}`;
        const payload = {
            iss: 'cdp',
            nbf: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60,
            sub: this.apiKey,
            uri: uri
        };

        return jwt.sign(
            payload,
            this.privateKey,
            {
                algorithm: 'ES256',
                header: {
                    kid: this.apiKey,
                    typ: 'JWT',
                    alg: 'ES256',
                    nonce: crypto.randomBytes(16).toString('hex')
                }
            }
        );
    }

    async request(method, path, data = null) {
        const token = this.generateJWT(method, path);
        
        try {
            const response = await axios({
                method: method,
                url: `https://api.coinbase.com${path}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: data
            });
            return response.data;
        } catch (error) {
            console.error('Coinbase API Error:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get account balances
    async fetchBalance() {
        const accounts = await this.request('GET', '/api/v3/brokerage/accounts');
        const balances = {};
        
        for (const account of accounts.accounts) {
            const currency = account.currency;
            const available = parseFloat(account.available_balance.value) || 0;
            const hold = parseFloat(account.hold.value) || 0;
            
            balances[currency] = {
                free: available,
                used: hold,
                total: available + hold
            };
        }
        
        return balances;
    }

    // Get ticker price
    async fetchTicker(symbol) {
        // Convert symbol format: BTC/USD -> BTC-USD
        const product = symbol.replace('/', '-');
        const data = await this.request('GET', `/api/v3/brokerage/products/${product}`);
        
        return {
            symbol: symbol,
            bid: parseFloat(data.price),
            ask: parseFloat(data.price) * 1.001, // Approximate spread
            last: parseFloat(data.price)
        };
    }

    // Create an order (for demo purposes, not executing)
    async createOrder(symbol, side, amount, price) {
        console.log(`[DEMO] Would create ${side} order: ${amount} ${symbol} at $${price}`);
        return {
            id: Date.now().toString(),
            symbol: symbol,
            side: side,
            amount: amount,
            price: price,
            status: 'demo'
        };
    }
}

module.exports = CoinbaseAdvancedTrade;