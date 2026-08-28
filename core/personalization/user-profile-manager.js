/**
 * User Profile Manager
 *
 * Manages user trading preferences, risk tolerance, and account settings.
 * Enables personalized trading recommendations tailored to individual users.
 */

class UserProfileManager {
  constructor(plugin) {
    this.plugin = plugin;
    this.profiles = new Map();
    this.defaultProfile = this.createDefaultProfile();

    this.plugin.memoryEngine.log('USER_PROFILE', 'Initialized', {
      defaultProfile: 'created'
    });
  }

  /**
   * Create default profile for new users
   */
  createDefaultProfile() {
    return {
      userId: 'default',

      // Account Information
      account: {
        size: 10000, // $10,000 default
        currency: 'USD',
        broker: null, // To be set by user
        accountType: 'margin' // 'cash', 'margin', 'portfolio-margin'
      },

      // Risk Management
      risk: {
        perTrade: 0.01, // 1% per trade (conservative)
        maxPortfolioHeat: 0.05, // 5% total exposure
        maxDrawdown: 0.20, // 20% maximum drawdown before stop trading
        dailyLossLimit: 0.03, // 3% daily loss limit
        weeklyLossLimit: 0.10, // 10% weekly loss limit
        recoveryMode: true // Reduce size after losses
      },

      // Trading Preferences
      trading: {
        experienceLevel: 'intermediate', // 'beginner', 'intermediate', 'advanced', 'professional'
        style: 'swing', // 'scalping', 'day', 'swing', 'position'
        preferredMarkets: ['stocks', 'forex'], // 'stocks', 'forex', 'crypto', 'futures', 'options'
        preferredTimeframes: ['H4', 'D1'], // M5, M15, H1, H4, D1, W1
        tradingHours: 'market-hours', // 'market-hours', '24/7', 'custom'
        customHours: null, // { start: '09:30', end: '16:00', timezone: 'America/New_York' }
        maxConcurrentPositions: 5,
        minRiskReward: 2.0 // Minimum 1:2 R:R
      },

      // Strategy Preferences
      strategy: {
        allowedSetupTypes: ['A+', 'A'], // Only trade A+ and A setups
        preferredPatterns: [], // Empty = all patterns allowed
        avoidPatterns: ['news-trading'], // Patterns to avoid
        requireConfluence: 3, // Minimum confluence factors (indicators agreeing)
        allowCounterTrend: false, // Trade against main trend
        requireVolumeConfirmation: true
      },

      // Personal Constraints
      constraints: {
        noTradeDays: [], // ['2024-12-25', '2025-01-01'] - holidays
        avoidEarnings: true, // Don't trade around earnings
        avoidFOMC: true, // Avoid Fed meetings
        avoidHighImpactNews: true,
        maxNewsExposure: 0 // Max positions during major news (0 = none)
      },

      // Psychological Profile
      psychology: {
        emotionalState: 'neutral', // 'confident', 'neutral', 'anxious', 'revenge'
        consecutiveLosses: 0,
        consecutiveWins: 0,
        pauseAfterLosses: 3, // Pause trading after N consecutive losses
        reduceAfterLosses: true, // Reduce position size after losses
        maxLossesPerDay: 3 // Stop trading after N losses in one day
      },

      // Notification Preferences
      notifications: {
        entryAlerts: true,
        stopLossWarnings: true,
        takeProfitAlerts: true,
        dailySummary: true,
        weeklyReport: true,
        riskWarnings: true
      },

      // Performance Tracking
      tracking: {
        startDate: Date.now(),
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        currentDrawdown: 0,
        peakEquity: 10000,
        currentEquity: 10000
      },

      // Metadata
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        timezone: 'America/New_York',
        version: '1.0.0'
      }
    };
  }

  /**
   * Get or create user profile
   */
  getProfile(userId = 'default') {
    if (!this.profiles.has(userId)) {
      const profile = this.createDefaultProfile();
      profile.userId = userId;
      this.profiles.set(userId, profile);

      this.plugin.memoryEngine.log('USER_PROFILE', 'Profile created', {
        userId,
        accountSize: profile.account.size,
        riskPerTrade: profile.risk.perTrade
      });
    }

    return this.profiles.get(userId);
  }

  /**
   * Update user profile
   */
  updateProfile(userId, updates) {
    const profile = this.getProfile(userId);

    // Deep merge updates
    this.deepMerge(profile, updates);

    profile.metadata.updatedAt = Date.now();

    this.plugin.memoryEngine.log('USER_PROFILE', 'Profile updated', {
      userId,
      updates: Object.keys(updates)
    });

    return profile;
  }

  /**
   * Calculate position size based on user profile
   */
  calculatePositionSize(userId, tradeSetup) {
    const profile = this.getProfile(userId);
    const { account, risk, psychology } = profile;

    // Base risk amount
    let riskAmount = account.size * risk.perTrade;

    // Apply psychological adjustments
    if (psychology.consecutiveLosses > 0 && risk.recoveryMode) {
      // Reduce size after losses (Kelly Criterion style)
      const reduction = Math.min(0.5, psychology.consecutiveLosses * 0.1);
      riskAmount *= (1 - reduction);
    }

    // Check if max losses per day reached
    if (psychology.consecutiveLosses >= psychology.maxLossesPerDay) {
      return {
        allowed: false,
        reason: `Daily loss limit reached (${psychology.maxLossesPerDay} losses). Take a break.`,
        size: 0
      };
    }

    // Calculate position size based on stop distance
    const { entry, stop } = tradeSetup;
    const stopDistance = Math.abs(entry - stop);
    const stopPercent = stopDistance / entry;

    let positionSize;

    if (tradeSetup.market === 'forex') {
      // Forex: calculate lots
      const pipValue = 10; // Standard lot pip value for most pairs
      const pipsAtRisk = stopDistance * 10000; // Convert to pips
      positionSize = riskAmount / (pipsAtRisk * pipValue);
    } else if (tradeSetup.market === 'stocks') {
      // Stocks: calculate shares
      positionSize = Math.floor(riskAmount / stopDistance);
    } else if (tradeSetup.market === 'crypto') {
      // Crypto: calculate units
      positionSize = riskAmount / stopDistance;
    } else {
      // Generic: percentage of account
      positionSize = riskAmount / (entry * stopPercent);
    }

    // Check portfolio heat
    const currentHeat = this.calculatePortfolioHeat(userId);
    const newHeat = currentHeat + risk.perTrade;

    if (newHeat > risk.maxPortfolioHeat) {
      return {
        allowed: false,
        reason: `Portfolio heat limit exceeded. Current: ${(currentHeat * 100).toFixed(1)}%, New: ${(newHeat * 100).toFixed(1)}%, Max: ${(risk.maxPortfolioHeat * 100).toFixed(1)}%`,
        size: 0,
        suggestion: 'Close existing positions or wait for exits'
      };
    }

    return {
      allowed: true,
      size: Math.round(positionSize * 100) / 100,
      riskAmount,
      riskPercent: risk.perTrade * 100,
      portfolioHeat: newHeat * 100,
      adjustments: psychology.consecutiveLosses > 0 ? 'Size reduced due to recent losses' : null
    };
  }

  /**
   * Check if trade is allowed based on user constraints
   */
  isTradeAllowed(userId, tradeSetup) {
    const profile = this.getProfile(userId);
    const { trading, strategy, constraints, psychology } = profile;

    const checks = [];

    // 1. Experience level check
    if (trading.experienceLevel === 'beginner' && tradeSetup.complexity === 'advanced') {
      checks.push({
        passed: false,
        reason: 'Setup complexity exceeds experience level'
      });
    }

    // 2. Market preference check
    if (!trading.preferredMarkets.includes(tradeSetup.market)) {
      checks.push({
        passed: false,
        reason: `${tradeSetup.market} not in preferred markets: ${trading.preferredMarkets.join(', ')}`
      });
    }

    // 3. Setup quality check
    if (!strategy.allowedSetupTypes.includes(tradeSetup.quality)) {
      checks.push({
        passed: false,
        reason: `Setup quality ${tradeSetup.quality} below minimum (${strategy.allowedSetupTypes.join(', ')})`
      });
    }

    // 4. Risk/reward check
    if (tradeSetup.riskReward < trading.minRiskReward) {
      checks.push({
        passed: false,
        reason: `R:R ${tradeSetup.riskReward} below minimum ${trading.minRiskReward}`
      });
    }

    // 5. Pattern avoidance check
    if (strategy.avoidPatterns.some(pattern => tradeSetup.pattern?.includes(pattern))) {
      checks.push({
        passed: false,
        reason: `Pattern matches avoid list: ${strategy.avoidPatterns.join(', ')}`
      });
    }

    // 6. News event check
    if (constraints.avoidHighImpactNews && tradeSetup.nearNews) {
      checks.push({
        passed: false,
        reason: 'High-impact news event within trading window'
      });
    }

    // 7. Psychological state check
    if (psychology.emotionalState === 'revenge') {
      checks.push({
        passed: false,
        reason: 'Emotional state flagged: Take a break before trading'
      });
    }

    // 8. Consecutive loss check
    if (psychology.consecutiveLosses >= psychology.pauseAfterLosses) {
      checks.push({
        passed: false,
        reason: `Pause triggered: ${psychology.consecutiveLosses} consecutive losses (limit: ${psychology.pauseAfterLosses})`
      });
    }

    // 9. Confluence check
    if (tradeSetup.confluenceFactors < strategy.requireConfluence) {
      checks.push({
        passed: false,
        reason: `Insufficient confluence: ${tradeSetup.confluenceFactors} factors (requires ${strategy.requireConfluence})`
      });
    }

    // 10. Counter-trend check
    if (!strategy.allowCounterTrend && tradeSetup.isCounterTrend) {
      checks.push({
        passed: false,
        reason: 'Counter-trend trades not allowed in profile'
      });
    }

    const failedChecks = checks.filter(c => !c.passed);
    const allPassed = failedChecks.length === 0;

    return {
      allowed: allPassed,
      checks: allPassed ? ['All checks passed'] : failedChecks.map(c => c.reason),
      summary: allPassed ? 'Trade allowed' : `Trade blocked: ${failedChecks.length} constraint(s) violated`
    };
  }

  /**
   * Calculate current portfolio heat (total % at risk)
   */
  calculatePortfolioHeat(userId) {
    const profile = this.getProfile(userId);
    // This would integrate with execution monitor to get live positions
    // For now, return 0 (no open positions)
    return 0;
  }

  /**
   * Record trade result and update psychology
   */
  recordTradeResult(userId, result) {
    const profile = this.getProfile(userId);
    const { tracking, psychology } = profile;

    tracking.totalTrades++;

    if (result.pnl > 0) {
      tracking.winningTrades++;
      psychology.consecutiveWins++;
      psychology.consecutiveLosses = 0;
      psychology.emotionalState = 'confident';
    } else {
      tracking.losingTrades++;
      psychology.consecutiveLosses++;
      psychology.consecutiveWins = 0;

      // Update emotional state based on losses
      if (psychology.consecutiveLosses >= 2) {
        psychology.emotionalState = 'anxious';
      }
      if (psychology.consecutiveLosses >= psychology.pauseAfterLosses) {
        psychology.emotionalState = 'revenge'; // Flag for pause
      }
    }

    // Update equity and drawdown
    tracking.currentEquity += result.pnl;
    if (tracking.currentEquity > tracking.peakEquity) {
      tracking.peakEquity = tracking.currentEquity;
      tracking.currentDrawdown = 0;
    } else {
      tracking.currentDrawdown = (tracking.peakEquity - tracking.currentEquity) / tracking.peakEquity;
    }

    profile.metadata.updatedAt = Date.now();

    this.plugin.memoryEngine.log('USER_PROFILE', 'Trade recorded', {
      userId,
      result: result.pnl > 0 ? 'win' : 'loss',
      consecutiveLosses: psychology.consecutiveLosses,
      winRate: (tracking.winningTrades / tracking.totalTrades * 100).toFixed(1),
      drawdown: (tracking.currentDrawdown * 100).toFixed(1)
    });

    // Check if drawdown limit exceeded
    if (tracking.currentDrawdown > profile.risk.maxDrawdown) {
      this.plugin.memoryEngine.log('USER_PROFILE', 'DRAWDOWN LIMIT EXCEEDED', {
        userId,
        currentDrawdown: tracking.currentDrawdown,
        maxDrawdown: profile.risk.maxDrawdown,
        action: 'STOP TRADING IMMEDIATELY'
      });

      psychology.emotionalState = 'pause-required';
    }

    return profile;
  }

  /**
   * Get personalized recommendation context
   */
  getRecommendationContext(userId, tradeSetup) {
    const profile = this.getProfile(userId);
    const positionSize = this.calculatePositionSize(userId, tradeSetup);
    const tradeAllowed = this.isTradeAllowed(userId, tradeSetup);

    return {
      profile: {
        accountSize: profile.account.size,
        riskPerTrade: profile.risk.perTrade,
        experienceLevel: profile.trading.experienceLevel,
        winRate: profile.tracking.totalTrades > 0
          ? (profile.tracking.winningTrades / profile.tracking.totalTrades * 100).toFixed(1)
          : 'N/A'
      },
      positionSize,
      tradeAllowed,
      warnings: this.generateWarnings(profile, tradeSetup),
      suggestions: this.generateSuggestions(profile, tradeSetup)
    };
  }

  /**
   * Generate warnings based on profile state
   */
  generateWarnings(profile, tradeSetup) {
    const warnings = [];

    if (profile.psychology.consecutiveLosses >= 2) {
      warnings.push(`⚠️ You have ${profile.psychology.consecutiveLosses} consecutive losses. Consider taking a break.`);
    }

    if (profile.tracking.currentDrawdown > 0.10) {
      warnings.push(`⚠️ Current drawdown: ${(profile.tracking.currentDrawdown * 100).toFixed(1)}%. Trading with caution.`);
    }

    if (profile.psychology.emotionalState === 'anxious') {
      warnings.push(`⚠️ Emotional state: ${profile.psychology.emotionalState}. Reduce position size or skip.`);
    }

    if (tradeSetup.quality === 'B') {
      warnings.push(`⚠️ Setup quality is B (60% win rate). Consider waiting for A or A+ setup.`);
    }

    return warnings;
  }

  /**
   * Generate personalized suggestions
   */
  generateSuggestions(profile, tradeSetup) {
    const suggestions = [];

    if (profile.psychology.consecutiveWins >= 3) {
      suggestions.push(`✅ You're on a ${profile.psychology.consecutiveWins}-win streak. Stay disciplined, don't overtrade.`);
    }

    if (profile.tracking.currentDrawdown === 0) {
      suggestions.push(`✅ At peak equity. Good time to take calculated risks.`);
    }

    if (tradeSetup.quality === 'A+') {
      suggestions.push(`✅ A+ setup (80%+ win rate). High-probability trade.`);
    }

    return suggestions;
  }

  /**
   * Export profile for backup
   */
  exportProfile(userId) {
    return JSON.stringify(this.getProfile(userId), null, 2);
  }

  /**
   * Import profile from backup
   */
  importProfile(userId, profileJson) {
    try {
      const profile = JSON.parse(profileJson);
      profile.userId = userId;
      profile.metadata.updatedAt = Date.now();
      this.profiles.set(userId, profile);

      this.plugin.memoryEngine.log('USER_PROFILE', 'Profile imported', { userId });
      return { success: true, profile };
    } catch (error) {
      this.plugin.memoryEngine.log('USER_PROFILE', 'Import failed', {
        userId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset psychological state (after break)
   */
  resetPsychology(userId) {
    const profile = this.getProfile(userId);
    profile.psychology.consecutiveLosses = 0;
    profile.psychology.consecutiveWins = 0;
    profile.psychology.emotionalState = 'neutral';
    profile.metadata.updatedAt = Date.now();

    this.plugin.memoryEngine.log('USER_PROFILE', 'Psychology reset', { userId });
    return profile;
  }

  /**
   * Deep merge helper
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], this.deepMerge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }

  /**
   * List all profiles
   */
  listProfiles() {
    return Array.from(this.profiles.keys());
  }

  /**
   * Delete profile
   */
  deleteProfile(userId) {
    if (userId === 'default') {
      this.plugin.memoryEngine.log('USER_PROFILE', 'Cannot delete default profile');
      return false;
    }

    const deleted = this.profiles.delete(userId);
    if (deleted) {
      this.plugin.memoryEngine.log('USER_PROFILE', 'Profile deleted', { userId });
    }
    return deleted;
  }
}

module.exports = UserProfileManager;
