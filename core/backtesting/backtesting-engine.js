/**
 * Backtesting Engine
 *
 * Validates trading strategies against historical data.
 * Supports walk-forward analysis, Monte Carlo simulation, and comprehensive metrics.
 */

class BacktestingEngine {
  constructor(plugin) {
    this.plugin = plugin;
    this.backtests = [];
    this.currentBacktest = null;

    this.plugin.memoryEngine.log('BACKTESTING', 'Initialized');
  }

  /**
   * Run backtest
   */
  async runBacktest(options) {
    const {
      strategy,
      symbol,
      market = 'stocks',
      startDate,
      endDate,
      initialCapital = 10000,
      commission = 0.001, // 0.1% per trade
      slippage = 0.0005, // 0.05% slippage
      riskPerTrade = 0.01, // 1% per trade
      compound = true
    } = options;

    const backtestId = `backtest-${Date.now()}`;

    this.currentBacktest = {
      id: backtestId,
      strategy: strategy.name || 'unnamed',
      symbol,
      market,
      startDate,
      endDate,
      initialCapital,
      settings: { commission, slippage, riskPerTrade, compound },
      trades: [],
      equity: [{ timestamp: startDate, equity: initialCapital }],
      status: 'running',
      startTime: Date.now()
    };

    this.plugin.memoryEngine.log('BACKTESTING', 'Backtest started', {
      backtestId,
      symbol,
      period: `${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`
    });

    try {
      // Get historical data
      const bars = await this.plugin.marketDataFeed.getHistoricalData(symbol, {
        market,
        interval: strategy.timeframe || '1d',
        startDate,
        endDate
      });

      if (bars.length === 0) {
        throw new Error('No historical data available');
      }

      this.plugin.memoryEngine.log('BACKTESTING', 'Historical data loaded', {
        backtestId,
        bars: bars.length
      });

      // Run strategy simulation
      let capital = initialCapital;
      let position = null;
      let peakCapital = initialCapital;

      for (let i = strategy.lookback || 50; i < bars.length; i++) {
        const currentBar = bars[i];
        const historicalBars = bars.slice(Math.max(0, i - 200), i + 1);

        // Check for exit signal if in position
        if (position) {
          const exitSignal = await this.evaluateExit(strategy, position, currentBar, historicalBars);

          if (exitSignal) {
            // Close position
            const exitPrice = this.applySlippage(currentBar.close, slippage, 'sell');
            const pnl = (exitPrice - position.entry) * position.size - (position.entry * position.size * commission) - (exitPrice * position.size * commission);

            capital += pnl;

            this.currentBacktest.trades.push({
              ...position,
              exit: exitPrice,
              exitTime: currentBar.timestamp,
              pnl,
              pnlPercent: (pnl / (position.entry * position.size)) * 100,
              bars: Math.floor((currentBar.timestamp - position.entryTime) / (24 * 60 * 60 * 1000)),
              win: pnl > 0
            });

            this.currentBacktest.equity.push({
              timestamp: currentBar.timestamp,
              equity: capital
            });

            peakCapital = Math.max(peakCapital, capital);
            position = null;
          }
        }

        // Check for entry signal if not in position
        if (!position && capital > 0) {
          const entrySignal = await this.evaluateEntry(strategy, currentBar, historicalBars);

          if (entrySignal) {
            // Open position
            const entryPrice = this.applySlippage(currentBar.close, slippage, 'buy');
            const stop = entrySignal.stop || entryPrice * 0.98; // Default 2% stop
            const risk = Math.abs(entryPrice - stop);
            const riskAmount = compound ? capital * riskPerTrade : initialCapital * riskPerTrade;
            const size = Math.floor(riskAmount / risk);

            if (size > 0 && (size * entryPrice) <= capital) {
              position = {
                symbol,
                direction: entrySignal.direction || 'long',
                entry: entryPrice,
                stop,
                target: entrySignal.target || entryPrice * 1.05, // Default 5% target
                size,
                entryTime: currentBar.timestamp,
                setupType: entrySignal.setupType || 'unknown',
                reason: entrySignal.reason || 'Strategy signal'
              };
            }
          }
        }
      }

      // Close any open position at end
      if (position) {
        const lastBar = bars[bars.length - 1];
        const exitPrice = this.applySlippage(lastBar.close, slippage, 'sell');
        const pnl = (exitPrice - position.entry) * position.size - (position.entry * position.size * commission) - (exitPrice * position.size * commission);

        capital += pnl;

        this.currentBacktest.trades.push({
          ...position,
          exit: exitPrice,
          exitTime: lastBar.timestamp,
          pnl,
          pnlPercent: (pnl / (position.entry * position.size)) * 100,
          bars: Math.floor((lastBar.timestamp - position.entryTime) / (24 * 60 * 60 * 1000)),
          win: pnl > 0,
          forcedExit: true
        });

        this.currentBacktest.equity.push({
          timestamp: lastBar.timestamp,
          equity: capital
        });
      }

      // Calculate metrics
      this.currentBacktest.finalCapital = capital;
      this.currentBacktest.metrics = this.calculateMetrics(this.currentBacktest.trades, initialCapital, capital);
      this.currentBacktest.status = 'complete';
      this.currentBacktest.endTime = Date.now();
      this.currentBacktest.duration = this.currentBacktest.endTime - this.currentBacktest.startTime;

      this.backtests.push(this.currentBacktest);

      this.plugin.memoryEngine.log('BACKTESTING', 'Backtest complete', {
        backtestId,
        trades: this.currentBacktest.trades.length,
        winRate: this.currentBacktest.metrics.winRate,
        finalCapital: this.currentBacktest.finalCapital
      });

      return this.currentBacktest;
    } catch (error) {
      this.currentBacktest.status = 'failed';
      this.currentBacktest.error = error.message;

      this.plugin.memoryEngine.log('BACKTESTING', 'Backtest failed', {
        backtestId,
        error: error.message
      });

      throw error;
    } finally {
      this.currentBacktest = null;
    }
  }

  /**
   * Evaluate entry signal
   */
  async evaluateEntry(strategy, currentBar, historicalBars) {
    // Execute strategy entry logic
    if (typeof strategy.onBar === 'function') {
      const signal = await strategy.onBar(currentBar, historicalBars, 'entry');
      return signal;
    }

    // Default simple strategy (for demo)
    const sma50 = this.calculateSMA(historicalBars, 50);
    const sma200 = this.calculateSMA(historicalBars, 200);

    if (sma50 && sma200 && currentBar.close > sma50 && sma50 > sma200) {
      return {
        direction: 'long',
        stop: currentBar.close * 0.98,
        target: currentBar.close * 1.05,
        setupType: 'A',
        reason: 'Golden cross - price above SMA50 above SMA200'
      };
    }

    return null;
  }

  /**
   * Evaluate exit signal
   */
  async evaluateExit(strategy, position, currentBar, historicalBars) {
    // Execute strategy exit logic
    if (typeof strategy.onBar === 'function') {
      const signal = await strategy.onBar(currentBar, historicalBars, 'exit', position);
      if (signal) return true;
    }

    // Default exits
    // Stop loss hit
    if (position.direction === 'long' && currentBar.low <= position.stop) {
      return true;
    }

    // Target hit
    if (position.direction === 'long' && currentBar.high >= position.target) {
      return true;
    }

    return false;
  }

  /**
   * Apply slippage
   */
  applySlippage(price, slippage, direction) {
    if (direction === 'buy') {
      return price * (1 + slippage);
    } else {
      return price * (1 - slippage);
    }
  }

  /**
   * Calculate SMA helper
   */
  calculateSMA(bars, period) {
    if (bars.length < period) return null;
    const closes = bars.slice(-period).map(b => b.close);
    return closes.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate backtest metrics
   */
  calculateMetrics(trades, initialCapital, finalCapital) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        calmarRatio: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        averageRR: 0,
        expectancy: 0,
        totalReturn: 0,
        totalReturnPercent: 0
      };
    }

    const winners = trades.filter(t => t.win);
    const losers = trades.filter(t => !t.win);

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

    const winRate = winners.length / trades.length;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const averageWin = winners.length > 0 ? totalWins / winners.length : 0;
    const averageLoss = losers.length > 0 ? totalLosses / losers.length : 0;
    const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

    const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.pnl)) : 0;
    const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.pnl)) : 0;

    // Risk/reward
    const averageRR = trades.reduce((sum, t) => {
      const risk = Math.abs(t.entry - t.stop) * t.size;
      const reward = Math.abs(t.exit - t.entry) * t.size;
      return sum + (risk > 0 ? reward / risk : 0);
    }, 0) / trades.length;

    // Drawdown
    let peak = initialCapital;
    let maxDD = 0;
    let equity = initialCapital;

    trades.forEach(trade => {
      equity += trade.pnl;
      if (equity > peak) {
        peak = equity;
      } else {
        const dd = peak - equity;
        maxDD = Math.max(maxDD, dd);
      }
    });

    const maxDrawdownPercent = (maxDD / peak) * 100;

    // Sharpe & Sortino (simplified - daily returns approximation)
    const returns = trades.map(t => t.pnlPercent / 100);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const downside = returns.filter(r => r < 0);
    const downsideStdDev = downside.length > 0
      ? Math.sqrt(downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length)
      : stdDev;
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;

    // Calmar ratio
    const annualizedReturn = (Math.pow(finalCapital / initialCapital, 252 / trades.length) - 1) * 100;
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: (winRate * 100).toFixed(1),
      profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
      sortinoRatio: sortinoRatio.toFixed(2),
      calmarRatio: calmarRatio.toFixed(2),
      maxDrawdown: maxDD.toFixed(2),
      maxDrawdownPercent: maxDrawdownPercent.toFixed(1),
      averageWin: averageWin.toFixed(2),
      averageLoss: averageLoss.toFixed(2),
      largestWin: largestWin.toFixed(2),
      largestLoss: largestLoss.toFixed(2),
      averageRR: averageRR.toFixed(2),
      expectancy: expectancy.toFixed(2),
      totalReturn: totalPnL.toFixed(2),
      totalReturnPercent: ((finalCapital - initialCapital) / initialCapital * 100).toFixed(1)
    };
  }

  /**
   * Walk-forward analysis
   */
  async walkForwardAnalysis(options) {
    const {
      strategy,
      symbol,
      market,
      startDate,
      endDate,
      inSamplePeriod = 180, // days
      outSamplePeriod = 30, // days
      initialCapital = 10000
    } = options;

    const periods = [];
    let currentDate = startDate;

    // Generate in-sample and out-of-sample periods
    while (currentDate < endDate) {
      const inSampleEnd = currentDate + (inSamplePeriod * 24 * 60 * 60 * 1000);
      const outSampleEnd = inSampleEnd + (outSamplePeriod * 24 * 60 * 60 * 1000);

      if (outSampleEnd > endDate) break;

      periods.push({
        inSample: { start: currentDate, end: inSampleEnd },
        outSample: { start: inSampleEnd, end: outSampleEnd }
      });

      currentDate = outSampleEnd;
    }

    this.plugin.memoryEngine.log('BACKTESTING', 'Walk-forward analysis started', {
      symbol,
      periods: periods.length
    });

    const results = [];

    for (const period of periods) {
      // Run backtest on out-of-sample period
      const backtest = await this.runBacktest({
        strategy,
        symbol,
        market,
        startDate: period.outSample.start,
        endDate: period.outSample.end,
        initialCapital
      });

      results.push({
        period: period.outSample,
        metrics: backtest.metrics,
        trades: backtest.trades.length
      });
    }

    // Calculate aggregate metrics
    const aggregateMetrics = {
      periods: results.length,
      averageWinRate: (results.reduce((sum, r) => sum + parseFloat(r.metrics.winRate), 0) / results.length).toFixed(1),
      averageProfitFactor: (results.reduce((sum, r) => sum + (parseFloat(r.metrics.profitFactor) || 0), 0) / results.length).toFixed(2),
      averageSharpe: (results.reduce((sum, r) => sum + parseFloat(r.metrics.sharpeRatio), 0) / results.length).toFixed(2),
      consistency: this.calculateConsistency(results)
    };

    return {
      strategy: strategy.name,
      symbol,
      periods: results,
      aggregateMetrics
    };
  }

  /**
   * Calculate consistency score
   */
  calculateConsistency(results) {
    const profitablePeriods = results.filter(r => parseFloat(r.metrics.totalReturnPercent) > 0).length;
    return ((profitablePeriods / results.length) * 100).toFixed(1);
  }

  /**
   * Monte Carlo simulation
   */
  async monteCarloSimulation(backtest, iterations = 1000) {
    if (!backtest || !backtest.trades || backtest.trades.length === 0) {
      throw new Error('Invalid backtest or no trades available');
    }

    this.plugin.memoryEngine.log('BACKTESTING', 'Monte Carlo simulation started', {
      backtestId: backtest.id,
      iterations
    });

    const trades = backtest.trades;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      // Randomly shuffle trades
      const shuffled = [...trades].sort(() => Math.random() - 0.5);

      let equity = backtest.initialCapital;
      let peak = equity;
      let maxDD = 0;

      shuffled.forEach(trade => {
        equity += trade.pnl;
        if (equity > peak) {
          peak = equity;
        } else {
          const dd = (peak - equity) / peak;
          maxDD = Math.max(maxDD, dd);
        }
      });

      results.push({
        finalEquity: equity,
        return: ((equity - backtest.initialCapital) / backtest.initialCapital) * 100,
        maxDrawdown: maxDD * 100
      });
    }

    // Calculate statistics
    results.sort((a, b) => a.return - b.return);

    const median = results[Math.floor(iterations / 2)].return;
    const percentile5 = results[Math.floor(iterations * 0.05)].return;
    const percentile95 = results[Math.floor(iterations * 0.95)].return;

    const avgReturn = results.reduce((sum, r) => sum + r.return, 0) / iterations;
    const avgMaxDD = results.reduce((sum, r) => sum + r.maxDrawdown, 0) / iterations;

    const probabilityProfit = (results.filter(r => r.return > 0).length / iterations) * 100;

    return {
      iterations,
      medianReturn: median.toFixed(1),
      percentile5: percentile5.toFixed(1),
      percentile95: percentile95.toFixed(1),
      averageReturn: avgReturn.toFixed(1),
      averageMaxDrawdown: avgMaxDD.toFixed(1),
      probabilityOfProfit: probabilityProfit.toFixed(1)
    };
  }

  /**
   * Get backtest by ID
   */
  getBacktest(backtestId) {
    return this.backtests.find(b => b.id === backtestId);
  }

  /**
   * List all backtests
   */
  listBacktests() {
    return this.backtests.map(b => ({
      id: b.id,
      strategy: b.strategy,
      symbol: b.symbol,
      startDate: b.startDate,
      endDate: b.endDate,
      trades: b.trades.length,
      winRate: b.metrics?.winRate,
      totalReturn: b.metrics?.totalReturnPercent,
      status: b.status
    }));
  }

  /**
   * Compare strategies
   */
  compareStrategies(backtestIds) {
    const backtests = backtestIds.map(id => this.getBacktest(id)).filter(b => b);

    return backtests.map(b => ({
      strategy: b.strategy,
      symbol: b.symbol,
      trades: b.trades.length,
      winRate: b.metrics.winRate,
      profitFactor: b.metrics.profitFactor,
      sharpeRatio: b.metrics.sharpeRatio,
      maxDrawdown: b.metrics.maxDrawdownPercent,
      totalReturn: b.metrics.totalReturnPercent
    }));
  }

  /**
   * Export backtest to JSON
   */
  exportBacktest(backtestId) {
    const backtest = this.getBacktest(backtestId);
    if (!backtest) return null;

    return JSON.stringify(backtest, null, 2);
  }

  /**
   * Clear all backtests
   */
  clearAll() {
    this.backtests = [];
    this.currentBacktest = null;
    this.plugin.memoryEngine.log('BACKTESTING', 'All backtests cleared');
  }
}

module.exports = BacktestingEngine;
