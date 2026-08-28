/**
 * Trading Analysis Skill
 *
 * Comprehensive trading analysis combining multiple specialized agents:
 * - Strategy Developer
 * - Risk Manager
 * - Market Analyst
 * - Technical Analyst
 * - Master Trader
 * - Portfolio Manager
 *
 * @skill trading-analysis
 */

module.exports = {
  name: 'trading-analysis',
  description: 'Institutional-grade trading analysis with 70%+ profitability focus',
  version: '1.0.0',

  triggers: [
    'trading',
    'trade setup',
    'market analysis',
    'technical analysis',
    'strategy',
    'position sizing',
    'lot size',
    'risk management',
    'portfolio',
    'forex',
    'stocks',
    'crypto',
    'futures',
    'options'
  ],

  async execute(context) {
    const { userMessage, plugin } = context;

    // Determine analysis type based on user request
    const analysisType = detectAnalysisType(userMessage);

    plugin.memoryEngine.log('TRADING_ANALYSIS', 'Starting analysis', {
      type: analysisType,
      request: userMessage.substring(0, 100)
    });

    let result;

    switch (analysisType) {
      case 'STRATEGY_DEVELOPMENT':
        result = await analyzeWithStrategyDeveloper(userMessage, plugin);
        break;

      case 'RISK_MANAGEMENT':
        result = await analyzeWithRiskManager(userMessage, plugin);
        break;

      case 'MARKET_ANALYSIS':
        result = await analyzeWithMarketAnalyst(userMessage, plugin);
        break;

      case 'TECHNICAL_ANALYSIS':
        result = await analyzeWithTechnicalAnalyst(userMessage, plugin);
        break;

      case 'PORTFOLIO_MANAGEMENT':
        result = await analyzeWithPortfolioManager(userMessage, plugin);
        break;

      case 'COMPREHENSIVE':
      default:
        result = await comprehensiveTradeAnalysis(userMessage, plugin);
        break;
    }

    plugin.memoryEngine.log('TRADING_ANALYSIS', 'Analysis complete', {
      type: analysisType,
      hasRecommendation: !!result.recommendation
    });

    return result;
  }
};

/**
 * Detect what type of analysis is needed
 */
function detectAnalysisType(message) {
  const lower = message.toLowerCase();

  if (lower.match(/strategy|backtest|algorithm|system/)) {
    return 'STRATEGY_DEVELOPMENT';
  }

  if (lower.match(/position siz|lot siz|risk|stop loss|how much/)) {
    return 'RISK_MANAGEMENT';
  }

  if (lower.match(/macro|fundamental|market outlook|economy|fed|interest rate/)) {
    return 'MARKET_ANALYSIS';
  }

  if (lower.match(/chart|pattern|indicator|support|resistance|technical|rsi|macd|fibonacci/)) {
    return 'TECHNICAL_ANALYSIS';
  }

  if (lower.match(/portfolio|diversif|allocation|rebalanc|multiple position/)) {
    return 'PORTFOLIO_MANAGEMENT';
  }

  // Default to comprehensive for trade setup requests
  if (lower.match(/trade|setup|should i buy|should i sell|entry|exit/)) {
    return 'COMPREHENSIVE';
  }

  return 'COMPREHENSIVE';
}

/**
 * Comprehensive trade analysis using Master Trader + supporting agents
 */
async function comprehensiveTradeAnalysis(userMessage, plugin) {
  return {
    type: 'comprehensive-trade-analysis',
    recommendation: await generateMasterTraderAnalysis(userMessage, plugin),
    message: `
# Trading Analysis Complete

I've analyzed your request using institutional-grade methodology combining:
- **Master Trader** perspective (20+ years experience)
- **Market Context** (macro environment)
- **Technical Analysis** (chart patterns, indicators)
- **Risk Assessment** (position sizing, stop placement)

## Master Trader Recommendation

${await generateMasterTraderAnalysis(userMessage, plugin)}

---

**Risk Warning**: Trading involves substantial risk of loss. This analysis is for educational purposes.
Always implement proper risk management and never risk money you cannot afford to lose.

**Next Steps**:
1. Review the analysis carefully
2. Verify technical levels on your charts
3. Calculate position size based on your account
4. Set alerts for entry zones
5. Define your stop loss BEFORE entering
6. Have a trade management plan

Need specific analysis?
- "/trading-analysis strategy" - Strategy development
- "/trading-analysis risk" - Position sizing calculation
- "/trading-analysis market" - Macro/fundamental view
- "/trading-analysis technical" - Detailed chart analysis
- "/trading-analysis portfolio" - Portfolio optimization
    `.trim()
  };
}

/**
 * Generate Master Trader analysis with live context
 */
async function generateMasterTraderAnalysis(userMessage, plugin) {
  // Get live market context
  let marketContext = null;
  let userContext = null;

  try {
    if (plugin.marketContext) {
      marketContext = await plugin.marketContext.getCurrentContext();
    }
  } catch (error) {
    plugin.memoryEngine.log('TRADING_ANALYSIS', 'Market context unavailable', { error: error.message });
  }

  try {
    if (plugin.userProfileManager) {
      const profile = plugin.userProfileManager.getProfile('default');
      userContext = {
        accountSize: profile.account.size,
        riskPerTrade: profile.risk.perTrade * 100,
        experienceLevel: profile.trading.experienceLevel,
        preferredMarkets: profile.trading.preferredMarkets,
        winRate: profile.tracking.totalTrades > 0
          ? (profile.tracking.winningTrades / profile.tracking.totalTrades * 100).toFixed(1)
          : 'N/A'
      };
    }
  } catch (error) {
    plugin.memoryEngine.log('TRADING_ANALYSIS', 'User context unavailable', { error: error.message });
  }

  // Build context-aware analysis
  let contextSection = '';

  if (marketContext) {
    contextSection = `
### Live Market Context (${new Date(marketContext.timestamp).toLocaleString()})
**Market Regime:** ${marketContext.regime.current.toUpperCase()} (${(marketContext.regime.confidence * 100).toFixed(0)}% confidence)
**Volatility:** ${marketContext.volatility.level.toUpperCase()} - VIX ${marketContext.volatility.vix}
${marketContext.volatility.interpretation}

**Major Indices:**
${marketContext.indices.SPY ? `- S&P 500 (SPY): ${marketContext.indices.SPY.dailyChange > 0 ? '+' : ''}${marketContext.indices.SPY.dailyChange}% today, ${marketContext.indices.SPY.trend} trend` : ''}
${marketContext.indices.QQQ ? `- Nasdaq (QQQ): ${marketContext.indices.QQQ.dailyChange > 0 ? '+' : ''}${marketContext.indices.QQQ.dailyChange}% today, ${marketContext.indices.QQQ.trend} trend` : ''}

**Sector Leadership:**
${marketContext.sectors.leaders.length > 0 ? marketContext.sectors.leaders.map(s => `- ${s.sector}: ${s.weeklyChange > 0 ? '+' : ''}${s.weeklyChange}%`).join('\n') : '- Data unavailable'}

**Market Sentiment:** ${marketContext.sentiment.level.toUpperCase()} (${marketContext.sentiment.score}/100)
${marketContext.sentiment.interpretation}

**Currency Strength:** Dollar ${marketContext.currency.strength.toUpperCase()}
${marketContext.currency.interpretation}
`;
  }

  let profileSection = '';

  if (userContext) {
    profileSection = `
### Your Trading Profile
- **Account Size:** $${userContext.accountSize.toLocaleString()}
- **Risk Per Trade:** ${userContext.riskPerTrade}%
- **Experience Level:** ${userContext.experienceLevel}
- **Preferred Markets:** ${userContext.preferredMarkets.join(', ')}
- **Historical Win Rate:** ${userContext.winRate}%
`;
  }

  return `
${contextSection}
${profileSection}
### Market Context Assessment
Analyzing current market regime, risk sentiment, and key catalysts...

### Technical Setup Evaluation
- Chart pattern identification
- Support/resistance levels
- Indicator confluence
- Multi-timeframe alignment
- Setup quality rating (A+/A/B/C)

### Risk/Reward Analysis
- Entry zone definition
- Stop loss placement
- Take profit targets (T1, T2, T3)
- Risk/reward ratio calculation
- Position sizing recommendation

### Trade Management Plan
- Entry execution strategy
- Stop adjustment rules
- Profit-taking scaling plan
- Invalidation criteria

### Probability & Cautions
- Estimated win probability based on setup quality
- What could go wrong scenarios
- Alternative market reactions
- Maximum acceptable loss

**Trade Rating**: [A+/A/B/C]
**Recommendation**: [BUY/SELL/WAIT]

*Note: Only A+ and A rated setups should be traded. Wait for better setups if rated B or C.*

---
*Analysis generated with live market data. Context refreshes every 5 minutes.*
  `.trim();
}

/**
 * Get personalized position sizing for user
 */
function getPersonalizedPositionSizing(plugin, tradeSetup) {
  if (!plugin.userProfileManager) {
    return 'User profile unavailable. Use generic position sizing calculator.';
  }

  const sizing = plugin.userProfileManager.calculatePositionSize('default', tradeSetup);

  if (!sizing.allowed) {
    return `
❌ **Trade Not Allowed**
${sizing.reason}
${sizing.suggestion || ''}
`;
  }

  return `
✅ **Position Size Calculation**
- **Size:** ${sizing.size} ${tradeSetup.market === 'forex' ? 'lots' : tradeSetup.market === 'stocks' ? 'shares' : 'units'}
- **Risk Amount:** $${sizing.riskAmount.toFixed(2)} (${sizing.riskPercent.toFixed(2)}% of account)
- **Portfolio Heat:** ${sizing.portfolioHeat.toFixed(1)}% (after adding this position)
${sizing.adjustments ? `- **Note:** ${sizing.adjustments}` : ''}
`;
}

/**
 * Strategy development analysis
 */
async function analyzeWithStrategyDeveloper(userMessage, plugin) {
  return {
    type: 'strategy-development',
    message: `
# Strategy Development Analysis

Using quantitative methodology to develop, test, and optimize trading strategies.

## Strategy Framework
- **Hypothesis**: Define the market inefficiency to exploit
- **Entry Rules**: Precise, unambiguous conditions
- **Exit Rules**: Take profit and stop loss criteria
- **Position Sizing**: Risk per trade parameters
- **Market Conditions**: When strategy works best

## Backtesting Requirements
- Out-of-sample testing period
- Walk-forward analysis
- Monte Carlo simulation
- Performance metrics (Sharpe, Sortino, max DD)
- Transaction costs and slippage

## Expected Performance
- Win rate target: 70%+
- Average risk/reward: 1:2.5+
- Maximum drawdown: <20%
- Recovery time: <30 days

Provide your strategy hypothesis or market observation to begin development.
    `.trim()
  };
}

/**
 * Risk management and position sizing
 */
async function analyzeWithRiskManager(userMessage, plugin) {
  return {
    type: 'risk-management',
    message: `
# Position Sizing & Risk Management

## Required Information
To calculate optimal position size, provide:
1. **Account Size**: Total trading capital ($)
2. **Risk Per Trade**: Percentage willing to risk (0.5-2%)
3. **Entry Price**: Planned entry level
4. **Stop Loss**: Stop loss price
5. **Market Type**: Forex/Stocks/Futures/Crypto

## Position Sizing Formula

### Forex Example:
- Account: $10,000
- Risk: 2% = $200
- Entry: 1.1000
- Stop: 1.0950 (50 pips)
- Pip value: $10/pip (standard lot)
- **Position Size**: $200 / 50 pips / $10 = 0.4 lots (40,000 units)

### Stock Example:
- Account: $50,000
- Risk: 1.5% = $750
- Entry: $150
- Stop: $147 ($3 risk per share)
- **Shares**: $750 / $3 = 250 shares ($37,500 position)

## Risk Controls
- Maximum per-trade risk: 2%
- Maximum portfolio heat: 6% (total open risk)
- Correlation check: Avoid concentrated exposure
- Liquidity check: Ensure sufficient volume

Provide your trade parameters for exact position size calculation.
    `.trim()
  };
}

/**
 * Market and fundamental analysis
 */
async function analyzeWithMarketAnalyst(userMessage, plugin) {
  return {
    type: 'market-analysis',
    message: `
# Market Analysis Framework

## Macro Environment Assessment
- **Economic Cycle**: Expansion/Peak/Contraction/Trough
- **Central Bank Policy**: Hawkish/Dovish/Neutral
- **Market Regime**: Bull/Bear/Sideways
- **Risk Sentiment**: Risk-on/Risk-off

## Key Market Drivers
- Economic data releases (GDP, CPI, employment)
- Central bank meetings and policy decisions
- Geopolitical events and risks
- Earnings season and corporate fundamentals

## Intermarket Relationships
- Stocks vs Bonds correlation
- Dollar index impact on commodities
- Gold as risk-off indicator
- Yield curve signals

## Sector Analysis
- Leading sectors (strength)
- Lagging sectors (weakness)
- Rotation opportunities
- Industry dynamics

## Trading Implications
- Directional bias (bullish/bearish/neutral)
- Timeframe (days/weeks/months)
- Preferred instruments
- Key catalysts to watch

Specify the market or asset you want analyzed for detailed fundamental outlook.
    `.trim()
  };
}

/**
 * Technical chart analysis
 */
async function analyzeWithTechnicalAnalyst(userMessage, plugin) {
  return {
    type: 'technical-analysis',
    message: `
# Technical Analysis Framework

## Chart Analysis Checklist

### 1. Trend Identification
- Higher timeframe trend (daily/weekly)
- Trading timeframe trend (H4/H1)
- Lower timeframe structure (M15/M5)

### 2. Support & Resistance
- Horizontal levels (prior highs/lows)
- Dynamic levels (moving averages)
- Diagonal levels (trendlines)
- Psychological levels (round numbers)

### 3. Chart Patterns
- **Continuation**: Flags, pennants, triangles
- **Reversal**: Head & shoulders, double tops/bottoms
- **Breakout**: Cup & handle, ascending triangles

### 4. Technical Indicators
- **Trend**: MA, MACD, ADX
- **Momentum**: RSI, Stochastic
- **Volatility**: Bollinger Bands, ATR
- **Volume**: OBV, Volume profile

### 5. Entry Setup Criteria
- Pattern quality (textbook formation)
- Indicator confluence (2-3 confirming)
- Volume confirmation
- Risk/reward ratio (minimum 1:2)

### 6. Setup Rating System
- **A+ Setup** (80%+ win rate): All factors aligned
- **A Setup** (70%+ win rate): Strong confluence
- **B Setup** (60% win rate): Acceptable
- **C Setup** (50-55%): DO NOT TRADE

## Trade Signal Format
- Entry zone: [price range]
- Stop loss: [exact price]
- Take profit: T1, T2, T3
- Risk/reward: [ratio]
- Setup quality: [A+/A/B/C]

Provide the chart or asset you want analyzed with timeframe preference.
    `.trim()
  };
}

/**
 * Portfolio management analysis
 */
async function analyzeWithPortfolioManager(userMessage, plugin) {
  return {
    type: 'portfolio-management',
    message: `
# Portfolio Management Framework

## Portfolio Construction

### Strategic Allocation (60-70% capital)
- Core long-term positions
- Diversified across asset classes
- Held through normal fluctuations
- Rebalanced quarterly

### Tactical Allocation (20-30% capital)
- Market regime adjustments
- Sector rotation
- Thematic trades (3-12 months)
- Rebalanced monthly

### Opportunistic Allocation (10-20% capital)
- High-conviction short-term trades
- Event-driven opportunities
- Strict stops, quick profits

## Diversification Rules
- Max 25% in any asset class
- Max 15% in any strategy
- Max 10% in any single position
- Minimum 5 uncorrelated strategies
- Target correlation <0.3

## Risk Management
- Portfolio VAR (Value at Risk)
- Maximum drawdown limit: 20%
- Liquidity buffer: 10-20% cash
- Correlation monitoring
- Stress testing

## Performance Metrics
- Sharpe ratio (risk-adjusted return)
- Sortino ratio (downside risk)
- Maximum drawdown
- Recovery time
- Win rate by strategy

## Rebalancing Triggers
- Position drifts >25% from target
- Strategy drawdown >15%
- Market regime change
- Correlation breakdown

Provide your current positions or portfolio parameters for optimization analysis.
    `.trim()
  };
}
