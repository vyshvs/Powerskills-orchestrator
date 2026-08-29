/**
 * Market Context Provider
 *
 * Provides live market context to trading agents including:
 * - Market regime (bull/bear/sideways)
 * - Volatility levels (VIX)
 * - Major indices performance
 * - Sector leadership
 * - Currency strength
 * - Bond yields
 *
 * Uses free data sources where possible.
 */

const https = require('https');
const http = require('http');

class MarketContextProvider {
  constructor(plugin) {
    this.plugin = plugin;
    this.cache = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes

    // Free data sources
    this.dataSources = {
      // Yahoo Finance (free, no API key)
      yahooFinance: 'https://query1.finance.yahoo.com/v8/finance/chart/',
      // Alpha Vantage (free tier: 25 calls/day)
      alphaVantage: process.env.ALPHA_VANTAGE_KEY || 'demo',
      // Twelve Data (free tier: 800 calls/day)
      twelveData: process.env.TWELVE_DATA_KEY || null
    };

    this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Initialized', {
      cacheDuration: this.cacheDuration,
      dataSources: Object.keys(this.dataSources)
    });
  }

  /**
   * Get comprehensive market context
   */
  async getCurrentContext() {
    try {
      const [regime, volatility, indices, sectors, currency, sentiment] = await Promise.all([
        this.getMarketRegime(),
        this.getVolatilityLevel(),
        this.getIndicesPerformance(),
        this.getSectorPerformance(),
        this.getCurrencyStrength(),
        this.getMarketSentiment()
      ]);

      const context = {
        timestamp: Date.now(),
        regime,
        volatility,
        indices,
        sectors,
        currency,
        sentiment,
        summary: this.generateContextSummary(regime, volatility, indices, sectors)
      };

      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Context generated', {
        regime: regime.current,
        vix: volatility.vix,
        spyTrend: indices.SPY?.trend
      });

      return context;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Error getting context', {
        error: error.message
      });

      // Return fallback context
      return this.getFallbackContext();
    }
  }

  /**
   * Determine market regime (bull/bear/sideways)
   */
  async getMarketRegime() {
    const cached = this.getFromCache('regime');
    if (cached) return cached;

    try {
      // Analyze SPY (S&P 500 ETF) trend
      const spyData = await this.fetchYahooQuote('SPY', '1y');

      if (!spyData || !spyData.prices) {
        return this.getFallbackRegime();
      }

      const prices = spyData.prices;
      const current = prices[prices.length - 1];
      const sma50 = this.calculateSMA(prices, 50);
      const sma200 = this.calculateSMA(prices, 200);

      let regime;
      let confidence;

      // Bull: price > SMA50 > SMA200
      if (current > sma50 && sma50 > sma200) {
        regime = 'bull';
        confidence = 0.8;
      }
      // Bear: price < SMA50 < SMA200
      else if (current < sma50 && sma50 < sma200) {
        regime = 'bear';
        confidence = 0.8;
      }
      // Sideways: mixed signals
      else {
        regime = 'sideways';
        confidence = 0.6;
      }

      const result = {
        current: regime,
        confidence,
        indicators: {
          price: current,
          sma50,
          sma200,
          trendStrength: Math.abs((current - sma200) / sma200) * 100
        }
      };

      this.setCache('regime', result);
      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Regime detection error', {
        error: error.message
      });
      return this.getFallbackRegime();
    }
  }

  /**
   * Get volatility level (VIX proxy)
   */
  async getVolatilityLevel() {
    const cached = this.getFromCache('volatility');
    if (cached) return cached;

    try {
      // Try to fetch VIX, fallback to SPY volatility calculation
      const vixData = await this.fetchYahooQuote('^VIX', '1mo');

      let vix, level, interpretation;

      if (vixData && vixData.prices && vixData.prices.length > 0) {
        vix = vixData.prices[vixData.prices.length - 1];
      } else {
        // Fallback: estimate from SPY volatility
        const spyData = await this.fetchYahooQuote('SPY', '1mo');
        if (spyData && spyData.prices) {
          vix = this.calculateVolatility(spyData.prices) * 100;
        } else {
          vix = 18; // Historical average
        }
      }

      // Interpret VIX level
      if (vix < 12) {
        level = 'very-low';
        interpretation = 'Complacent market, potential for sudden moves';
      } else if (vix < 20) {
        level = 'low';
        interpretation = 'Normal market conditions, moderate volatility';
      } else if (vix < 30) {
        level = 'elevated';
        interpretation = 'Increased uncertainty, larger price swings expected';
      } else if (vix < 40) {
        level = 'high';
        interpretation = 'High fear, significant market stress';
      } else {
        level = 'extreme';
        interpretation = 'Panic conditions, extreme volatility';
      }

      const result = {
        vix: Math.round(vix * 100) / 100,
        level,
        interpretation
      };

      this.setCache('volatility', result);
      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Volatility error', {
        error: error.message
      });
      return { vix: 18, level: 'moderate', interpretation: 'Data unavailable, assuming normal conditions' };
    }
  }

  /**
   * Get major indices performance
   */
  async getIndicesPerformance() {
    const cached = this.getFromCache('indices');
    if (cached) return cached;

    try {
      const symbols = ['SPY', 'QQQ', 'IWM', 'DIA']; // S&P 500, Nasdaq, Russell 2000, Dow
      const names = ['S&P 500', 'Nasdaq', 'Russell 2000', 'Dow Jones'];

      const results = await Promise.all(
        symbols.map(symbol => this.fetchYahooQuote(symbol, '1mo'))
      );

      const indices = {};

      results.forEach((data, i) => {
        if (data && data.prices && data.prices.length >= 2) {
          const current = data.prices[data.prices.length - 1];
          const dayAgo = data.prices[data.prices.length - 2];
          const weekAgo = data.prices[Math.max(0, data.prices.length - 7)];
          const monthAgo = data.prices[0];

          const dailyChange = ((current - dayAgo) / dayAgo) * 100;
          const weeklyChange = ((current - weekAgo) / weekAgo) * 100;
          const monthlyChange = ((current - monthAgo) / monthAgo) * 100;

          let trend = 'neutral';
          if (dailyChange > 0.5 && weeklyChange > 1) trend = 'bullish';
          else if (dailyChange < -0.5 && weeklyChange < -1) trend = 'bearish';

          indices[symbols[i]] = {
            name: names[i],
            price: current,
            dailyChange: Math.round(dailyChange * 100) / 100,
            weeklyChange: Math.round(weeklyChange * 100) / 100,
            monthlyChange: Math.round(monthlyChange * 100) / 100,
            trend
          };
        }
      });

      this.setCache('indices', indices);
      return indices;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Indices error', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Get sector performance (simplified)
   */
  async getSectorPerformance() {
    const cached = this.getFromCache('sectors');
    if (cached) return cached;

    try {
      // Sector ETFs
      const sectors = {
        'XLK': 'Technology',
        'XLF': 'Financials',
        'XLV': 'Healthcare',
        'XLE': 'Energy',
        'XLI': 'Industrials',
        'XLY': 'Consumer Discretionary'
      };

      const results = await Promise.all(
        Object.keys(sectors).map(symbol => this.fetchYahooQuote(symbol, '5d'))
      );

      const performance = [];

      results.forEach((data, i) => {
        const symbol = Object.keys(sectors)[i];
        if (data && data.prices && data.prices.length >= 2) {
          const current = data.prices[data.prices.length - 1];
          const weekAgo = data.prices[0];
          const change = ((current - weekAgo) / weekAgo) * 100;

          performance.push({
            sector: sectors[symbol],
            symbol,
            weeklyChange: Math.round(change * 100) / 100
          });
        }
      });

      // Sort by performance
      performance.sort((a, b) => b.weeklyChange - a.weeklyChange);

      const result = {
        leaders: performance.slice(0, 3),
        laggards: performance.slice(-3),
        rotation: this.detectSectorRotation(performance)
      };

      this.setCache('sectors', result);
      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Sectors error', {
        error: error.message
      });
      return { leaders: [], laggards: [], rotation: 'unclear' };
    }
  }

  /**
   * Get currency strength (DXY - Dollar Index proxy)
   */
  async getCurrencyStrength() {
    const cached = this.getFromCache('currency');
    if (cached) return cached;

    try {
      // Use EUR/USD as inverse DXY proxy
      const eurusdData = await this.fetchYahooQuote('EURUSD=X', '1mo');

      if (!eurusdData || !eurusdData.prices || eurusdData.prices.length < 2) {
        return { strength: 'neutral', interpretation: 'Data unavailable' };
      }

      const current = eurusdData.prices[eurusdData.prices.length - 1];
      const weekAgo = eurusdData.prices[Math.max(0, eurusdData.prices.length - 7)];
      const change = ((current - weekAgo) / weekAgo) * 100;

      let strength, interpretation;

      // EUR/USD up = Dollar weak, EUR/USD down = Dollar strong
      if (change > 1) {
        strength = 'weak';
        interpretation = 'Dollar weakening, positive for commodities and emerging markets';
      } else if (change < -1) {
        strength = 'strong';
        interpretation = 'Dollar strengthening, negative for commodities, positive for US stocks';
      } else {
        strength = 'neutral';
        interpretation = 'Dollar stable, balanced market conditions';
      }

      const result = {
        strength,
        eurusd: current,
        weeklyChange: Math.round(change * 100) / 100,
        interpretation
      };

      this.setCache('currency', result);
      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Currency error', {
        error: error.message
      });
      return { strength: 'neutral', interpretation: 'Data unavailable' };
    }
  }

  /**
   * Get market sentiment (simplified fear/greed proxy)
   */
  async getMarketSentiment() {
    const cached = this.getFromCache('sentiment');
    if (cached) return cached;

    try {
      // Proxy sentiment using VIX and SPY momentum
      const volatility = await this.getVolatilityLevel();
      const indices = await this.getIndicesPerformance();

      let score = 50; // Neutral

      // VIX component (40% weight)
      if (volatility.vix < 15) score += 16;
      else if (volatility.vix < 20) score += 8;
      else if (volatility.vix > 30) score -= 16;
      else if (volatility.vix > 20) score -= 8;

      // SPY momentum component (40% weight)
      if (indices.SPY) {
        if (indices.SPY.weeklyChange > 2) score += 16;
        else if (indices.SPY.weeklyChange > 0) score += 8;
        else if (indices.SPY.weeklyChange < -2) score -= 16;
        else if (indices.SPY.weeklyChange < 0) score -= 8;
      }

      // Breadth component (20% weight) - QQQ vs IWM divergence
      if (indices.QQQ && indices.IWM) {
        const divergence = indices.QQQ.weeklyChange - indices.IWM.weeklyChange;
        if (Math.abs(divergence) > 3) score -= 4; // Divergence = uncertain
        else score += 4; // Agreement = confident
      }

      score = Math.max(0, Math.min(100, score));

      let level, interpretation;
      if (score < 25) {
        level = 'extreme-fear';
        interpretation = 'Panic selling, potential contrarian buy opportunity';
      } else if (score < 45) {
        level = 'fear';
        interpretation = 'Cautious market, defensive positioning';
      } else if (score < 55) {
        level = 'neutral';
        interpretation = 'Balanced sentiment, no strong directional bias';
      } else if (score < 75) {
        level = 'greed';
        interpretation = 'Optimistic market, risk-on behavior';
      } else {
        level = 'extreme-greed';
        interpretation = 'Euphoria, potential contrarian sell opportunity';
      }

      const result = {
        score,
        level,
        interpretation
      };

      this.setCache('sentiment', result);
      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Sentiment error', {
        error: error.message
      });
      return { score: 50, level: 'neutral', interpretation: 'Data unavailable' };
    }
  }

  /**
   * Generate human-readable context summary
   */
  generateContextSummary(regime, volatility, indices, sectors) {
    const parts = [];

    // Regime
    parts.push(`Market regime: ${regime.current.toUpperCase()}`);

    // Volatility
    parts.push(`Volatility: ${volatility.level} (VIX ${volatility.vix})`);

    // Indices
    if (indices.SPY) {
      parts.push(`SPY: ${indices.SPY.dailyChange > 0 ? '+' : ''}${indices.SPY.dailyChange}% today`);
    }

    // Sectors
    if (sectors.leaders && sectors.leaders.length > 0) {
      parts.push(`Leading sector: ${sectors.leaders[0].sector}`);
    }

    return parts.join(' | ');
  }

  /**
   * Fetch quote from Yahoo Finance (free, no API key)
   */
  async fetchYahooQuote(symbol, range = '1mo') {
    return new Promise((resolve, reject) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`;

      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.chart && json.chart.result && json.chart.result[0]) {
              const result = json.chart.result[0];
              const prices = result.indicators.quote[0].close.filter(p => p !== null);
              resolve({ prices, symbol });
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
   * Calculate Simple Moving Average
   */
  calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * Calculate historical volatility (standard deviation of returns)
   */
  calculateVolatility(prices) {
    if (prices.length < 2) return 0.15; // Default 15%

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * Detect sector rotation pattern
   */
  detectSectorRotation(performance) {
    if (performance.length < 3) return 'unclear';

    const topSector = performance[0].sector;

    // Simplified rotation detection
    if (topSector === 'Technology' || topSector === 'Consumer Discretionary') {
      return 'risk-on'; // Growth sectors leading
    } else if (topSector === 'Healthcare' || topSector === 'Consumer Staples') {
      return 'risk-off'; // Defensive sectors leading
    } else if (topSector === 'Financials' || topSector === 'Industrials') {
      return 'recovery'; // Cyclical sectors leading
    } else if (topSector === 'Energy') {
      return 'inflation-hedge'; // Commodity sectors leading
    }

    return 'mixed';
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

  /**
   * Fallback contexts when data unavailable
   */
  getFallbackRegime() {
    return {
      current: 'unknown',
      confidence: 0,
      indicators: {
        price: 0,
        sma50: 0,
        sma200: 0,
        trendStrength: 0
      }
    };
  }

  getFallbackContext() {
    return {
      timestamp: Date.now(),
      regime: this.getFallbackRegime(),
      volatility: { vix: 18, level: 'moderate', interpretation: 'Historical average assumed' },
      indices: {},
      sectors: { leaders: [], laggards: [], rotation: 'unclear' },
      currency: { strength: 'neutral', interpretation: 'Data unavailable' },
      sentiment: { score: 50, level: 'neutral', interpretation: 'Neutral assumed' },
      summary: 'Market context unavailable - using historical defaults'
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    this.plugin.memoryEngine.log('MARKET_CONTEXT', 'Cache cleared');
  }
}

module.exports = MarketContextProvider;
