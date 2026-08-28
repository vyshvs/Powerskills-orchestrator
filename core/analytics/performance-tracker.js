/**
 * Performance Tracker
 *
 * Tracks trading performance metrics and generates insights.
 * Analyzes win rates by setup, agent, market, timeframe, and strategy.
 */

class PerformanceTracker {
  constructor(plugin) {
    this.plugin = plugin;
    this.trades = [];
    this.sessions = [];
    this.currentSession = null;

    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'Initialized');
  }

  /**
   * Start new trading session
   */
  startSession(metadata = {}) {
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTime: Date.now(),
      endTime: null,
      trades: [],
      metadata,
      statistics: null
    };

    this.sessions.push(this.currentSession);

    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'Session started', {
      sessionId: this.currentSession.id
    });

    return this.currentSession.id;
  }

  /**
   * End current session
   */
  endSession() {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    this.currentSession.statistics = this.calculateSessionStatistics(this.currentSession);

    const sessionId = this.currentSession.id;
    this.currentSession = null;

    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'Session ended', {
      sessionId,
      trades: this.currentSession?.trades.length || 0
    });

    return sessionId;
  }

  /**
   * Record trade
   */
  recordTrade(trade) {
    const tradeRecord = {
      id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...trade,
      // Required fields validation
      symbol: trade.symbol || 'UNKNOWN',
      market: trade.market || 'unknown',
      direction: trade.direction || 'long',
      entry: trade.entry || 0,
      exit: trade.exit || 0,
      stop: trade.stop || 0,
      size: trade.size || 0,
      pnl: trade.pnl || 0,
      pnlPercent: trade.entry ? ((trade.exit - trade.entry) / trade.entry * 100) : 0,
      setupType: trade.setupType || 'unknown', // A+, A, B, C
      agent: trade.agent || 'manual',
      strategy: trade.strategy || 'unknown',
      timeframe: trade.timeframe || 'unknown',
      duration: trade.exitTime && trade.entryTime ? trade.exitTime - trade.entryTime : 0,
      win: trade.pnl > 0,
      riskReward: this.calculateRiskReward(trade)
    };

    this.trades.push(tradeRecord);

    if (this.currentSession) {
      this.currentSession.trades.push(tradeRecord);
    }

    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'Trade recorded', {
      tradeId: tradeRecord.id,
      symbol: tradeRecord.symbol,
      pnl: tradeRecord.pnl,
      win: tradeRecord.win
    });

    return tradeRecord.id;
  }

  /**
   * Calculate risk/reward ratio
   */
  calculateRiskReward(trade) {
    if (!trade.entry || !trade.stop || !trade.exit) return 0;

    const risk = Math.abs(trade.entry - trade.stop);
    const reward = Math.abs(trade.exit - trade.entry);

    return risk > 0 ? reward / risk : 0;
  }

  /**
   * Get overall statistics
   */
  getOverallStatistics(options = {}) {
    const {
      startDate = 0,
      endDate = Date.now(),
      market = null,
      setupType = null,
      agent = null
    } = options;

    let filteredTrades = this.trades.filter(t =>
      t.timestamp >= startDate && t.timestamp <= endDate
    );

    if (market) {
      filteredTrades = filteredTrades.filter(t => t.market === market);
    }

    if (setupType) {
      filteredTrades = filteredTrades.filter(t => t.setupType === setupType);
    }

    if (agent) {
      filteredTrades = filteredTrades.filter(t => t.agent === agent);
    }

    return this.calculateStatistics(filteredTrades);
  }

  /**
   * Calculate statistics for trade set
   */
  calculateStatistics(trades) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0,
        averageRR: 0,
        expectancy: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        maxDrawdown: 0,
        recoveryTime: 0
      };
    }

    const winners = trades.filter(t => t.win);
    const losers = trades.filter(t => !t.win);

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

    const averageWin = winners.length > 0 ? totalWins / winners.length : 0;
    const averageLoss = losers.length > 0 ? totalLosses / losers.length : 0;

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const averageRR = trades.reduce((sum, t) => sum + t.riskReward, 0) / trades.length;

    const winRate = winners.length / trades.length;
    const expectancy = (winRate * averageWin) - ((1 - winRate) * averageLoss);

    const { maxConsecutiveWins, maxConsecutiveLosses } = this.calculateStreaks(trades);
    const { maxDrawdown, recoveryTime } = this.calculateDrawdown(trades);

    return {
      totalTrades: trades.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: (winRate * 100).toFixed(1),
      totalPnL: totalPnL.toFixed(2),
      averageWin: averageWin.toFixed(2),
      averageLoss: averageLoss.toFixed(2),
      largestWin: winners.length > 0 ? Math.max(...winners.map(t => t.pnl)).toFixed(2) : 0,
      largestLoss: losers.length > 0 ? Math.min(...losers.map(t => t.pnl)).toFixed(2) : 0,
      profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
      averageRR: averageRR.toFixed(2),
      expectancy: expectancy.toFixed(2),
      maxConsecutiveWins,
      maxConsecutiveLosses,
      maxDrawdown: (maxDrawdown * 100).toFixed(1),
      recoveryTime: this.formatDuration(recoveryTime)
    };
  }

  /**
   * Calculate win/loss streaks
   */
  calculateStreaks(trades) {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(trade => {
      if (trade.win) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });

    return { maxConsecutiveWins, maxConsecutiveLosses };
  }

  /**
   * Calculate drawdown
   */
  calculateDrawdown(trades) {
    let peak = 0;
    let equity = 0;
    let maxDrawdown = 0;
    let drawdownStart = 0;
    let drawdownEnd = 0;
    let inDrawdown = false;

    trades.forEach((trade, index) => {
      equity += trade.pnl;

      if (equity > peak) {
        peak = equity;
        if (inDrawdown) {
          drawdownEnd = index;
          inDrawdown = false;
        }
      } else {
        const currentDrawdown = (peak - equity) / peak;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
          if (!inDrawdown) {
            drawdownStart = index;
            inDrawdown = true;
          }
        }
      }
    });

    const recoveryTime = drawdownEnd > drawdownStart
      ? trades[drawdownEnd].timestamp - trades[drawdownStart].timestamp
      : 0;

    return { maxDrawdown, recoveryTime };
  }

  /**
   * Get statistics by setup type
   */
  getStatisticsBySetupType() {
    const setupTypes = ['A+', 'A', 'B', 'C'];
    const stats = {};

    setupTypes.forEach(type => {
      const trades = this.trades.filter(t => t.setupType === type);
      stats[type] = this.calculateStatistics(trades);
    });

    return stats;
  }

  /**
   * Get statistics by agent
   */
  getStatisticsByAgent() {
    const agents = [...new Set(this.trades.map(t => t.agent))];
    const stats = {};

    agents.forEach(agent => {
      const trades = this.trades.filter(t => t.agent === agent);
      stats[agent] = this.calculateStatistics(trades);
    });

    return stats;
  }

  /**
   * Get statistics by market
   */
  getStatisticsByMarket() {
    const markets = [...new Set(this.trades.map(t => t.market))];
    const stats = {};

    markets.forEach(market => {
      const trades = this.trades.filter(t => t.market === market);
      stats[market] = this.calculateStatistics(trades);
    });

    return stats;
  }

  /**
   * Get statistics by timeframe
   */
  getStatisticsByTimeframe() {
    const timeframes = [...new Set(this.trades.map(t => t.timeframe))];
    const stats = {};

    timeframes.forEach(tf => {
      const trades = this.trades.filter(t => t.timeframe === tf);
      stats[tf] = this.calculateStatistics(trades);
    });

    return stats;
  }

  /**
   * Get statistics by strategy
   */
  getStatisticsByStrategy() {
    const strategies = [...new Set(this.trades.map(t => t.strategy))];
    const stats = {};

    strategies.forEach(strategy => {
      const trades = this.trades.filter(t => t.strategy === strategy);
      stats[strategy] = this.calculateStatistics(trades);
    });

    return stats;
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(options = {}) {
    const { period = 'all', includeRecommendations = true } = options;

    let startDate = 0;
    const endDate = Date.now();

    if (period === 'today') {
      startDate = new Date().setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = endDate - (7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = endDate - (30 * 24 * 60 * 60 * 1000);
    } else if (period === '3months') {
      startDate = endDate - (90 * 24 * 60 * 60 * 1000);
    }

    const overall = this.getOverallStatistics({ startDate, endDate });
    const bySetup = this.getStatisticsBySetupType();
    const byAgent = this.getStatisticsByAgent();
    const byMarket = this.getStatisticsByMarket();
    const byTimeframe = this.getStatisticsByTimeframe();
    const byStrategy = this.getStatisticsByStrategy();

    const report = {
      period,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      overall,
      bySetup,
      byAgent,
      byMarket,
      byTimeframe,
      byStrategy,
      recommendations: includeRecommendations ? this.generateRecommendations(overall, bySetup, byAgent, byMarket) : []
    };

    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'Report generated', {
      period,
      totalTrades: overall.totalTrades,
      winRate: overall.winRate
    });

    return report;
  }

  /**
   * Generate recommendations based on performance
   */
  generateRecommendations(overall, bySetup, byAgent, byMarket) {
    const recommendations = [];

    // Setup quality recommendations
    const setupStats = Object.entries(bySetup).filter(([_, stats]) => stats.totalTrades >= 5);
    if (setupStats.length > 0) {
      const bestSetup = setupStats.reduce((best, [type, stats]) =>
        parseFloat(stats.winRate) > parseFloat(best[1].winRate) ? [type, stats] : best
      );

      if (parseFloat(bestSetup[1].winRate) > parseFloat(overall.winRate)) {
        recommendations.push({
          type: 'focus-setup',
          priority: 'high',
          message: `Focus on ${bestSetup[0]} setups (${bestSetup[1].winRate}% win rate vs ${overall.winRate}% overall)`,
          impact: `+${(parseFloat(bestSetup[1].winRate) - parseFloat(overall.winRate)).toFixed(1)}% win rate improvement`
        });
      }

      const worstSetup = setupStats.reduce((worst, [type, stats]) =>
        parseFloat(stats.winRate) < parseFloat(worst[1].winRate) ? [type, stats] : worst
      );

      if (parseFloat(worstSetup[1].winRate) < 55) {
        recommendations.push({
          type: 'avoid-setup',
          priority: 'high',
          message: `Avoid ${worstSetup[0]} setups (${worstSetup[1].winRate}% win rate - barely profitable)`,
          impact: 'Eliminate coin-flip trades'
        });
      }
    }

    // Agent recommendations
    const agentStats = Object.entries(byAgent).filter(([_, stats]) => stats.totalTrades >= 3);
    if (agentStats.length > 1) {
      const bestAgent = agentStats.reduce((best, [agent, stats]) =>
        parseFloat(stats.winRate) > parseFloat(best[1].winRate) ? [agent, stats] : best
      );

      recommendations.push({
        type: 'prioritize-agent',
        priority: 'medium',
        message: `${bestAgent[0]} signals strongest (${bestAgent[1].winRate}% win rate)`,
        impact: 'Weight this agent higher in multi-agent decisions'
      });
    }

    // Market recommendations
    const marketStats = Object.entries(byMarket).filter(([_, stats]) => stats.totalTrades >= 5);
    if (marketStats.length > 1) {
      const bestMarket = marketStats.reduce((best, [market, stats]) =>
        parseFloat(stats.winRate) > parseFloat(best[1].winRate) ? [market, stats] : best
      );

      const worstMarket = marketStats.reduce((worst, [market, stats]) =>
        parseFloat(stats.winRate) < parseFloat(worst[1].winRate) ? [market, stats] : worst
      );

      if (parseFloat(bestMarket[1].winRate) - parseFloat(worstMarket[1].winRate) > 15) {
        recommendations.push({
          type: 'adjust-allocation',
          priority: 'high',
          message: `Increase ${bestMarket[0]} allocation (${bestMarket[1].winRate}% vs ${worstMarket[0]} ${worstMarket[1].winRate}%)`,
          impact: `+${(parseFloat(bestMarket[1].winRate) - parseFloat(worstMarket[1].winRate)).toFixed(1)}% performance gap`
        });

        if (parseFloat(worstMarket[1].winRate) < 55) {
          recommendations.push({
            type: 'reduce-exposure',
            priority: 'high',
            message: `Reduce or eliminate ${worstMarket[0]} trading (${worstMarket[1].winRate}% win rate)`,
            impact: 'Focus on higher-probability markets'
          });
        }
      }
    }

    // Risk/Reward recommendations
    if (parseFloat(overall.averageRR) < 2.0 && parseFloat(overall.winRate) < 65) {
      recommendations.push({
        type: 'improve-rr',
        priority: 'high',
        message: `Average R:R ${overall.averageRR} below target (2.0+). Target larger wins or tighter stops.`,
        impact: 'Improve profitability even with same win rate'
      });
    }

    // Drawdown warning
    if (parseFloat(overall.maxDrawdown) > 15) {
      recommendations.push({
        type: 'drawdown-warning',
        priority: 'critical',
        message: `Max drawdown ${overall.maxDrawdown}% exceeds comfort zone. Reduce position sizing or take break.`,
        impact: 'Protect capital and psychological state'
      });
    }

    // Profit factor recommendations
    const pf = parseFloat(overall.profitFactor);
    if (pf < 1.5 && pf !== Infinity) {
      recommendations.push({
        type: 'improve-edge',
        priority: 'high',
        message: `Profit factor ${overall.profitFactor} below target (1.5+). Tighten entry criteria or improve exits.`,
        impact: 'Increase average profit per dollar risked'
      });
    }

    return recommendations;
  }

  /**
   * Calculate session statistics
   */
  calculateSessionStatistics(session) {
    return this.calculateStatistics(session.trades);
  }

  /**
   * Get equity curve data
   */
  getEquityCurve(options = {}) {
    const { startDate = 0, endDate = Date.now() } = options;

    const filteredTrades = this.trades.filter(t =>
      t.timestamp >= startDate && t.timestamp <= endDate
    );

    let equity = 0;
    const curve = [{
      timestamp: startDate,
      equity: 0,
      trade: null
    }];

    filteredTrades.forEach(trade => {
      equity += trade.pnl;
      curve.push({
        timestamp: trade.timestamp,
        equity,
        trade: trade.id
      });
    });

    return curve;
  }

  /**
   * Export trades to CSV
   */
  exportToCSV() {
    const headers = [
      'timestamp', 'symbol', 'market', 'direction', 'entry', 'exit', 'stop',
      'size', 'pnl', 'pnlPercent', 'setupType', 'agent', 'strategy',
      'timeframe', 'duration', 'win', 'riskReward'
    ];

    let csv = headers.join(',') + '\n';

    this.trades.forEach(trade => {
      const row = headers.map(h => trade[h] || '').join(',');
      csv += row + '\n';
    });

    return csv;
  }

  /**
   * Format duration
   */
  formatDuration(ms) {
    if (ms === 0) return '0';

    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(ms / (60 * 1000))}m`;
  }

  /**
   * Clear all data
   */
  clearAll() {
    this.trades = [];
    this.sessions = [];
    this.currentSession = null;
    this.plugin.memoryEngine.log('PERFORMANCE_TRACKER', 'All data cleared');
  }

  /**
   * Get trade count
   */
  getTradeCount() {
    return this.trades.length;
  }

  /**
   * Get session count
   */
  getSessionCount() {
    return this.sessions.length;
  }
}

module.exports = PerformanceTracker;
