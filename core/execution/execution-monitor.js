/**
 * Execution Monitor
 *
 * Purpose: Real-time monitoring of live trading positions and orders
 * Features:
 * - Live position tracking with P&L updates
 * - Order status monitoring (pending → filled/rejected)
 * - Risk alerts (position size, drawdown, portfolio heat)
 * - Trade journal automation
 * - Performance analytics integration
 * - Multi-broker position aggregation
 *
 * @module core/execution/execution-monitor
 */

class ExecutionMonitor {
  constructor(plugin) {
    this.plugin = plugin;
    this.activePositions = new Map();
    this.activeOrders = new Map();
    this.monitoringIntervals = new Map();
    this.alerts = [];
    this.journalEntries = [];
  }

  /**
   * Start monitoring a broker's positions and orders
   * @param {string} brokerId - Broker identifier
   * @param {Object} options - Monitoring options
   * @returns {Promise<Object>} Monitoring status
   */
  async startMonitoring(brokerId, options = {}) {
    const {
      interval = 5000, // 5 seconds
      enableAlerts = true,
      autoJournal = true,
      riskLimits = {}
    } = options;

    try {
      // Verify broker connection
      const brokers = this.plugin.mcpBrokerIntegration.getConnectedBrokers();
      const broker = brokers.find(b => b.id === brokerId);

      if (!broker) {
        throw new Error(`Broker ${brokerId} not connected. Connect first.`);
      }

      // Stop existing monitoring if running
      if (this.monitoringIntervals.has(brokerId)) {
        this.stopMonitoring(brokerId);
      }

      // Initial sync
      await this._syncPositions(brokerId);
      await this._syncOrders(brokerId);
      await this._syncAccount(brokerId);

      // Start monitoring loop
      const intervalId = setInterval(async () => {
        try {
          await this._monitoringLoop(brokerId, {
            enableAlerts,
            autoJournal,
            riskLimits
          });
        } catch (error) {
          this.plugin.emit('monitor-error', {
            brokerId,
            error: error.message
          });
        }
      }, interval);

      this.monitoringIntervals.set(brokerId, {
        intervalId,
        brokerId,
        startedAt: Date.now(),
        options: { interval, enableAlerts, autoJournal, riskLimits }
      });

      this.plugin.emit('monitoring-started', { brokerId });

      return {
        success: true,
        brokerId,
        message: 'Monitoring started',
        interval
      };

    } catch (error) {
      return {
        success: false,
        brokerId,
        error: error.message
      };
    }
  }

  /**
   * Stop monitoring a broker
   * @param {string} brokerId - Broker identifier
   * @returns {Object} Stop status
   */
  stopMonitoring(brokerId) {
    if (!this.monitoringIntervals.has(brokerId)) {
      return {
        success: false,
        brokerId,
        message: 'Not monitoring this broker'
      };
    }

    const { intervalId } = this.monitoringIntervals.get(brokerId);
    clearInterval(intervalId);
    this.monitoringIntervals.delete(brokerId);

    this.plugin.emit('monitoring-stopped', { brokerId });

    return {
      success: true,
      brokerId,
      message: 'Monitoring stopped'
    };
  }

  /**
   * Get current monitoring status
   * @returns {Array} Active monitors
   */
  getMonitoringStatus() {
    const status = [];

    for (const [brokerId, data] of this.monitoringIntervals.entries()) {
      const positions = this._getPositionsByBroker(brokerId);
      const orders = this._getOrdersByBroker(brokerId);

      status.push({
        brokerId,
        uptime: Date.now() - data.startedAt,
        interval: data.options.interval,
        activePositions: positions.length,
        activeOrders: orders.length,
        lastUpdate: data.lastUpdate || null
      });
    }

    return status;
  }

  /**
   * Get all active positions across all brokers
   * @param {Object} options - Filter options
   * @returns {Array} Active positions
   */
  getActivePositions(options = {}) {
    const { brokerId, symbol, side } = options;
    let positions = Array.from(this.activePositions.values());

    if (brokerId) {
      positions = positions.filter(p => p.brokerId === brokerId);
    }

    if (symbol) {
      positions = positions.filter(p => p.symbol === symbol);
    }

    if (side) {
      positions = positions.filter(p => p.side === side);
    }

    return positions.map(p => ({
      id: p.id,
      brokerId: p.brokerId,
      symbol: p.symbol,
      side: p.side,
      quantity: p.quantity,
      entryPrice: p.entryPrice,
      currentPrice: p.currentPrice,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      pnl: p.pnl,
      pnlPercent: p.pnlPercent,
      riskAmount: p.riskAmount,
      riskReward: p.riskReward,
      openedAt: p.openedAt,
      duration: Date.now() - p.openedAt,
      setupType: p.setupType,
      agent: p.agent
    }));
  }

  /**
   * Get all active orders across all brokers
   * @param {Object} options - Filter options
   * @returns {Array} Active orders
   */
  getActiveOrders(options = {}) {
    const { brokerId, symbol, status } = options;
    let orders = Array.from(this.activeOrders.values());

    if (brokerId) {
      orders = orders.filter(o => o.brokerId === brokerId);
    }

    if (symbol) {
      orders = orders.filter(o => o.symbol === symbol);
    }

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return orders.map(o => ({
      id: o.id,
      brokerId: o.brokerId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.quantity,
      price: o.price,
      stopPrice: o.stopPrice,
      status: o.status,
      filledQuantity: o.filledQuantity,
      remainingQuantity: o.remainingQuantity,
      avgFillPrice: o.avgFillPrice,
      placedAt: o.placedAt,
      age: Date.now() - o.placedAt
    }));
  }

  /**
   * Get portfolio summary across all brokers
   * @returns {Object} Portfolio summary
   */
  async getPortfolioSummary() {
    const positions = this.getActivePositions();
    const brokers = this.plugin.mcpBrokerIntegration.getConnectedBrokers();

    let totalBalance = 0;
    let totalEquity = 0;
    let totalPnl = 0;
    const accountDetails = [];

    // Aggregate account data
    for (const broker of brokers) {
      const account = await this.plugin.mcpBrokerIntegration.getAccount(broker.id);

      if (account.success) {
        totalBalance += account.account.balance;
        totalEquity += account.account.equity;

        accountDetails.push({
          brokerId: broker.id,
          name: broker.name,
          balance: account.account.balance,
          equity: account.account.equity,
          margin: account.account.margin,
          currency: account.account.currency
        });
      }
    }

    // Calculate position metrics
    const longPositions = positions.filter(p => p.side === 'long');
    const shortPositions = positions.filter(p => p.side === 'short');

    totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

    const portfolioHeat = positions.reduce((sum, p) => {
      const riskPercent = (p.riskAmount / totalBalance) * 100;
      return sum + riskPercent;
    }, 0);

    // Get risk metrics from user profile
    const userId = 'default';
    const profile = this.plugin.userProfileManager.getProfile(userId);

    return {
      timestamp: Date.now(),
      accounts: accountDetails,
      totalBalance,
      totalEquity,
      totalPnl,
      totalPnlPercent: (totalPnl / totalBalance) * 100,
      positions: {
        total: positions.length,
        long: longPositions.length,
        short: shortPositions.length,
        byMarket: this._groupByMarket(positions)
      },
      risk: {
        portfolioHeat: portfolioHeat.toFixed(2),
        maxAllowedHeat: profile.riskManagement.maxPortfolioHeat,
        heatStatus: portfolioHeat > profile.riskManagement.maxPortfolioHeat ? 'EXCEEDED' : 'OK',
        largestPosition: this._getLargestPosition(positions),
        exposureBySymbol: this._calculateExposure(positions)
      },
      performance: {
        dailyPnl: totalPnl, // Simplified - would track daily in production
        dailyPnlPercent: (totalPnl / totalBalance) * 100,
        winningPositions: positions.filter(p => p.pnl > 0).length,
        losingPositions: positions.filter(p => p.pnl < 0).length
      }
    };
  }

  /**
   * Get active alerts
   * @param {Object} options - Filter options
   * @returns {Array} Alerts
   */
  getAlerts(options = {}) {
    const { severity, acknowledged, limit = 50 } = options;
    let alerts = [...this.alerts];

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === acknowledged);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp - a.timestamp);

    return alerts.slice(0, limit);
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert identifier
   * @returns {Object} Result
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);

    if (!alert) {
      return {
        success: false,
        message: 'Alert not found'
      };
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();

    return {
      success: true,
      message: 'Alert acknowledged'
    };
  }

  /**
   * Get trade journal entries
   * @param {Object} options - Filter options
   * @returns {Array} Journal entries
   */
  getJournalEntries(options = {}) {
    const { symbol, setupType, limit = 50 } = options;
    let entries = [...this.journalEntries];

    if (symbol) {
      entries = entries.filter(e => e.symbol === symbol);
    }

    if (setupType) {
      entries = entries.filter(e => e.setupType === setupType);
    }

    entries.sort((a, b) => b.timestamp - a.timestamp);

    return entries.slice(0, limit);
  }

  /**
   * Add manual journal entry
   * @param {Object} entry - Journal entry
   * @returns {Object} Result
   */
  addJournalEntry(entry) {
    const journalEntry = {
      id: this._generateId(),
      timestamp: Date.now(),
      type: 'manual',
      ...entry
    };

    this.journalEntries.push(journalEntry);

    return {
      success: true,
      entry: journalEntry
    };
  }

  /**
   * Close a position manually
   * @param {string} positionId - Position identifier
   * @param {string} reason - Close reason
   * @returns {Promise<Object>} Result
   */
  async closePosition(positionId, reason = 'manual') {
    const position = this.activePositions.get(positionId);

    if (!position) {
      return {
        success: false,
        message: 'Position not found'
      };
    }

    try {
      // Place closing order
      const closeOrder = await this.plugin.mcpBrokerIntegration.placeOrder(
        position.brokerId,
        {
          symbol: position.symbol,
          side: position.side === 'long' ? 'sell' : 'buy',
          type: 'market',
          quantity: position.quantity
        }
      );

      if (!closeOrder.success) {
        throw new Error(closeOrder.error);
      }

      // Create journal entry
      const journalEntry = {
        symbol: position.symbol,
        side: position.side,
        entryPrice: position.entryPrice,
        exitPrice: position.currentPrice,
        quantity: position.quantity,
        pnl: position.pnl,
        pnlPercent: position.pnlPercent,
        setupType: position.setupType,
        agent: position.agent,
        duration: Date.now() - position.openedAt,
        closeReason: reason,
        notes: `Closed manually: ${reason}`
      };

      this.addJournalEntry(journalEntry);

      // Record in performance tracker
      if (this.plugin.performanceTracker) {
        this.plugin.performanceTracker.recordTrade({
          symbol: position.symbol,
          market: position.market || 'stocks',
          side: position.side,
          entry: position.entryPrice,
          exit: position.currentPrice,
          stop: position.stopLoss,
          target: position.takeProfit,
          quantity: position.quantity,
          pnl: position.pnl,
          setupType: position.setupType,
          agent: position.agent,
          entryDate: position.openedAt,
          exitDate: Date.now()
        });
      }

      // Remove from active positions
      this.activePositions.delete(positionId);

      this.plugin.emit('position-closed', {
        positionId,
        symbol: position.symbol,
        pnl: position.pnl,
        reason
      });

      return {
        success: true,
        message: 'Position closed',
        pnl: position.pnl,
        journalEntry
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Private methods

  async _monitoringLoop(brokerId, options) {
    const { enableAlerts, autoJournal, riskLimits } = options;

    // Update positions
    await this._syncPositions(brokerId);

    // Update orders
    await this._syncOrders(brokerId);

    // Update account
    await this._syncAccount(brokerId);

    // Check for filled orders
    await this._checkFilledOrders(brokerId, autoJournal);

    // Check risk alerts
    if (enableAlerts) {
      await this._checkRiskAlerts(brokerId, riskLimits);
    }

    // Update monitoring data
    const monitor = this.monitoringIntervals.get(brokerId);
    if (monitor) {
      monitor.lastUpdate = Date.now();
    }
  }

  async _syncPositions(brokerId) {
    const result = await this.plugin.mcpBrokerIntegration.getPositions(brokerId);

    if (!result.success) {
      return;
    }

    // Update active positions
    const currentPositionIds = new Set();

    for (const position of result.positions) {
      const positionId = `${brokerId}-${position.symbol}`;
      currentPositionIds.add(positionId);

      const existingPosition = this.activePositions.get(positionId);

      if (existingPosition) {
        // Update existing position
        existingPosition.currentPrice = position.currentPrice;
        existingPosition.pnl = position.pnl;
        existingPosition.pnlPercent = position.pnlPercent;
        existingPosition.lastUpdate = Date.now();
      } else {
        // New position
        this.activePositions.set(positionId, {
          id: positionId,
          brokerId,
          symbol: position.symbol,
          side: position.side,
          quantity: position.quantity,
          entryPrice: position.avgPrice,
          currentPrice: position.currentPrice,
          pnl: position.pnl,
          pnlPercent: position.pnlPercent,
          openedAt: position.openedAt || Date.now(),
          lastUpdate: Date.now()
        });

        this.plugin.emit('position-opened', {
          positionId,
          symbol: position.symbol,
          side: position.side
        });
      }
    }

    // Remove closed positions
    for (const [positionId, position] of this.activePositions.entries()) {
      if (position.brokerId === brokerId && !currentPositionIds.has(positionId)) {
        this.activePositions.delete(positionId);

        this.plugin.emit('position-closed', {
          positionId,
          symbol: position.symbol,
          pnl: position.pnl,
          reason: 'detected-closed'
        });
      }
    }
  }

  async _syncOrders(brokerId) {
    // In production, would query broker for active orders
    // For now, maintain local order tracking
  }

  async _syncAccount(brokerId) {
    const result = await this.plugin.mcpBrokerIntegration.getAccount(brokerId);

    if (result.success) {
      this.plugin.emit('account-updated', {
        brokerId,
        account: result.account
      });
    }
  }

  async _checkFilledOrders(brokerId, autoJournal) {
    // Check order statuses and create journal entries for filled orders
    const orders = this._getOrdersByBroker(brokerId);

    for (const order of orders) {
      if (order.status === 'pending' || order.status === 'submitted') {
        const status = await this.plugin.mcpBrokerIntegration.getOrderStatus(
          brokerId,
          order.id
        );

        if (status.success && status.order.status === 'filled') {
          order.status = 'filled';
          order.filledQuantity = status.order.filledQuantity;
          order.avgFillPrice = status.order.avgFillPrice;

          this.plugin.emit('order-filled', {
            orderId: order.id,
            symbol: order.symbol,
            fillPrice: status.order.avgFillPrice
          });

          // Auto-journal if enabled
          if (autoJournal && order.journalData) {
            this.addJournalEntry({
              symbol: order.symbol,
              side: order.side,
              price: status.order.avgFillPrice,
              quantity: status.order.filledQuantity,
              setupType: order.journalData.setupType,
              agent: order.journalData.agent,
              notes: order.journalData.notes
            });
          }
        }
      }
    }
  }

  async _checkRiskAlerts(brokerId, riskLimits) {
    const positions = this._getPositionsByBroker(brokerId);
    const account = await this.plugin.mcpBrokerIntegration.getAccount(brokerId);

    if (!account.success) {
      return;
    }

    const userId = 'default';
    const profile = this.plugin.userProfileManager.getProfile(userId);

    // Check portfolio heat
    const totalRisk = positions.reduce((sum, p) => {
      return sum + (p.riskAmount || 0);
    }, 0);

    const portfolioHeat = (totalRisk / account.account.balance) * 100;

    if (portfolioHeat > profile.riskManagement.maxPortfolioHeat) {
      this._createAlert({
        severity: 'high',
        type: 'portfolio-heat',
        message: `Portfolio heat ${portfolioHeat.toFixed(2)}% exceeds limit ${profile.riskManagement.maxPortfolioHeat}%`,
        brokerId,
        data: { portfolioHeat, limit: profile.riskManagement.maxPortfolioHeat }
      });
    }

    // Check individual position losses
    for (const position of positions) {
      if (position.pnlPercent < -5) {
        this._createAlert({
          severity: 'medium',
          type: 'position-loss',
          message: `${position.symbol} down ${position.pnlPercent.toFixed(2)}%`,
          brokerId,
          positionId: position.id,
          data: { symbol: position.symbol, pnl: position.pnl, pnlPercent: position.pnlPercent }
        });
      }
    }

    // Check margin
    if (account.account.margin && account.account.availableMargin) {
      const marginUsage = (account.account.margin / (account.account.margin + account.account.availableMargin)) * 100;

      if (marginUsage > 80) {
        this._createAlert({
          severity: 'high',
          type: 'margin-usage',
          message: `Margin usage ${marginUsage.toFixed(2)}% is high`,
          brokerId,
          data: { marginUsage, margin: account.account.margin, available: account.account.availableMargin }
        });
      }
    }
  }

  _createAlert(alert) {
    const alertId = this._generateId();

    const newAlert = {
      id: alertId,
      timestamp: Date.now(),
      acknowledged: false,
      ...alert
    };

    this.alerts.push(newAlert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    this.plugin.emit('alert-created', newAlert);
  }

  _getPositionsByBroker(brokerId) {
    return Array.from(this.activePositions.values())
      .filter(p => p.brokerId === brokerId);
  }

  _getOrdersByBroker(brokerId) {
    return Array.from(this.activeOrders.values())
      .filter(o => o.brokerId === brokerId);
  }

  _groupByMarket(positions) {
    const markets = {};

    for (const position of positions) {
      const market = position.market || 'unknown';
      markets[market] = (markets[market] || 0) + 1;
    }

    return markets;
  }

  _getLargestPosition(positions) {
    if (positions.length === 0) {
      return null;
    }

    return positions.reduce((largest, p) => {
      const size = Math.abs(p.pnl);
      return size > Math.abs(largest.pnl) ? p : largest;
    });
  }

  _calculateExposure(positions) {
    const exposure = {};

    for (const position of positions) {
      const value = Math.abs(position.quantity * position.currentPrice);
      exposure[position.symbol] = (exposure[position.symbol] || 0) + value;
    }

    return exposure;
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

module.exports = ExecutionMonitor;
