/**
 * Multi-Agent Coordinator
 *
 * Orchestrates collaboration between specialized trading agents.
 * Implements parallel execution and synthesis patterns for institutional-grade analysis.
 */

class MultiAgentCoordinator {
  constructor(plugin) {
    this.plugin = plugin;
    this.activeCollaborations = new Map();
    this.collaborationHistory = [];

    this.plugin.memoryEngine.log('MULTI_AGENT', 'Initialized', {
      availableAgents: this.getAvailableAgents().length
    });
  }

  /**
   * Get available trading agents
   */
  getAvailableAgents() {
    const agents = [];
    const templates = this.plugin.agentTemplateManager.listTemplates();

    const tradingAgents = [
      'strategy-developer',
      'risk-manager',
      'market-analyst',
      'technical-analyst',
      'master-trader',
      'portfolio-manager'
    ];

    tradingAgents.forEach(agentType => {
      if (templates.includes(agentType)) {
        agents.push(agentType);
      }
    });

    return agents;
  }

  /**
   * Collaborate - Execute multiple agents and synthesize results
   */
  async collaborate(options) {
    const {
      request,
      agents = ['market-analyst', 'technical-analyst', 'risk-manager', 'master-trader'],
      mode = 'parallel-then-synthesize', // 'parallel-then-synthesize', 'sequential', 'debate'
      userId = 'default'
    } = options;

    const collaborationId = `collab-${Date.now()}`;

    this.plugin.memoryEngine.log('MULTI_AGENT', 'Collaboration started', {
      collaborationId,
      agents,
      mode,
      request: request.substring(0, 100)
    });

    const collaboration = {
      id: collaborationId,
      request,
      agents,
      mode,
      startTime: Date.now(),
      agentResults: [],
      synthesis: null,
      status: 'running'
    };

    this.activeCollaborations.set(collaborationId, collaboration);

    try {
      let result;

      switch (mode) {
        case 'parallel-then-synthesize':
          result = await this.parallelThenSynthesize(collaboration);
          break;
        case 'sequential':
          result = await this.sequential(collaboration);
          break;
        case 'debate':
          result = await this.debate(collaboration);
          break;
        default:
          result = await this.parallelThenSynthesize(collaboration);
      }

      collaboration.status = 'complete';
      collaboration.endTime = Date.now();
      collaboration.duration = collaboration.endTime - collaboration.startTime;

      this.collaborationHistory.push(collaboration);
      this.activeCollaborations.delete(collaborationId);

      this.plugin.memoryEngine.log('MULTI_AGENT', 'Collaboration complete', {
        collaborationId,
        duration: collaboration.duration,
        agentsUsed: collaboration.agentResults.length
      });

      return result;
    } catch (error) {
      collaboration.status = 'failed';
      collaboration.error = error.message;

      this.plugin.memoryEngine.log('MULTI_AGENT', 'Collaboration failed', {
        collaborationId,
        error: error.message
      });

      return this.getFallbackResult(request);
    }
  }

  /**
   * Parallel execution then Master Trader synthesis
   */
  async parallelThenSynthesize(collaboration) {
    const { request, agents } = collaboration;

    // Separate synthesis agent (Master Trader) from analysis agents
    const analysisAgents = agents.filter(a => a !== 'master-trader');
    const hasMasterTrader = agents.includes('master-trader');

    // Get context
    const marketContext = await this.getMarketContext();
    const userProfile = this.getUserProfile();

    // Execute analysis agents in parallel
    const analysisPromises = analysisAgents.map(agentType =>
      this.executeAgent(agentType, request, marketContext, userProfile, collaboration)
    );

    const analysisResults = await Promise.all(analysisPromises);

    // Filter out failed agents
    const successfulResults = analysisResults.filter(r => r && r.status === 'success');

    if (successfulResults.length === 0) {
      return this.getFallbackResult(request);
    }

    // Synthesize with Master Trader if included
    let synthesis;
    if (hasMasterTrader) {
      synthesis = await this.synthesizeWithMasterTrader(
        request,
        successfulResults,
        marketContext,
        userProfile,
        collaboration
      );
    } else {
      synthesis = this.simpleSynthesis(successfulResults);
    }

    return {
      type: 'multi-agent-collaboration',
      mode: 'parallel-then-synthesize',
      agentPerspectives: successfulResults,
      synthesis,
      metadata: {
        collaborationId: collaboration.id,
        agentsUsed: successfulResults.length,
        duration: Date.now() - collaboration.startTime
      }
    };
  }

  /**
   * Sequential execution (each agent sees previous results)
   */
  async sequential(collaboration) {
    const { request, agents } = collaboration;

    const marketContext = await this.getMarketContext();
    const userProfile = this.getUserProfile();

    let previousResults = [];
    const allResults = [];

    for (const agentType of agents) {
      const enhancedRequest = previousResults.length > 0
        ? `${request}\n\nPrevious agent insights:\n${this.formatPreviousResults(previousResults)}`
        : request;

      const result = await this.executeAgent(
        agentType,
        enhancedRequest,
        marketContext,
        userProfile,
        collaboration
      );

      if (result && result.status === 'success') {
        allResults.push(result);
        previousResults.push(result);
      }
    }

    return {
      type: 'multi-agent-collaboration',
      mode: 'sequential',
      agentPerspectives: allResults,
      synthesis: allResults[allResults.length - 1], // Last agent is final synthesis
      metadata: {
        collaborationId: collaboration.id,
        agentsUsed: allResults.length,
        duration: Date.now() - collaboration.startTime
      }
    };
  }

  /**
   * Debate mode (agents can disagree, Master Trader resolves)
   */
  async debate(collaboration) {
    const { request, agents } = collaboration;

    const marketContext = await this.getMarketContext();
    const userProfile = this.getUserProfile();

    // Get initial perspectives
    const analysisAgents = agents.filter(a => a !== 'master-trader');
    const perspectives = await Promise.all(
      analysisAgents.map(a => this.executeAgent(a, request, marketContext, userProfile, collaboration))
    );

    const successfulPerspectives = perspectives.filter(p => p && p.status === 'success');

    // Identify disagreements
    const disagreements = this.identifyDisagreements(successfulPerspectives);

    // Master Trader resolves disagreements
    let resolution;
    if (agents.includes('master-trader') && disagreements.length > 0) {
      const debateRequest = `${request}\n\nAgent Debate:\n${this.formatDebate(successfulPerspectives, disagreements)}`;
      resolution = await this.executeAgent(
        'master-trader',
        debateRequest,
        marketContext,
        userProfile,
        collaboration
      );
    } else {
      resolution = this.simpleSynthesis(successfulPerspectives);
    }

    return {
      type: 'multi-agent-collaboration',
      mode: 'debate',
      agentPerspectives: successfulPerspectives,
      disagreements,
      resolution,
      metadata: {
        collaborationId: collaboration.id,
        agentsUsed: successfulPerspectives.length,
        disagreementCount: disagreements.length,
        duration: Date.now() - collaboration.startTime
      }
    };
  }

  /**
   * Execute individual agent
   */
  async executeAgent(agentType, request, marketContext, userProfile, collaboration) {
    const startTime = Date.now();

    try {
      // Build agent-specific context
      const agentContext = this.buildAgentContext(agentType, request, marketContext, userProfile);

      // Simulate agent execution (in production, this would call actual agent template)
      const analysis = await this.simulateAgentAnalysis(agentType, agentContext);

      const result = {
        agent: agentType,
        status: 'success',
        analysis,
        confidence: this.calculateConfidence(agentType, analysis, marketContext),
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };

      collaboration.agentResults.push(result);

      this.plugin.memoryEngine.log('MULTI_AGENT', 'Agent completed', {
        collaborationId: collaboration.id,
        agent: agentType,
        duration: result.duration
      });

      return result;
    } catch (error) {
      this.plugin.memoryEngine.log('MULTI_AGENT', 'Agent failed', {
        collaborationId: collaboration.id,
        agent: agentType,
        error: error.message
      });

      return {
        agent: agentType,
        status: 'failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Build agent-specific context
   */
  buildAgentContext(agentType, request, marketContext, userProfile) {
    const baseContext = {
      request,
      marketContext,
      userProfile,
      timestamp: Date.now()
    };

    // Agent-specific context enhancement
    switch (agentType) {
      case 'market-analyst':
        return {
          ...baseContext,
          focus: 'macro-fundamental',
          dataPoints: marketContext ? {
            regime: marketContext.regime,
            sentiment: marketContext.sentiment,
            sectors: marketContext.sectors
          } : null
        };

      case 'technical-analyst':
        return {
          ...baseContext,
          focus: 'price-action-patterns',
          dataPoints: marketContext ? {
            indices: marketContext.indices,
            volatility: marketContext.volatility
          } : null
        };

      case 'risk-manager':
        return {
          ...baseContext,
          focus: 'position-sizing-risk',
          dataPoints: userProfile ? {
            accountSize: userProfile.account.size,
            riskPerTrade: userProfile.risk.perTrade,
            portfolioHeat: userProfile.risk.maxPortfolioHeat
          } : null
        };

      case 'master-trader':
        return {
          ...baseContext,
          focus: 'synthesis-decision',
          dataPoints: 'all'
        };

      default:
        return baseContext;
    }
  }

  /**
   * Simulate agent analysis (placeholder for actual agent execution)
   */
  async simulateAgentAnalysis(agentType, context) {
    // In production, this would invoke the actual agent template
    // For now, return structured analysis based on agent type

    const { marketContext, userProfile } = context;

    switch (agentType) {
      case 'market-analyst':
        return {
          perspective: 'macro-fundamental',
          view: marketContext?.regime.current === 'bull' ? 'bullish' :
                marketContext?.regime.current === 'bear' ? 'bearish' : 'neutral',
          reasoning: `Market regime: ${marketContext?.regime.current || 'unknown'}, Sentiment: ${marketContext?.sentiment.level || 'unknown'}`,
          keyFactors: [
            marketContext?.regime ? `${marketContext.regime.current} market regime` : 'Regime unknown',
            marketContext?.sentiment ? `${marketContext.sentiment.level} sentiment` : 'Sentiment unknown',
            marketContext?.sectors?.leaders[0] ? `${marketContext.sectors.leaders[0].sector} sector leading` : 'Sector data unavailable'
          ]
        };

      case 'technical-analyst':
        return {
          perspective: 'technical',
          setupQuality: 'A', // Would analyze actual chart patterns
          view: marketContext?.indices?.SPY?.trend || 'neutral',
          reasoning: `SPY ${marketContext?.indices?.SPY?.trend || 'unknown'} trend, VIX ${marketContext?.volatility?.level || 'unknown'}`,
          keyLevels: {
            support: 'To be determined from chart analysis',
            resistance: 'To be determined from chart analysis',
            entry: 'Awaiting pattern confirmation'
          }
        };

      case 'risk-manager':
        return {
          perspective: 'risk-management',
          positionSize: userProfile ? this.plugin.userProfileManager.calculatePositionSize('default', {
            market: 'forex',
            entry: 1.0850,
            stop: 1.0800,
            quality: 'A',
            riskReward: 2.5
          }) : { size: 0, allowed: false, reason: 'Profile unavailable' },
          riskAssessment: userProfile ?
            `${(userProfile.risk.perTrade * 100).toFixed(1)}% per trade, ${(userProfile.risk.maxPortfolioHeat * 100).toFixed(0)}% max heat` :
            'Risk parameters unavailable',
          warnings: []
        };

      case 'master-trader':
        return {
          perspective: 'synthesis',
          recommendation: 'WAIT',
          reasoning: 'Synthesizing multiple agent perspectives',
          confidence: 0.7
        };

      default:
        return {
          perspective: agentType,
          analysis: 'Analysis placeholder'
        };
    }
  }

  /**
   * Synthesize with Master Trader
   */
  async synthesizeWithMasterTrader(request, agentResults, marketContext, userProfile, collaboration) {
    const synthesisRequest = `
${request}

AGENT PERSPECTIVES:
${agentResults.map(r => `
${r.agent.toUpperCase()}:
${JSON.stringify(r.analysis, null, 2)}
Confidence: ${(r.confidence * 100).toFixed(0)}%
`).join('\n')}

Synthesize these perspectives and provide final trading recommendation.
`;

    const synthesis = await this.executeAgent(
      'master-trader',
      synthesisRequest,
      marketContext,
      userProfile,
      collaboration
    );

    return synthesis;
  }

  /**
   * Simple synthesis (without Master Trader)
   */
  simpleSynthesis(agentResults) {
    const bullishCount = agentResults.filter(r =>
      r.analysis.view === 'bullish' || r.analysis.view === 'buy'
    ).length;

    const bearishCount = agentResults.filter(r =>
      r.analysis.view === 'bearish' || r.analysis.view === 'sell'
    ).length;

    const consensus = bullishCount > bearishCount ? 'bullish' :
                     bearishCount > bullishCount ? 'bearish' : 'neutral';

    return {
      agent: 'simple-synthesis',
      status: 'success',
      analysis: {
        perspective: 'consensus',
        view: consensus,
        reasoning: `${bullishCount} agents bullish, ${bearishCount} agents bearish, ${agentResults.length - bullishCount - bearishCount} neutral`,
        agreement: bullishCount === agentResults.length || bearishCount === agentResults.length ? 'unanimous' : 'mixed'
      },
      confidence: Math.max(bullishCount, bearishCount) / agentResults.length
    };
  }

  /**
   * Identify disagreements between agents
   */
  identifyDisagreements(perspectives) {
    const disagreements = [];

    const views = perspectives.map(p => ({
      agent: p.agent,
      view: p.analysis.view
    }));

    const uniqueViews = [...new Set(views.map(v => v.view))];

    if (uniqueViews.length > 1) {
      disagreements.push({
        topic: 'market-direction',
        agents: views,
        description: `Agents disagree on market direction: ${uniqueViews.join(' vs ')}`
      });
    }

    return disagreements;
  }

  /**
   * Format debate for Master Trader
   */
  formatDebate(perspectives, disagreements) {
    let debate = 'DISAGREEMENTS IDENTIFIED:\n';

    disagreements.forEach(d => {
      debate += `\n${d.description}\n`;
      d.agents.forEach(a => {
        debate += `- ${a.agent}: ${a.view}\n`;
      });
    });

    debate += '\nFULL AGENT PERSPECTIVES:\n';
    perspectives.forEach(p => {
      debate += `\n${p.agent}:\n${JSON.stringify(p.analysis, null, 2)}\n`;
    });

    return debate;
  }

  /**
   * Format previous results for sequential mode
   */
  formatPreviousResults(results) {
    return results.map(r =>
      `${r.agent}: ${JSON.stringify(r.analysis, null, 2)}`
    ).join('\n\n');
  }

  /**
   * Calculate confidence score for agent result
   */
  calculateConfidence(agentType, analysis, marketContext) {
    let confidence = 0.7; // Base confidence

    // Adjust based on market context quality
    if (marketContext && marketContext.regime.confidence > 0.7) {
      confidence += 0.1;
    }

    // Adjust based on agent type and data availability
    if (agentType === 'market-analyst' && marketContext?.sentiment) {
      confidence += 0.1;
    }

    if (agentType === 'technical-analyst' && marketContext?.indices) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Get market context
   */
  async getMarketContext() {
    try {
      if (this.plugin.marketContext) {
        return await this.plugin.marketContext.getCurrentContext();
      }
    } catch (error) {
      this.plugin.memoryEngine.log('MULTI_AGENT', 'Market context unavailable', {
        error: error.message
      });
    }
    return null;
  }

  /**
   * Get user profile
   */
  getUserProfile() {
    try {
      if (this.plugin.userProfileManager) {
        return this.plugin.userProfileManager.getProfile('default');
      }
    } catch (error) {
      this.plugin.memoryEngine.log('MULTI_AGENT', 'User profile unavailable', {
        error: error.message
      });
    }
    return null;
  }

  /**
   * Fallback result when collaboration fails
   */
  getFallbackResult(request) {
    return {
      type: 'multi-agent-collaboration',
      status: 'fallback',
      message: 'Multi-agent collaboration unavailable. Using single-agent analysis.',
      recommendation: 'Insufficient data for comprehensive analysis. Please try again or use individual agent.',
      request
    };
  }

  /**
   * Get collaboration statistics
   */
  getStatistics() {
    const total = this.collaborationHistory.length;
    const successful = this.collaborationHistory.filter(c => c.status === 'complete').length;
    const failed = this.collaborationHistory.filter(c => c.status === 'failed').length;
    const avgDuration = total > 0
      ? this.collaborationHistory.reduce((sum, c) => sum + (c.duration || 0), 0) / total
      : 0;

    return {
      totalCollaborations: total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
      averageDuration: Math.round(avgDuration),
      activeCollaborations: this.activeCollaborations.size
    };
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.collaborationHistory = [];
    this.plugin.memoryEngine.log('MULTI_AGENT', 'History cleared');
  }
}

module.exports = MultiAgentCoordinator;
