/**
 * Market Data Feed
 *
 * Provides real-time and historical market data from free sources.
 * Supports multiple asset classes: stocks, forex, crypto, futures.
 */

const https = require('https');
const http = require('http');

class MarketDataFeed {
  constructor(plugin) {
    this.plugin = plugin;
    this.cache = new Map();
    this.subscriptions = new Map();
    this.cacheDuration = 60 * 1000; // 1 minute for real-time data

    // Free data sources (no API keys required or free tier)
    this.dataSources = {
      // Yahoo Finance (free, no limits)
      yahoo: 'https://query1.finance.yahoo.com/v8/finance',
      // Alpha Vantage (free tier: 25 calls/day, 5 calls/minute)
      alphaVantage: {
        url: 'https://www.alphavantage.co/query',
        key: process.env.ALPHA_VANTAGE_KEY || 'demo'
      },
      // Twelve Data (free tier: 800 calls/day)
      twelveData: {
        url: 'https://api.twelvedata.com',
        key: process.env.TWELVE_DATA_KEY || null
      },
      // CoinGecko (free, crypto only)
      coinGecko: 'https://api.coingecko.com/api/v3'
    };

    this.plugin.memoryEngine.log('MARKET_DATA', 'Initialized', {
      dataSources: Object.keys(this.dataSources)
    });
  }

  /**
   * Get real-time quote
   */
  async getQuote(symbol, market = 'stocks') {
    const cacheKey = `quote-${market}-${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let quote;

      switch (market) {
        case 'stocks':
        case 'forex':
          quote = await this.getYahooQuote(symbol);
          break;
        case 'crypto':
          quote = await this.getCryptoQuote(symbol);
          break;
        default:
          quote = await this.getYahooQuote(symbol);
      }

      if (quote) {
        this.setCache(cacheKey, quote);
        return quote;
      }

      return this.getFallbackQuote(symbol, market);
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_DATA', 'Quote error', {
        symbol,
        market,
        error: error.message
      });
      return this.getFallbackQuote(symbol, market);
    }
  }

  /**
   * Get Yahoo Finance quote
   */
  async getYahooQuote(symbol) {
    return new Promise((resolve) => {
      const url = `${this.dataSources.yahoo}/chart/${symbol}?interval=1m&range=1d`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.chart && json.chart.result && json.chart.result[0]) {
              const result = json.chart.result[0];
              const meta = result.meta;
              const quote = result.indicators.quote[0];

              const lastIndex = quote.close.length - 1;

              resolve({
                symbol,
                bid: quote.close[lastIndex] - 0.0001, // Approximate
                ask: quote.close[lastIndex] + 0.0001,
                last: quote.close[lastIndex],
                open: quote.open[lastIndex] || meta.regularMarketPrice,
                high: quote.high[lastIndex] || meta.regularMarketPrice,
                low: quote.low[lastIndex] || meta.regularMarketPrice,
                volume: quote.volume[lastIndex] || 0,
                timestamp: Date.now(),
                change: meta.regularMarketPrice - meta.previousClose,
                changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  /**
   * Get crypto quote from CoinGecko
   */
  async getCryptoQuote(symbol) {
    return new Promise((resolve) => {
      // Convert symbol to CoinGecko ID (BTC → bitcoin, ETH → ethereum)
      const coinMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'SOL': 'solana',
        'ADA': 'cardano',
        'XRP': 'ripple',
        'DOT': 'polkadot'
      };

      const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase();
      const url = `${this.dataSources.coinGecko}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json[coinId]) {
              const price = json[coinId].usd;
              resolve({
                symbol,
                bid: price * 0.9995, // Approximate bid/ask spread
                ask: price * 1.0005,
                last: price,
                open: price, // CoinGecko doesn't provide OHLC in this endpoint
                high: price,
                low: price,
                volume: json[coinId].usd_24h_vol || 0,
                timestamp: Date.now(),
                change: price * (json[coinId].usd_24h_change / 100),
                changePercent: json[coinId].usd_24h_change
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  /**
   * Get historical data (OHLCV)
   */
  async getHistoricalData(symbol, options = {}) {
    const {
      market = 'stocks',
      interval = '1d', // 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
      startDate = Date.now() - (365 * 24 * 60 * 60 * 1000), // 1 year default
      endDate = Date.now()
    } = options;

    const cacheKey = `history-${market}-${symbol}-${interval}-${startDate}-${endDate}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let data;

      switch (market) {
        case 'stocks':
        case 'forex':
          data = await this.getYahooHistoricalData(symbol, interval, startDate, endDate);
          break;
        case 'crypto':
          data = await this.getCryptoHistoricalData(symbol, startDate, endDate);
          break;
        default:
          data = await this.getYahooHistoricalData(symbol, interval, startDate, endDate);
      }

      if (data && data.length > 0) {
        this.setCache(cacheKey, data);
        return data;
      }

      return [];
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_DATA', 'Historical data error', {
        symbol,
        market,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get Yahoo Finance historical data
   */
  async getYahooHistoricalData(symbol, interval, startDate, endDate) {
    return new Promise((resolve) => {
      const period1 = Math.floor(startDate / 1000);
      const period2 = Math.floor(endDate / 1000);
      const url = `${this.dataSources.yahoo}/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.chart && json.chart.result && json.chart.result[0]) {
              const result = json.chart.result[0];
              const timestamps = result.timestamp;
              const quote = result.indicators.quote[0];

              const bars = [];
              for (let i = 0; i < timestamps.length; i++) {
                if (quote.close[i] !== null) {
                  bars.push({
                    timestamp: timestamps[i] * 1000,
                    open: quote.open[i],
                    high: quote.high[i],
                    low: quote.low[i],
                    close: quote.close[i],
                    volume: quote.volume[i] || 0
                  });
                }
              }

              resolve(bars);
            } else {
              resolve([]);
            }
          } catch (error) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  /**
   * Get crypto historical data from CoinGecko
   */
  async getCryptoHistoricalData(symbol, startDate, endDate) {
    return new Promise((resolve) => {
      const coinMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'USDT': 'tether',
        'BNB': 'binancecoin',
        'SOL': 'solana'
      };

      const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase();
      const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
      const url = `${this.dataSources.coinGecko}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.prices) {
              const bars = json.prices.map((price, i) => ({
                timestamp: price[0],
                open: price[1], // CoinGecko doesn't separate OHLC, all same
                high: price[1],
                low: price[1],
                close: price[1],
                volume: json.total_volumes[i] ? json.total_volumes[i][1] : 0
              }));

              resolve(bars);
            } else {
              resolve([]);
            }
          } catch (error) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  /**
   * Get news (free sources)
   */
  async getNews(symbol, options = {}) {
    const { limit = 10, language = 'en' } = options;

    // Using Yahoo Finance news (free)
    return new Promise((resolve) => {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=${limit}`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.news) {
              const news = json.news.map(item => ({
                title: item.title,
                summary: item.summary || '',
                publisher: item.publisher || 'Unknown',
                url: item.link,
                publishedAt: item.providerPublishTime * 1000,
                sentiment: this.analyzeSentiment(item.title + ' ' + (item.summary || ''))
              }));

              resolve(news);
            } else {
              resolve([]);
            }
          } catch (error) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  /**
   * Simple sentiment analysis
   */
  analyzeSentiment(text) {
    const lowerText = text.toLowerCase();

    const positiveWords = ['up', 'gain', 'profit', 'bull', 'surge', 'rally', 'growth', 'strong', 'beat', 'positive'];
    const negativeWords = ['down', 'loss', 'bear', 'crash', 'decline', 'fall', 'weak', 'miss', 'negative', 'drop'];

    let score = 0;
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 1;
    });
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 1;
    });

    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
    return 'neutral';
  }

  /**
   * Subscribe to real-time updates (simulated with polling)
   */
  subscribeToTicker(symbol, market, callback, interval = 5000) {
    const subscriptionId = `${market}-${symbol}-${Date.now()}`;

    const poll = setInterval(async () => {
      const quote = await this.getQuote(symbol, market);
      if (quote) {
        callback(quote);
      }
    }, interval);

    this.subscriptions.set(subscriptionId, {
      symbol,
      market,
      interval: poll,
      callback,
      startedAt: Date.now()
    });

    this.plugin.memoryEngine.log('MARKET_DATA', 'Subscription started', {
      subscriptionId,
      symbol,
      market,
      interval
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from ticker
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      clearInterval(subscription.interval);
      this.subscriptions.delete(subscriptionId);

      this.plugin.memoryEngine.log('MARKET_DATA', 'Subscription ended', {
        subscriptionId,
        duration: Date.now() - subscription.startedAt
      });

      return true;
    }
    return false;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
      id,
      symbol: sub.symbol,
      market: sub.market,
      startedAt: sub.startedAt,
      duration: Date.now() - sub.startedAt
    }));
  }

  /**
   * Calculate technical indicators
   */
  calculateIndicators(bars, indicators = ['sma', 'ema', 'rsi', 'macd']) {
    const result = {
      bars: bars.length,
      indicators: {}
    };

    if (indicators.includes('sma')) {
      result.indicators.sma20 = this.calculateSMA(bars, 20);
      result.indicators.sma50 = this.calculateSMA(bars, 50);
      result.indicators.sma200 = this.calculateSMA(bars, 200);
    }

    if (indicators.includes('ema')) {
      result.indicators.ema12 = this.calculateEMA(bars, 12);
      result.indicators.ema26 = this.calculateEMA(bars, 26);
    }

    if (indicators.includes('rsi')) {
      result.indicators.rsi = this.calculateRSI(bars, 14);
    }

    if (indicators.includes('macd')) {
      const macd = this.calculateMACD(bars);
      result.indicators.macd = macd;
    }

    return result;
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(bars, period) {
    if (bars.length < period) return null;
    const closes = bars.slice(-period).map(b => b.close);
    const sum = closes.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(bars, period) {
    if (bars.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;

    for (let i = period; i < bars.length; i++) {
      ema = (bars[i].close - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(bars, period = 14) {
    if (bars.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = bars.length - period; i < bars.length; i++) {
      const change = bars[i].close - bars[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Calculate MACD
   */
  calculateMACD(bars) {
    const ema12 = this.calculateEMA(bars, 12);
    const ema26 = this.calculateEMA(bars, 26);

    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;

    // Signal line would require calculating EMA of MACD line (simplified here)
    const signalLine = macdLine * 0.9; // Approximation

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - signalLine
    };
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    this.plugin.memoryEngine.log('MARKET_DATA', 'Cache cleared');
  }

  /**
   * Fallback quote when data unavailable
   */
  getFallbackQuote(symbol, market) {
    return {
      symbol,
      bid: 0,
      ask: 0,
      last: 0,
      open: 0,
      high: 0,
      low: 0,
      volume: 0,
      timestamp: Date.now(),
      change: 0,
      changePercent: 0,
      error: 'Data unavailable'
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      cacheSize: this.cache.size,
      subscriptions: this.subscriptions.size,
      dataSources: Object.keys(this.dataSources).length
    };
  }
}

module.exports = MarketDataFeed;
