# PowerSkills Memory Orchestrator v3.5.0

**Advanced AI plugin with persistent memory, sub-agent orchestration, and institutional-grade trading intelligence**

[![Version](https://img.shields.io/badge/version-3.5.0-blue)](https://github.com/vyshvs/Powerskills-orchestrator)
[![Tests](https://img.shields.io/badge/tests-22%2F22%20passing-brightgreen)](test/test-suite.js)
[![Security](https://img.shields.io/badge/security-hardened-green)](SECURITY_AUDIT.md)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## 🎯 Overview

PowerSkills Memory Orchestrator is a comprehensive AI plugin that combines:

- **Persistent Memory System** — Write, read, search, and manage cross-session memory
- **Sub-Agent Orchestration** — Parallel, sequential, and pipeline execution with 53 specialized agent templates
- **PowerSkills Framework** — 7-gate orchestration, 43 skills, 10 commands, automatic verification loops
- **Trading Intelligence** — 6 institutional-grade trading agents with 20+ years simulated experience
- **Market Data Feeds** — Real-time quotes, historical data, news, and technical indicators (100% free sources)
- **Backtesting Engine** — Strategy validation with walk-forward analysis and Monte Carlo simulation
- **Broker Integration** — 14+ broker connections (stocks, forex, crypto, options, futures)
- **Live Execution Monitor** — Real-time P&L tracking, risk alerts, and trade journaling

---

## 🚀 Key Features

### Core Capabilities
- ✅ **Persistent Memory** with session management and event system
- ✅ **53 Agent Templates** (code-reviewer, deep-researcher, architect, debugger, trading agents)
- ✅ **43 Skills** across engineering, research, architecture, frontend, and trading
- ✅ **10 Commands** (/code-review, /deep-research, /debug, /architecture, /memory-*, /status)
- ✅ **7-Gate Orchestration** (preprocessing → routing → alignment → planning → dispatch → execution → verification → completion)
- ✅ **Multi-Platform Support** (OpenAI, Claude, Antigravity compatible)
- ✅ **Auto-Update System** (checks GitHub on startup, applies updates immediately)
- ✅ **Zero Dependencies** (pure Node.js, no external packages)

### Trading System (v3.1.0 - v3.5.0)

#### Week 1: Foundation
- ✅ **Market Context Provider** — Bull/bear/sideways detection, VIX proxy, sector rotation, currency strength
- ✅ **User Profile Manager** — Account-aware position sizing, risk management (1-2% per trade), psychology tracking

#### Week 2: Intelligence
- ✅ **Multi-Agent Coordinator** — Parallel/sequential/debate modes with 6 trading agents
- ✅ **Performance Tracker** — Win rates, profit factor, Sharpe/Sortino ratios, automated recommendations

#### Week 3: Infrastructure
- ✅ **Market Data Feed** — Real-time quotes (Yahoo Finance, CoinGecko), historical OHLCV, news with sentiment, technical indicators (SMA, EMA, RSI, MACD)
- ✅ **Backtesting Engine** — Strategy validation, walk-forward analysis, Monte Carlo simulation (1000 iterations), commission/slippage modeling

#### Week 4: Execution
- ✅ **MCP Broker Integration** — 14+ brokers (Interactive Brokers, Alpaca, Binance, OANDA, TD Ameritrade, etc.)
- ✅ **Execution Monitor** — Real-time position tracking, live P&L updates, risk alerts, trade journal automation

**Total:** 5,487 lines of institutional-grade trading intelligence

---

## 📦 Installation

### As Claude Code Plugin

1. **Install in Claude Code:**
   ```bash
   # Clone or download the repo
   git clone https://github.com/vyshvs/Powerskills-orchestrator.git
   
   # Open Claude Code and install the plugin from the local directory
   ```

2. **Verify installation:**
   ```bash
   cd Powerskills-orchestrator
   npm test
   npm run validate
   ```

### As Node.js Package

```bash
npm install powerskills-memory-orchestrator
```

---

## 🎯 Quick Start

### Basic Usage

```javascript
const PowerSkillsPlugin = require('powerskills-memory-orchestrator');

// Initialize plugin
const plugin = new PowerSkillsPlugin({
  autoUpdate: true,  // Auto-update on startup
  memory: {
    persistToDisk: true,
    sessionTimeout: 3600000
  }
});

// Wait for initialization
await plugin.initPromise;

// Write to memory
await plugin.writeMemory('user:preferences', {
  theme: 'dark',
  language: 'en'
}, {
  tags: ['user', 'settings'],
  type: 'config'
});

// Read from memory
const prefs = await plugin.readMemory('user:preferences');

// Search memory
const results = await plugin.searchMemory('theme', {
  tags: ['settings']
});
```

### PowerSkills Framework

```javascript
// Process request through 7-gate orchestration
const result = await plugin.processRequest('Build a React dashboard with charts');

// Result includes plan ready for approval
console.log(result.plan);
// {
//   phases: [...],
//   skills: ['frontend-patterns', 'code-review'],
//   estimatedTokens: 45000
// }

// Execute approved plan
const execution = await plugin.executeApprovedPlan(result);
```

### Trading System

```javascript
// Get market context
const context = await plugin.marketContext.getCurrentContext();
// { regime: 'bull', volatility: 'low', indices: {...}, sectors: {...} }

// Get real-time quote
const quote = await plugin.marketDataFeed.getQuote('AAPL', 'stocks');
// { symbol: 'AAPL', last: 150.25, change: 2.3, changePercent: 1.55, ... }

// Multi-agent analysis
const analysis = await plugin.multiAgentCoordinator.collaborate({
  request: 'Should I buy AAPL at $150.25?',
  agents: ['market-analyst', 'technical-analyst', 'risk-manager', 'master-trader'],
  mode: 'parallel-then-synthesize'
});
// { recommendation: 'BUY', confidence: 0.85, reasoning: '...', setupQuality: 'A+' }

// Calculate position size
const sizing = plugin.userProfileManager.calculatePositionSize('default', {
  market: 'stocks',
  entry: 150.25,
  stop: 147.50,
  quality: 'A+',
  riskReward: 2.5
});
// { allowed: true, size: 72, riskAmount: 198, portfolioHeat: 5.5 }

// Backtest strategy
const backtest = await plugin.backtestingEngine.runBacktest({
  strategy: goldenCrossStrategy,
  symbol: 'AAPL',
  market: 'stocks',
  startDate: oneYearAgo,
  endDate: now,
  initialCapital: 10000
});
// { winRate: 68.1, profitFactor: 2.19, sharpeRatio: 1.87, maxDrawdown: 12.4 }

// Connect to broker
await plugin.mcpBrokerIntegration.connect('alpaca', {
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_API_SECRET
});

// Place order
await plugin.mcpBrokerIntegration.placeOrder('alpaca', {
  symbol: 'AAPL',
  side: 'buy',
  type: 'limit',
  quantity: 72,
  price: 150.25
});

// Start live monitoring
await plugin.executionMonitor.startMonitoring('alpaca', {
  interval: 5000,
  enableAlerts: true,
  autoJournal: true
});

// Get portfolio summary
const portfolio = await plugin.executionMonitor.getPortfolioSummary();
// { totalBalance: 10000, totalPnl: 175, positions: {...}, risk: {...} }
```

---

## 📚 API Reference

### Memory Operations

#### `writeMemory(key, value, options)`
Store data in persistent memory.

```javascript
await plugin.writeMemory('session:state', { step: 3 }, {
  tags: ['session', 'workflow'],
  type: 'state',
  metadata: { userId: 'user123' }
});
```

#### `readMemory(key, options)`
Retrieve data from memory.

```javascript
const data = await plugin.readMemory('session:state', {
  includeMetadata: true
});
```

#### `searchMemory(query, options)`
Search memory with regex patterns.

```javascript
const results = await plugin.searchMemory('session:', {
  tags: ['workflow'],
  limit: 10
});
```

#### `deleteMemory(key)`
Remove data from memory.

```javascript
await plugin.deleteMemory('session:state');
```

#### `clearMemory(filter)`
Clear memory with optional filter.

```javascript
await plugin.clearMemory({
  tags: ['temporary'],
  olderThan: Date.now() - 3600000
});
```

#### `getMemoryStats()`
Get memory usage statistics.

```javascript
const stats = await plugin.getMemoryStats();
// { totalEntries: 42, totalSize: 15360, oldestEntry: ..., newestEntry: ... }
```

---

### Agent Operations

#### `createAgent(config)`
Create a new sub-agent from available templates.

```javascript
const agentId = await plugin.createAgent({
  name: 'DataProcessor',
  type: 'worker',
  platform: 'claude'
});
```

**Available Agent Templates (53):**
- Core: `code-reviewer`, `deep-researcher`, `architect`, `frontend-designer`, `debugger`, `memory-writer`, `planner`, `implementer`
- Trading: `strategy-developer`, `risk-manager`, `market-analyst`, `technical-analyst`, `master-trader`, `portfolio-manager`
- Specialized: `agent-introspection-debugging`, `api-design`, `security-review`, `tdd-workflow`, `mcp-server-patterns`, and 38 more

#### `executeTask(agentId, task)`
Execute a task with an agent.

```javascript
const result = await plugin.executeTask(agentId, {
  description: 'Analyze data',
  data: { input: 'data' },
  platform: 'claude'
});
```

#### `executeParallel(tasks, options)`
Execute multiple tasks concurrently.

```javascript
const results = await plugin.executeParallel([
  { agentId: 'agent1', task: {...} },
  { agentId: 'agent2', task: {...} }
], { maxConcurrent: 5 });
```

#### `executeSequential(tasks, options)`
Execute tasks in sequence (each sees previous results).

```javascript
const results = await plugin.executeSequential([
  { agentId: 'agent1', task: {...} },
  { agentId: 'agent2', task: {...} }
]);
```

#### `executePipeline(stages, data)`
Execute pipeline workflow where data flows through stages.

```javascript
const result = await plugin.executePipeline([
  { name: 'Extract', description: 'Extract data' },
  { name: 'Transform', description: 'Transform data' },
  { name: 'Load', description: 'Load data' }
], initialData);
```

#### `getAgentStatus(agentId)`
Get agent status.

```javascript
const status = await plugin.getAgentStatus(agentId);
// { id: 'agent1', status: 'active', tasksCompleted: 5, uptime: 3600000 }
```

#### `getAllAgents()`
List all active agents.

```javascript
const agents = await plugin.getAllAgents();
```

#### `terminateAgent(agentId)`
Terminate an agent.

```javascript
await plugin.terminateAgent(agentId);
```

#### `getExecutionHistory(filter)`
Get agent execution history.

```javascript
const history = await plugin.getExecutionHistory({
  agentId: 'agent1',
  limit: 10
});
```

---

### PowerSkills Operations

#### `processRequest(userMessage)`
Process a user request through the 7-gate orchestration system.

```javascript
const result = await plugin.processRequest('Build a REST API with authentication');
// Returns plan for approval (gates 0-3)
```

#### `executeApprovedPlan(plan)`
Execute an approved plan (gates 4-7).

```javascript
const execution = await plugin.executeApprovedPlan(result);
// { status: 'COMPLETE', success: true, outputs: [...], gates: {...} }
```

#### `executeSkill(skillName, context)`
Execute a specific skill directly.

```javascript
const result = await plugin.executeSkill('deep-research', {
  topic: 'Quantum computing applications'
});
```

**Available Skills (43):**

- **Engineering (28):** code-review, systematic-debugging, frontend-patterns, api-design, backend-patterns, security-review, tdd-workflow, e2e-testing, and 20 more
- **Research (10):** deep-research, article-writing, market-research, exa-search, strategic-compact, and 5 more  
- **Architecture (3):** architecture-design, brand-discovery, investor-outreach
- **Frontend (1):** fal-ai-media
- **Trading (1):** trading-analysis

#### `getSkillRecommendations(userMessage)`
Get recommended skills for a task.

```javascript
const skills = await plugin.getSkillRecommendations('Debug the login flow');
// ['systematic-debugging', 'code-review', 'security-review']
```

#### `listAvailableSkills()`
List all available skills.

```javascript
const skills = plugin.listAvailableSkills();
// [{ name: 'code-review', description: '...', category: 'engineering', triggers: [...] }, ...]
```

#### `listAvailableCommands()`
List all slash commands.

```javascript
const commands = plugin.listAvailableCommands();
// ['/code-review', '/deep-research', '/debug', '/architecture', '/frontend', 
//  '/memory-read', '/memory-write', '/memory-search', '/status', '/help']
```

#### `listAgentTemplates()`
List all agent templates.

```javascript
const templates = plugin.listAgentTemplates();
// ['code-reviewer', 'deep-researcher', 'architect', 'strategy-developer', ...]
```

#### `getTokenBudgetStatus()`
Get token budget status.

```javascript
const budget = plugin.getTokenBudgetStatus();
// { total: 200000, used: 45000, remaining: 155000, phases: [...], warnings: [...] }
```

---

### Trading Operations

#### Market Context

##### `getCurrentContext()`
Get current market context.

```javascript
const context = await plugin.marketContext.getCurrentContext();
// {
//   regime: 'bull',          // bull/bear/sideways
//   volatility: 'low',       // low/medium/high
//   indices: { SPY: {...}, QQQ: {...}, DIA: {...} },
//   sectors: { technology: 2.5, healthcare: 1.8, ... },
//   currency: { DXY: 103.5, trend: 'neutral' },
//   sentiment: 'bullish',
//   timestamp: 1724832000000
// }
```

##### `getMarketRegime()`
Get market regime (bull/bear/sideways).

```javascript
const regime = await plugin.marketContext.getMarketRegime();
// { regime: 'bull', strength: 0.85, sma50: 450.25, sma200: 420.10, price: 455.00 }
```

##### `getVolatilityLevel()`
Get volatility level (VIX proxy).

```javascript
const volatility = await plugin.marketContext.getVolatilityLevel();
// { level: 'low', vix: 16.2, percentile: 35 }
```

##### `getSectorPerformance()`
Get sector rotation analysis.

```javascript
const sectors = await plugin.marketContext.getSectorPerformance();
// { technology: 2.5, healthcare: 1.8, financials: -0.5, ... }
```

#### User Personalization

##### `calculatePositionSize(userId, tradeSetup)`
Calculate personalized position size.

```javascript
const sizing = plugin.userProfileManager.calculatePositionSize('default', {
  market: 'stocks',
  entry: 150.25,
  stop: 147.50,
  target: 157.13,
  quality: 'A+',
  riskReward: 2.5
});
// {
//   allowed: true,
//   size: 72,
//   riskAmount: 198,
//   portfolioHeat: 5.5,
//   recommendation: 'APPROVED - A+ setup with 2.5 R:R'
// }
```

##### `isTradeAllowed(userId, tradeSetup)`
Check if trade is allowed (10-point validation).

```javascript
const allowed = plugin.userProfileManager.isTradeAllowed('default', tradeSetup);
// {
//   allowed: true,
//   score: 8,
//   warnings: [],
//   suggestions: ['Consider scaling in if price pulls back to support']
// }
```

##### `recordTradeResult(userId, result)`
Record trade result (updates psychology and stats).

```javascript
plugin.userProfileManager.recordTradeResult('default', {
  pnl: 180,
  riskAmount: 200,
  outcome: 'win'
});
```

#### Multi-Agent Coordination

##### `collaborate(options)`
Collaborate multiple trading agents.

```javascript
const analysis = await plugin.multiAgentCoordinator.collaborate({
  request: 'Should I buy AAPL at $150.25?',
  agents: ['market-analyst', 'technical-analyst', 'risk-manager', 'master-trader'],
  mode: 'parallel-then-synthesize',  // or 'sequential', 'debate'
  marketContext: await plugin.marketContext.getCurrentContext(),
  userProfile: plugin.userProfileManager.getProfile('default')
});
// {
//   recommendation: 'BUY',
//   confidence: 0.85,
//   setupQuality: 'A+',
//   riskReward: 2.5,
//   reasoning: '...',
//   perspectives: [
//     { agent: 'market-analyst', confidence: 0.9, analysis: '...' },
//     { agent: 'technical-analyst', confidence: 0.8, analysis: '...' },
//     { agent: 'risk-manager', confidence: 0.85, analysis: '...' }
//   ],
//   masterTraderSynthesis: '...'
// }
```

**Trading Agents (6):**
- `strategy-developer` — Develops and optimizes trading strategies
- `risk-manager` — Position sizing, stop-loss, portfolio heat management
- `market-analyst` — Macro trends, sentiment, economic indicators
- `technical-analyst` — Charts, patterns, indicators, price action
- `master-trader` — Synthesizes all perspectives, final decision
- `portfolio-manager` — Portfolio allocation, diversification, correlation

**Collaboration Modes:**
- `parallel-then-synthesize` (default) — All agents analyze independently, Master Trader synthesizes
- `sequential` — Each agent sees previous agents' analysis
- `debate` — Agents can disagree, Master Trader resolves conflicts

#### Performance Tracking

##### `recordTrade(trade)`
Record a completed trade.

```javascript
plugin.performanceTracker.recordTrade({
  symbol: 'AAPL',
  market: 'stocks',
  side: 'long',
  entry: 150.25,
  exit: 152.50,
  stop: 147.50,
  target: 157.13,
  quantity: 72,
  pnl: 162,
  setupType: 'A+',
  agent: 'master-trader',
  entryDate: Date.now() - 86400000,
  exitDate: Date.now()
});
```

##### `getOverallStatistics(options)`
Get overall performance statistics.

```javascript
const stats = plugin.performanceTracker.getOverallStatistics({
  market: 'stocks',
  startDate: thirtyDaysAgo,
  endDate: now
});
// {
//   totalTrades: 42,
//   winRate: 68.1,
//   lossRate: 31.9,
//   profitFactor: 2.19,
//   sharpeRatio: 1.87,
//   sortinoRatio: 2.34,
//   calmarRatio: 3.12,
//   maxDrawdown: 12.4,
//   maxDrawdownPercent: 12.4,
//   expectancy: 90.43,
//   averageWin: 210.50,
//   averageLoss: 95.20,
//   averageRR: 2.35,
//   totalReturn: 42.5,
//   totalReturnPercent: 42.5
// }
```

##### `getStatisticsBySetupType()`
Get performance by setup quality.

```javascript
const bySetup = plugin.performanceTracker.getStatisticsBySetupType();
// {
//   'A+': { trades: 12, winRate: 83.3, profitFactor: 3.2, ... },
//   'A': { trades: 18, winRate: 72.2, profitFactor: 2.5, ... },
//   'B': { trades: 8, winRate: 50.0, profitFactor: 1.1, ... }
// }
```

##### `generateReport(options)`
Generate comprehensive performance report with recommendations.

```javascript
const report = plugin.performanceTracker.generateReport({
  period: 'last30days',
  includeRecommendations: true
});
// {
//   period: { start: ..., end: ..., days: 30 },
//   overall: { winRate: 68.1, ... },
//   bySetupType: { ... },
//   byAgent: { ... },
//   byMarket: { ... },
//   recommendations: [
//     'Focus on A+ setups (83% win rate)',
//     'Avoid B setups (50% win rate, negative expectancy)',
//     'Increase position size on tech stocks (75% win rate)'
//   ]
// }
```

#### Market Data Feed

##### `getQuote(symbol, market)`
Get real-time quote.

```javascript
const quote = await plugin.marketDataFeed.getQuote('AAPL', 'stocks');
// {
//   symbol: 'AAPL',
//   bid: 150.20,
//   ask: 150.30,
//   last: 150.25,
//   open: 148.50,
//   high: 151.00,
//   low: 148.00,
//   volume: 52000000,
//   change: 1.75,
//   changePercent: 1.18,
//   timestamp: 1724832000000
// }
```

**Supported Markets:**
- `stocks` — US stocks, ETFs (Yahoo Finance)
- `forex` — Currency pairs like EURUSD=X (Yahoo Finance)
- `crypto` — Bitcoin, Ethereum, etc. (CoinGecko)

##### `getHistoricalData(symbol, options)`
Get historical OHLCV data.

```javascript
const bars = await plugin.marketDataFeed.getHistoricalData('AAPL', {
  market: 'stocks',
  interval: '1d',  // 1m, 5m, 15m, 1h, 1d, 1wk, 1mo
  startDate: oneYearAgo,
  endDate: now
});
// [
//   { timestamp: 1724745600000, open: 148.50, high: 151.00, low: 148.00, close: 150.25, volume: 52000000 },
//   ...
// ]
```

##### `getNews(symbol, options)`
Get news with sentiment analysis.

```javascript
const news = await plugin.marketDataFeed.getNews('AAPL', { limit: 10 });
// [
//   {
//     title: 'Apple announces new product line',
//     summary: '...',
//     publisher: 'Reuters',
//     url: 'https://...',
//     publishedAt: 1724832000000,
//     sentiment: 'positive'  // positive/negative/neutral
//   },
//   ...
// ]
```

##### `calculateIndicators(bars, indicators)`
Calculate technical indicators.

```javascript
const indicators = plugin.marketDataFeed.calculateIndicators(bars, ['sma', 'ema', 'rsi', 'macd']);
// {
//   sma20: 149.50,
//   sma50: 147.25,
//   sma200: 142.10,
//   ema12: 150.10,
//   ema26: 148.75,
//   rsi: 58.3,
//   macd: {
//     macd: 1.35,
//     signal: 0.95,
//     histogram: 0.40
//   }
// }
```

##### `subscribeToTicker(symbol, market, callback, interval)`
Subscribe to real-time ticker updates.

```javascript
const subId = plugin.marketDataFeed.subscribeToTicker('AAPL', 'stocks', 
  (quote) => console.log(`AAPL: $${quote.last}`),
  5000  // Poll every 5 seconds
);

// Unsubscribe later
plugin.marketDataFeed.unsubscribe(subId);
```

#### Backtesting Engine

##### `runBacktest(options)`
Run strategy backtest.

```javascript
const backtest = await plugin.backtestingEngine.runBacktest({
  strategy: {
    name: 'Golden Cross',
    timeframe: '1d',
    lookback: 50,
    onBar: async (currentBar, historicalBars, mode) => {
      if (mode === 'entry') {
        const sma50 = calculateSMA(historicalBars, 50);
        const sma200 = calculateSMA(historicalBars, 200);
        
        if (currentBar.close > sma50 && sma50 > sma200) {
          return {
            direction: 'long',
            stop: currentBar.close * 0.98,
            target: currentBar.close * 1.05,
            setupType: 'A',
            reason: 'Golden cross confirmed'
          };
        }
      }
      return null;
    }
  },
  symbol: 'SPY',
  market: 'stocks',
  startDate: oneYearAgo,
  endDate: now,
  initialCapital: 10000,
  commission: 0.001,  // 0.1%
  slippage: 0.0005,   // 0.05%
  riskPerTrade: 0.02, // 2%
  compound: true
});
// {
//   backtestId: 'backtest-1234',
//   strategy: 'Golden Cross',
//   symbol: 'SPY',
//   metrics: {
//     totalTrades: 47,
//     winRate: 68.1,
//     profitFactor: 2.19,
//     sharpeRatio: 1.87,
//     sortinoRatio: 2.34,
//     calmarRatio: 3.12,
//     maxDrawdown: 1240,
//     maxDrawdownPercent: 12.4,
//     expectancy: 90.43,
//     totalReturn: 4250,
//     totalReturnPercent: 42.5
//   },
//   trades: [...],
//   equityCurve: [...]
// }
```

##### `walkForwardAnalysis(options)`
Run walk-forward analysis (in-sample + out-of-sample).

```javascript
const walkForward = await plugin.backtestingEngine.walkForwardAnalysis({
  strategy,
  symbol: 'SPY',
  market: 'stocks',
  startDate: twoYearsAgo,
  endDate: now,
  inSamplePeriod: 180,   // 6 months optimize
  outSamplePeriod: 30,   // 1 month test
  initialCapital: 10000
});
// {
//   periods: 8,
//   aggregateMetrics: {
//     averageWinRate: 65.3,
//     averageProfitFactor: 2.05,
//     consistency: 87.5,  // % of periods profitable
//     totalReturn: 38.2
//   },
//   periodResults: [...]
// }
```

##### `monteCarloSimulation(backtest, iterations)`
Run Monte Carlo simulation.

```javascript
const monteCarlo = await plugin.backtestingEngine.monteCarloSimulation(backtest, 1000);
// {
//   iterations: 1000,
//   medianReturn: 38.2,
//   percentile5: 12.4,   // Worst 5% scenarios
//   percentile95: 67.8,  // Best 5% scenarios
//   probabilityOfProfit: 89.3,
//   averageMaxDrawdown: 14.2,
//   worstDrawdown: 28.5,
//   bestReturn: 82.3,
//   worstReturn: -5.2
// }
```

#### Broker Integration

##### `connect(brokerId, credentials)`
Connect to a broker.

```javascript
await plugin.mcpBrokerIntegration.connect('alpaca', {
  apiKey: process.env.ALPACA_API_KEY,
  apiSecret: process.env.ALPACA_API_SECRET
});
// { success: true, broker: 'alpaca', capabilities: ['stocks', 'crypto'], markets: ['US'] }
```

**Supported Brokers (14):**

| Broker | ID | Protocol | Markets | Commission |
|--------|------|----------|---------|------------|
| Interactive Brokers | `interactive-brokers` | MCP | stocks, options, futures, forex, crypto | 0.05% |
| TD Ameritrade | `td-ameritrade` | MCP | stocks, options, futures | $0 |
| Alpaca | `alpaca` | REST | stocks, crypto | $0 |
| OANDA | `oanda` | REST | forex | $0 |
| Binance | `binance` | REST | crypto | 0.1% |
| Coinbase Pro | `coinbase` | REST | crypto | 0.5% |
| Kraken | `kraken` | REST | crypto | 0.2% |
| MetaTrader 5 | `metatrader5` | MCP | forex, stocks, futures | Varies |
| Tradovate | `tradovate` | REST | futures | 0.01% |
| tastytrade | `tastytrade` | REST | stocks, options, futures | $0 |
| Robinhood | `robinhood` | Unofficial | stocks, options, crypto | $0 |
| Webull | `webull` | Unofficial | stocks, options, crypto | $0 |
| E*TRADE | `etrade` | REST | stocks, options, futures | $0 |
| Charles Schwab | `schwab` | REST | stocks, options, futures | $0 |

##### `placeOrder(brokerId, order)`
Place an order.

```javascript
// Market order
await plugin.mcpBrokerIntegration.placeOrder('alpaca', {
  symbol: 'AAPL',
  side: 'buy',         // buy/sell
  type: 'market',
  quantity: 100
});

// Limit order
await plugin.mcpBrokerIntegration.placeOrder('alpaca', {
  symbol: 'TSLA',
  side: 'buy',
  type: 'limit',
  quantity: 50,
  price: 250.00,
  timeInForce: 'gtc'  // day/gtc/ioc/fok
});

// Stop order
await plugin.mcpBrokerIntegration.placeOrder('alpaca', {
  symbol: 'AAPL',
  side: 'sell',
  type: 'stop',
  quantity: 100,
  stopPrice: 145.00
});

// Stop-limit order
await plugin.mcpBrokerIntegration.placeOrder('alpaca', {
  symbol: 'TSLA',
  side: 'sell',
  type: 'stop-limit',
  quantity: 50,
  price: 240.00,
  stopPrice: 245.00
});
```

##### `getAccount(brokerId)`
Get account information.

```javascript
const account = await plugin.mcpBrokerIntegration.getAccount('alpaca');
// {
//   success: true,
//   broker: 'alpaca',
//   account: {
//     balance: 10000,
//     equity: 10500,
//     margin: 0,
//     availableMargin: 10000,
//     currency: 'USD',
//     leverage: 1,
//     openPositions: 2,
//     openOrders: 1
//   }
// }
```

##### `getPositions(brokerId)`
Get open positions.

```javascript
const positions = await plugin.mcpBrokerIntegration.getPositions('alpaca');
// {
//   success: true,
//   broker: 'alpaca',
//   positions: [
//     {
//       symbol: 'AAPL',
//       side: 'long',
//       quantity: 100,
//       avgPrice: 148.50,
//       currentPrice: 150.25,
//       pnl: 175,
//       pnlPercent: 1.18,
//       openedAt: 1724745600000
//     },
//     ...
//   ]
// }
```

##### `cancelOrder(brokerId, orderId)`
Cancel an order.

```javascript
await plugin.mcpBrokerIntegration.cancelOrder('alpaca', 'ORD-1234');
// { success: true, orderId: 'ORD-1234', message: 'Order cancelled successfully' }
```

##### `getOrderStatus(brokerId, orderId)`
Get order status.

```javascript
const status = await plugin.mcpBrokerIntegration.getOrderStatus('alpaca', 'ORD-1234');
// {
//   success: true,
//   order: {
//     id: 'ORD-1234',
//     status: 'filled',      // pending/filled/partial/cancelled/rejected
//     filledQuantity: 100,
//     remainingQuantity: 0,
//     avgFillPrice: 150.25,
//     commission: 0
//   }
// }
```

#### Execution Monitor

##### `startMonitoring(brokerId, options)`
Start monitoring a broker.

```javascript
await plugin.executionMonitor.startMonitoring('alpaca', {
  interval: 5000,             // Check every 5 seconds
  enableAlerts: true,
  autoJournal: true,          // Auto-record filled orders
  riskLimits: {
    maxPortfolioHeat: 15,     // Max 15% at risk
    maxPositionLoss: -5       // Alert if position down 5%
  }
});
// { success: true, brokerId: 'alpaca', message: 'Monitoring started', interval: 5000 }
```

##### `getActivePositions(options)`
Get active positions across all brokers.

```javascript
const positions = plugin.executionMonitor.getActivePositions();
// [
//   {
//     id: 'alpaca-AAPL',
//     brokerId: 'alpaca',
//     symbol: 'AAPL',
//     side: 'long',
//     quantity: 100,
//     entryPrice: 148.50,
//     currentPrice: 150.25,
//     stopLoss: 145.00,
//     takeProfit: 155.00,
//     pnl: 175,
//     pnlPercent: 1.18,
//     riskAmount: 350,
//     riskReward: 2.0,
//     openedAt: 1724745600000,
//     duration: 86400000,
//     setupType: 'A+',
//     agent: 'master-trader'
//   },
//   ...
// ]
```

##### `getPortfolioSummary()`
Get portfolio summary across all brokers.

```javascript
const portfolio = await plugin.executionMonitor.getPortfolioSummary();
// {
//   timestamp: 1724832000000,
//   accounts: [
//     { brokerId: 'alpaca', name: 'Alpaca', balance: 10000, equity: 10175, margin: 0, currency: 'USD' }
//   ],
//   totalBalance: 10000,
//   totalEquity: 10175,
//   totalPnl: 175,
//   totalPnlPercent: 1.75,
//   positions: {
//     total: 1,
//     long: 1,
//     short: 0,
//     byMarket: { stocks: 1 }
//   },
//   risk: {
//     portfolioHeat: 3.50,
//     maxAllowedHeat: 15,
//     heatStatus: 'OK',
//     largestPosition: { symbol: 'AAPL', pnl: 175 },
//     exposureBySymbol: { AAPL: 15025 }
//   },
//   performance: {
//     dailyPnl: 175,
//     dailyPnlPercent: 1.75,
//     winningPositions: 1,
//     losingPositions: 0
//   }
// }
```

##### `getAlerts(options)`
Get risk alerts.

```javascript
const alerts = plugin.executionMonitor.getAlerts({ severity: 'high' });
// [
//   {
//     id: '1724832000000-ABC123',
//     timestamp: 1724832000000,
//     severity: 'high',         // low/medium/high
//     type: 'portfolio-heat',   // portfolio-heat/position-loss/margin-usage
//     message: 'Portfolio heat 16.5% exceeds limit 15%',
//     brokerId: 'alpaca',
//     acknowledged: false,
//     data: { portfolioHeat: 16.5, limit: 15 }
//   },
//   ...
// ]
```

##### `closePosition(positionId, reason)`
Close a position manually.

```javascript
await plugin.executionMonitor.closePosition('alpaca-AAPL', 'manual-exit');
// {
//   success: true,
//   message: 'Position closed',
//   pnl: 175,
//   journalEntry: { ... }
// }
```

##### `getJournalEntries(options)`
Get trade journal entries.

```javascript
const journal = plugin.executionMonitor.getJournalEntries({ limit: 10 });
// [
//   {
//     id: '1724832000000-DEF456',
//     timestamp: 1724832000000,
//     type: 'auto',
//     symbol: 'AAPL',
//     side: 'long',
//     entryPrice: 148.50,
//     exitPrice: 150.25,
//     quantity: 100,
//     pnl: 175,
//     pnlPercent: 1.18,
//     setupType: 'A+',
//     agent: 'master-trader',
//     duration: 86400000,
//     closeReason: 'target-hit',
//     notes: 'Target reached, clean breakout'
//   },
//   ...
// ]
```

---

### Platform Operations

#### `callPlatform(platform, method, params)`
Call AI platform API.

```javascript
const result = await plugin.callPlatform('claude', 'complete', {
  prompt: 'Analyze this data',
  model: 'claude-opus-5',
  maxTokens: 1000
});
```

#### `configurePlatform(platform, config)`
Configure platform credentials.

```javascript
await plugin.configurePlatform('claude', {
  enabled: true,
  apiKey: process.env.CLAUDE_API_KEY,
  baseUrl: 'https://api.anthropic.com',
  defaultModel: 'claude-opus-5'
});
```

#### `getPlatformStatus()`
Get platform status.

```javascript
const status = plugin.getPlatformStatus();
// {
//   claude: { enabled: true, authenticated: true, defaultModel: 'claude-opus-5' },
//   openai: { enabled: true, authenticated: true, defaultModel: 'gpt-4' }
// }
```

---

### Workflow Operations

#### `executeWorkflow(workflow)`
Execute a complete workflow.

```javascript
const result = await plugin.executeWorkflow({
  name: 'DataPipeline',
  initialContext: { userId: 'user123' },
  steps: [
    {
      type: 'memory',
      name: 'Store Input',
      operation: 'write',
      key: 'pipeline:input',
      value: inputData
    },
    {
      type: 'agent',
      name: 'Process Data',
      agentType: 'data-processor',
      task: {
        description: 'Transform data',
        data: inputData
      }
    },
    {
      type: 'memory',
      name: 'Store Output',
      operation: 'write',
      key: 'pipeline:output',
      value: '{{previousResult}}'
    }
  ]
});
// {
//   id: 'workflow_1724832000000_abc123',
//   name: 'DataPipeline',
//   status: 'completed',
//   duration: 5230,
//   results: [...],
//   finalContext: { ... }
// }
```

---

### Session Management

#### `getSessionInfo()`
Get current session info.

```javascript
const info = plugin.getSessionInfo();
// {
//   active: true,
//   sessionId: 'session_abc123',
//   startTime: 1724745600000,
//   uptime: 86400000,
//   version: '3.5.0'
// }
```

#### `exportSession()`
Export session state.

```javascript
const sessionData = await plugin.exportSession();
// {
//   sessionData: { ... },
//   memory: { ... },
//   orchestrator: { ... },
//   platforms: { ... },
//   timestamp: 1724832000000
// }
```

#### `importSession(sessionExport)`
Import session state.

```javascript
await plugin.importSession(sessionData);
```

#### `pauseSession()`
Pause session.

```javascript
await plugin.pauseSession();
```

#### `resumeSession()`
Resume session.

```javascript
await plugin.resumeSession();
```

#### `endSession()`
End session with summary.

```javascript
const summary = await plugin.endSession();
// {
//   sessionId: 'session_abc123',
//   startTime: 1724745600000,
//   endTime: 1724832000000,
//   duration: 86400000,
//   stats: { totalEntries: 42, ... },
//   agents: [...],
//   platforms: { ... }
// }
```

---

### Update Operations

#### `checkForUpdates()`
Check for plugin updates.

```javascript
const check = await plugin.checkForUpdates();
// {
//   updateAvailable: true,
//   currentVersion: '3.5.0',
//   latestVersion: '3.6.0',
//   releaseNotes: '...'
// }
```

#### `applyUpdate()`
Apply update.

```javascript
const result = await plugin.applyUpdate();
// {
//   success: true,
//   version: '3.6.0',
//   changes: '...'
// }
```

---

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

The test suite includes:
- Plugin validation (manifest, frontmatter, kebab-case names)
- 22 functional tests (memory, agents, platforms, workflows, sessions)

```bash
# Run validation only
npm run validate

# Run functional tests only
node test/test-suite.js
```

**Test Coverage:**
- ✅ Memory operations (write/read/search/delete/stats/clear)
- ✅ Agent lifecycle (create/execute/status)
- ✅ Parallel/Sequential/Pipeline execution
- ✅ Platform management
- ✅ Workflow execution
- ✅ Session management
- ✅ Event system
- ✅ Execution history
- ✅ Plugin manifest validation
- ✅ Agent/skill frontmatter validation

---

## 📊 Architecture

```
PowerSkills Memory Orchestrator v3.5.0
│
├── Core Components
│   ├── Memory Engine (memory-engine.js)
│   │   ├── Session management
│   │   ├── Read/Write operations
│   │   ├── Search with regex
│   │   └── Statistics tracking
│   │
│   ├── Platform Adapter (platform-adapter.js)
│   │   ├── Multi-platform support (OpenAI, Claude, Antigravity)
│   │   ├── API abstraction
│   │   └── Credential management
│   │
│   ├── Sub-Agent Orchestrator (sub-agent-orchestrator.js)
│   │   ├── Agent lifecycle
│   │   ├── Task execution
│   │   ├── Parallel/Sequential modes
│   │   └── Pipeline workflows
│   │
│   └── Update Manager (update-manager.js)
│       ├── GitHub version checking
│       ├── Auto-update on startup
│       └── Changelog retrieval
│
├── PowerSkills Framework
│   ├── Orchestration Gates (orchestration-gates.js)
│   │   ├── Gate 0: Preprocessing
│   │   ├── Gate 1: Routing
│   │   ├── Gate 2: Alignment
│   │   ├── Gate 3: Planning
│   │   ├── Gate 4: Dispatch
│   │   ├── Gate 5: Execution
│   │   ├── Gate 6: Verification
│   │   └── Gate 7: Completion
│   │
│   ├── Skill Registry (skill-registry.js)
│   │   ├── 43 embedded skills
│   │   └── Skill matching & execution
│   │
│   ├── Agent Template Manager (agent-template-manager.js)
│   │   ├── 53 agent templates
│   │   └── Template instantiation
│   │
│   ├── Command Dispatcher (command-dispatcher.js)
│   │   ├── 10 slash commands
│   │   └── Command parsing & routing
│   │
│   ├── Task Router (task-router.js)
│   │   ├── Task type detection
│   │   ├── Model selection
│   │   └── Skill routing
│   │
│   ├── Token Budget Tracker (token-budget-tracker.js)
│   │   ├── Usage estimation
│   │   ├── Phase tracking
│   │   └── Budget warnings
│   │
│   └── Verification Loop (verification-loop.js)
│       ├── Output verification
│       ├── Log analysis
│       ├── Error troubleshooting
│       └── Auto-fix generation
│
└── Trading Intelligence System
    │
    ├── Week 1: Foundation
    │   ├── Market Context Provider (market-context-provider.js)
    │   │   ├── Market regime detection
    │   │   ├── Volatility monitoring
    │   │   ├── Sector performance
    │   │   └── Currency strength
    │   │
    │   └── User Profile Manager (user-profile-manager.js)
    │       ├── Position sizing (Kelly-based)
    │       ├── Risk management
    │       ├── Psychology tracking
    │       └── Trade validation
    │
    ├── Week 2: Intelligence
    │   ├── Multi-Agent Coordinator (multi-agent-coordinator.js)
    │   │   ├── 6 trading agents
    │   │   ├── 3 collaboration modes
    │   │   └── Master Trader synthesis
    │   │
    │   └── Performance Tracker (performance-tracker.js)
    │       ├── Trade recording
    │       ├── Statistics calculation
    │       ├── Setup/agent/market analysis
    │       └── Automated recommendations
    │
    ├── Week 3: Infrastructure
    │   ├── Market Data Feed (market-data-feed.js)
    │   │   ├── Real-time quotes
    │   │   ├── Historical OHLCV
    │   │   ├── News with sentiment
    │   │   ├── Technical indicators
    │   │   └── Ticker subscriptions
    │   │
    │   └── Backtesting Engine (backtesting-engine.js)
    │       ├── Strategy backtesting
    │       ├── Walk-forward analysis
    │       ├── Monte Carlo simulation
    │       └── Performance metrics
    │
    └── Week 4: Execution
        ├── MCP Broker Integration (mcp-broker-integration.js)
        │   ├── 14+ broker connections
        │   ├── Order execution
        │   ├── Account management
        │   └── Position tracking
        │
        └── Execution Monitor (execution-monitor.js)
            ├── Real-time monitoring
            ├── Risk alerts
            ├── Trade journal
            └── Portfolio aggregation
```

---

## 🔧 Configuration

### Full Configuration Example

```javascript
const plugin = new PowerSkillsPlugin({
  // Auto-update
  autoUpdate: true,

  // Memory settings
  memory: {
    persistToDisk: true,
    sessionTimeout: 3600000,
    maxMemorySize: 104857600  // 100MB
  },

  // Orchestrator settings
  orchestrator: {
    maxConcurrentAgents: 10,
    taskTimeout: 300000,
    retryAttempts: 3
  },

  // Platform configurations
  platforms: {
    claude: {
      enabled: true,
      apiKey: process.env.CLAUDE_API_KEY,
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-opus-5'
    },
    openai: {
      enabled: true,
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4'
    }
  }
});
```

---

## 🔒 Security

PowerSkills Memory Orchestrator v3.5.0 maintains comprehensive security hardening:

- ✅ **15 Critical Vulnerabilities Fixed** (see [SECURITY_AUDIT.md](SECURITY_AUDIT.md))
- ✅ Cryptographically secure session generation
- ✅ ReDoS attack protection (regex pattern limits)
- ✅ API key leakage prevention
- ✅ Input validation and type safety
- ✅ Resource exhaustion protection
- ✅ Memory leak prevention
- ✅ Reference files protected (Ref/, Reference/, BYLaw.md never pushed to GitHub)

**Verification:** [VERIFICATION.md](VERIFICATION.md)

---

## 📝 Version History

### v3.5.0 (Latest) - 2026-08-28
- ✅ **Week 4 Complete:** MCP Broker Integration + Execution Monitor (1,617 lines)
- ✅ 14+ broker connections (Interactive Brokers, Alpaca, Binance, OANDA, etc.)
- ✅ Real-time position monitoring (5-second updates)
- ✅ Risk alerts (portfolio heat, position loss, margin usage)
- ✅ Trade journal automation
- ✅ Multi-broker position aggregation
- ✅ Plugin installation fix (kebab-case name, agent frontmatter)
- ✅ Plugin validation script (catch install blockers locally)

### v3.4.0 - 2026-08-28
- ✅ **Week 3 Complete:** Market Data Feeds + Backtesting Engine (1,332 lines)
- ✅ Real-time quotes from Yahoo Finance and CoinGecko (100% free)
- ✅ Historical OHLCV data (10+ years)
- ✅ News feed with sentiment analysis
- ✅ Technical indicators (SMA, EMA, RSI, MACD)
- ✅ Strategy backtesting with commission/slippage
- ✅ Walk-forward analysis and Monte Carlo simulation

### v3.3.0 - 2026-08-28
- ✅ **Week 2 Complete:** Multi-Agent Orchestration + Performance Analytics (1,310 lines)
- ✅ 6 trading agents with 3 collaboration modes
- ✅ Master Trader synthesis
- ✅ Comprehensive performance tracking
- ✅ Automated recommendations

### v3.2.0 - 2026-08-27
- ✅ **Week 1 Complete:** Market Context + User Personalization (1,228 lines)
- ✅ Bull/bear/sideways detection
- ✅ Account-aware position sizing
- ✅ Risk management and psychology tracking

### v3.1.0 - 2026-08-27
- ✅ 6 trading agents (20+ years institutional experience)
- ✅ Strategy developer, risk manager, market/technical analysts
- ✅ Master trader synthesis

### v2.1.0
- ✅ Auto-update on plugin startup
- ✅ 15 critical security vulnerabilities fixed
- ✅ Cryptographically secure session IDs
- ✅ ReDoS protection
- ✅ API key leakage prevention
- ✅ Resource optimization

### v2.0.1
- GitHub update manager
- Automatic version checking

### v1.0.0
- Initial release
- Core memory operations
- Sub-agent orchestration
- Platform adapters

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🔗 Links

- **Repository**: https://github.com/vyshvs/Powerskills-orchestrator
- **Issues**: https://github.com/vyshvs/Powerskills-orchestrator/issues
- **Security Audit**: [SECURITY_AUDIT.md](SECURITY_AUDIT.md)
- **Verification Report**: [VERIFICATION.md](VERIFICATION.md)
- **Implementation Summary**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 📈 Statistics

- **Version:** 3.5.0
- **Total Code:** 5,487 lines (trading intelligence)
- **Skills:** 43
- **Commands:** 10
- **Agent Templates:** 53
- **Trading Agents:** 6
- **Brokers Supported:** 14
- **Tests:** 22/22 passing
- **Dependencies:** 0 (zero external dependencies)

---

**Built with ❤️ by vyshvs**

**Powered by:** Claude Opus 5 🤖
