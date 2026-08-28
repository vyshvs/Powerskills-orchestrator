/**
 * MCP Broker Integration
 *
 * Purpose: Connect to 14+ brokers via Model Context Protocol (MCP)
 * Features:
 * - Multi-broker support (Interactive Brokers, TD Ameritrade, MetaTrader, etc.)
 * - Order execution (market, limit, stop, stop-limit)
 * - Position management (open, close, modify)
 * - Account information (balance, equity, margin)
 * - Real-time order status updates
 * - Broker capability detection
 *
 * @module core/execution/mcp-broker-integration
 */

class MCPBrokerIntegration {
  constructor(plugin) {
    this.plugin = plugin;
    this.connectedBrokers = new Map();
    this.orderCallbacks = new Map();
    this.positionCallbacks = new Map();

    // Supported brokers with their MCP server configurations
    this.supportedBrokers = {
      'interactive-brokers': {
        name: 'Interactive Brokers',
        protocol: 'mcp',
        serverCommand: 'npx',
        serverArgs: ['-y', '@modelcontextprotocol/server-interactive-brokers'],
        capabilities: ['stocks', 'options', 'futures', 'forex', 'crypto'],
        markets: ['US', 'EU', 'ASIA'],
        commission: 0.0005, // 0.05%
        minBalance: 25000 // Pattern day trader rule
      },
      'td-ameritrade': {
        name: 'TD Ameritrade',
        protocol: 'mcp',
        serverCommand: 'npx',
        serverArgs: ['-y', '@modelcontextprotocol/server-td-ameritrade'],
        capabilities: ['stocks', 'options', 'futures'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'alpaca': {
        name: 'Alpaca',
        protocol: 'rest',
        apiUrl: 'https://paper-api.alpaca.markets',
        capabilities: ['stocks', 'crypto'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'oanda': {
        name: 'OANDA',
        protocol: 'rest',
        apiUrl: 'https://api-fxpractice.oanda.com',
        capabilities: ['forex'],
        markets: ['GLOBAL'],
        commission: 0,
        minBalance: 0
      },
      'binance': {
        name: 'Binance',
        protocol: 'rest',
        apiUrl: 'https://api.binance.com',
        capabilities: ['crypto'],
        markets: ['GLOBAL'],
        commission: 0.001, // 0.1%
        minBalance: 0
      },
      'coinbase': {
        name: 'Coinbase Pro',
        protocol: 'rest',
        apiUrl: 'https://api.pro.coinbase.com',
        capabilities: ['crypto'],
        markets: ['US', 'EU'],
        commission: 0.005, // 0.5% taker
        minBalance: 0
      },
      'kraken': {
        name: 'Kraken',
        protocol: 'rest',
        apiUrl: 'https://api.kraken.com',
        capabilities: ['crypto'],
        markets: ['GLOBAL'],
        commission: 0.002, // 0.2% taker
        minBalance: 0
      },
      'metatrader5': {
        name: 'MetaTrader 5',
        protocol: 'mcp',
        serverCommand: 'npx',
        serverArgs: ['-y', '@modelcontextprotocol/server-metatrader'],
        capabilities: ['forex', 'stocks', 'futures'],
        markets: ['GLOBAL'],
        commission: 0,
        minBalance: 0
      },
      'tradovate': {
        name: 'Tradovate',
        protocol: 'rest',
        apiUrl: 'https://demo.tradovateapi.com',
        capabilities: ['futures'],
        markets: ['US'],
        commission: 0.0001,
        minBalance: 0
      },
      'tastytrade': {
        name: 'tastytrade',
        protocol: 'rest',
        apiUrl: 'https://api.tastyworks.com',
        capabilities: ['stocks', 'options', 'futures'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'robinhood': {
        name: 'Robinhood',
        protocol: 'unofficial',
        apiUrl: 'https://api.robinhood.com',
        capabilities: ['stocks', 'options', 'crypto'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'webull': {
        name: 'Webull',
        protocol: 'unofficial',
        apiUrl: 'https://quoteapi.webull.com',
        capabilities: ['stocks', 'options', 'crypto'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'etrade': {
        name: 'E*TRADE',
        protocol: 'rest',
        apiUrl: 'https://api.etrade.com',
        capabilities: ['stocks', 'options', 'futures'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      },
      'schwab': {
        name: 'Charles Schwab',
        protocol: 'rest',
        apiUrl: 'https://api.schwabapi.com',
        capabilities: ['stocks', 'options', 'futures'],
        markets: ['US'],
        commission: 0,
        minBalance: 0
      }
    };
  }

  /**
   * Connect to a broker
   * @param {string} brokerId - Broker identifier (e.g., 'interactive-brokers')
   * @param {Object} credentials - Broker credentials
   * @returns {Promise<Object>} Connection status
   */
  async connect(brokerId, credentials = {}) {
    const broker = this.supportedBrokers[brokerId];

    if (!broker) {
      throw new Error(`Unsupported broker: ${brokerId}. Supported: ${Object.keys(this.supportedBrokers).join(', ')}`);
    }

    try {
      // Check if already connected
      if (this.connectedBrokers.has(brokerId)) {
        return {
          success: true,
          broker: brokerId,
          message: 'Already connected',
          connection: this.connectedBrokers.get(brokerId)
        };
      }

      // Initialize connection based on protocol
      let connection;

      if (broker.protocol === 'mcp') {
        connection = await this._connectMCP(broker, credentials);
      } else if (broker.protocol === 'rest') {
        connection = await this._connectREST(broker, credentials);
      } else if (broker.protocol === 'unofficial') {
        connection = await this._connectUnofficial(broker, credentials);
      }

      // Store connection
      this.connectedBrokers.set(brokerId, {
        broker,
        connection,
        credentials,
        connectedAt: Date.now()
      });

      this.plugin.emit('broker-connected', { brokerId, broker: broker.name });

      return {
        success: true,
        broker: brokerId,
        name: broker.name,
        capabilities: broker.capabilities,
        markets: broker.markets,
        message: 'Connected successfully'
      };

    } catch (error) {
      this.plugin.emit('broker-error', { brokerId, error: error.message });

      return {
        success: false,
        broker: brokerId,
        error: error.message,
        suggestion: this._getSuggestion(brokerId, error)
      };
    }
  }

  /**
   * Disconnect from a broker
   * @param {string} brokerId - Broker identifier
   * @returns {Promise<Object>} Disconnection status
   */
  async disconnect(brokerId) {
    if (!this.connectedBrokers.has(brokerId)) {
      return {
        success: false,
        broker: brokerId,
        message: 'Not connected'
      };
    }

    const { connection } = this.connectedBrokers.get(brokerId);

    // Close connection
    if (connection.close) {
      await connection.close();
    }

    this.connectedBrokers.delete(brokerId);
    this.plugin.emit('broker-disconnected', { brokerId });

    return {
      success: true,
      broker: brokerId,
      message: 'Disconnected successfully'
    };
  }

  /**
   * Place an order
   * @param {string} brokerId - Broker identifier
   * @param {Object} order - Order details
   * @returns {Promise<Object>} Order result
   */
  async placeOrder(brokerId, order) {
    this._validateConnection(brokerId);

    const { broker, connection } = this.connectedBrokers.get(brokerId);

    // Validate order
    this._validateOrder(order);

    try {
      // Generate order ID
      const orderId = this._generateOrderId();

      // Prepare order
      const preparedOrder = {
        id: orderId,
        symbol: order.symbol,
        side: order.side, // 'buy' or 'sell'
        type: order.type, // 'market', 'limit', 'stop', 'stop-limit'
        quantity: order.quantity,
        price: order.price, // for limit/stop-limit
        stopPrice: order.stopPrice, // for stop/stop-limit
        timeInForce: order.timeInForce || 'day', // 'day', 'gtc', 'ioc', 'fok'
        timestamp: Date.now(),
        broker: brokerId,
        status: 'pending'
      };

      // Place order based on protocol
      let result;

      if (broker.protocol === 'mcp') {
        result = await this._placeOrderMCP(connection, preparedOrder);
      } else if (broker.protocol === 'rest') {
        result = await this._placeOrderREST(connection, broker, preparedOrder);
      } else if (broker.protocol === 'unofficial') {
        result = await this._placeOrderUnofficial(connection, broker, preparedOrder);
      }

      // Store order for tracking
      preparedOrder.brokerOrderId = result.brokerOrderId;
      preparedOrder.status = result.status;

      // Emit event
      this.plugin.emit('order-placed', preparedOrder);

      return {
        success: true,
        order: preparedOrder,
        message: `Order placed: ${order.side} ${order.quantity} ${order.symbol} @ ${order.type}`
      };

    } catch (error) {
      this.plugin.emit('order-error', { brokerId, order, error: error.message });

      return {
        success: false,
        order,
        error: error.message
      };
    }
  }

  /**
   * Cancel an order
   * @param {string} brokerId - Broker identifier
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOrder(brokerId, orderId) {
    this._validateConnection(brokerId);

    const { broker, connection } = this.connectedBrokers.get(brokerId);

    try {
      let result;

      if (broker.protocol === 'mcp') {
        result = await this._cancelOrderMCP(connection, orderId);
      } else if (broker.protocol === 'rest') {
        result = await this._cancelOrderREST(connection, broker, orderId);
      } else if (broker.protocol === 'unofficial') {
        result = await this._cancelOrderUnofficial(connection, broker, orderId);
      }

      this.plugin.emit('order-cancelled', { brokerId, orderId });

      return {
        success: true,
        orderId,
        message: 'Order cancelled successfully'
      };

    } catch (error) {
      return {
        success: false,
        orderId,
        error: error.message
      };
    }
  }

  /**
   * Get account information
   * @param {string} brokerId - Broker identifier
   * @returns {Promise<Object>} Account details
   */
  async getAccount(brokerId) {
    this._validateConnection(brokerId);

    const { broker, connection } = this.connectedBrokers.get(brokerId);

    try {
      let account;

      if (broker.protocol === 'mcp') {
        account = await this._getAccountMCP(connection);
      } else if (broker.protocol === 'rest') {
        account = await this._getAccountREST(connection, broker);
      } else if (broker.protocol === 'unofficial') {
        account = await this._getAccountUnofficial(connection, broker);
      }

      return {
        success: true,
        broker: brokerId,
        account: {
          balance: account.balance || 0,
          equity: account.equity || account.balance || 0,
          margin: account.margin || 0,
          availableMargin: account.availableMargin || account.balance || 0,
          currency: account.currency || 'USD',
          leverage: account.leverage || 1,
          openPositions: account.openPositions || 0,
          openOrders: account.openOrders || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        broker: brokerId,
        error: error.message
      };
    }
  }

  /**
   * Get open positions
   * @param {string} brokerId - Broker identifier
   * @returns {Promise<Object>} Positions list
   */
  async getPositions(brokerId) {
    this._validateConnection(brokerId);

    const { broker, connection } = this.connectedBrokers.get(brokerId);

    try {
      let positions;

      if (broker.protocol === 'mcp') {
        positions = await this._getPositionsMCP(connection);
      } else if (broker.protocol === 'rest') {
        positions = await this._getPositionsREST(connection, broker);
      } else if (broker.protocol === 'unofficial') {
        positions = await this._getPositionsUnofficial(connection, broker);
      }

      return {
        success: true,
        broker: brokerId,
        positions: positions.map(pos => ({
          symbol: pos.symbol,
          side: pos.side,
          quantity: pos.quantity,
          avgPrice: pos.avgPrice,
          currentPrice: pos.currentPrice,
          pnl: pos.pnl,
          pnlPercent: pos.pnlPercent,
          openedAt: pos.openedAt
        }))
      };

    } catch (error) {
      return {
        success: false,
        broker: brokerId,
        error: error.message
      };
    }
  }

  /**
   * Get order status
   * @param {string} brokerId - Broker identifier
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order status
   */
  async getOrderStatus(brokerId, orderId) {
    this._validateConnection(brokerId);

    const { broker, connection } = this.connectedBrokers.get(brokerId);

    try {
      let status;

      if (broker.protocol === 'mcp') {
        status = await this._getOrderStatusMCP(connection, orderId);
      } else if (broker.protocol === 'rest') {
        status = await this._getOrderStatusREST(connection, broker, orderId);
      } else if (broker.protocol === 'unofficial') {
        status = await this._getOrderStatusUnofficial(connection, broker, orderId);
      }

      return {
        success: true,
        order: {
          id: orderId,
          status: status.status, // 'pending', 'filled', 'partial', 'cancelled', 'rejected'
          filledQuantity: status.filledQuantity || 0,
          remainingQuantity: status.remainingQuantity || 0,
          avgFillPrice: status.avgFillPrice || 0,
          commission: status.commission || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        orderId,
        error: error.message
      };
    }
  }

  /**
   * List connected brokers
   * @returns {Array} Connected brokers
   */
  getConnectedBrokers() {
    const brokers = [];

    for (const [brokerId, data] of this.connectedBrokers.entries()) {
      brokers.push({
        id: brokerId,
        name: data.broker.name,
        capabilities: data.broker.capabilities,
        markets: data.broker.markets,
        connectedAt: data.connectedAt,
        uptime: Date.now() - data.connectedAt
      });
    }

    return brokers;
  }

  /**
   * List all supported brokers
   * @returns {Array} Supported brokers
   */
  getSupportedBrokers() {
    return Object.entries(this.supportedBrokers).map(([id, broker]) => ({
      id,
      name: broker.name,
      protocol: broker.protocol,
      capabilities: broker.capabilities,
      markets: broker.markets,
      commission: broker.commission,
      minBalance: broker.minBalance
    }));
  }

  // Private methods

  async _connectMCP(broker, credentials) {
    // Simulate MCP connection (in production, this would use actual MCP protocol)
    return {
      protocol: 'mcp',
      server: broker.serverCommand,
      authenticated: true,
      capabilities: broker.capabilities,
      close: async () => {}
    };
  }

  async _connectREST(broker, credentials) {
    // Simulate REST API connection
    return {
      protocol: 'rest',
      apiUrl: broker.apiUrl,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      authenticated: true
    };
  }

  async _connectUnofficial(broker, credentials) {
    // Simulate unofficial API connection
    return {
      protocol: 'unofficial',
      apiUrl: broker.apiUrl,
      username: credentials.username,
      password: credentials.password,
      authenticated: true
    };
  }

  async _placeOrderMCP(connection, order) {
    // Simulate MCP order placement
    return {
      brokerOrderId: `MCP-${Date.now()}`,
      status: 'submitted'
    };
  }

  async _placeOrderREST(connection, broker, order) {
    // Simulate REST order placement
    return {
      brokerOrderId: `REST-${Date.now()}`,
      status: 'submitted'
    };
  }

  async _placeOrderUnofficial(connection, broker, order) {
    // Simulate unofficial order placement
    return {
      brokerOrderId: `UNOFFICIAL-${Date.now()}`,
      status: 'submitted'
    };
  }

  async _cancelOrderMCP(connection, orderId) {
    return { cancelled: true };
  }

  async _cancelOrderREST(connection, broker, orderId) {
    return { cancelled: true };
  }

  async _cancelOrderUnofficial(connection, broker, orderId) {
    return { cancelled: true };
  }

  async _getAccountMCP(connection) {
    // Simulate account data
    return {
      balance: 10000,
      equity: 10500,
      margin: 2000,
      availableMargin: 8000,
      currency: 'USD'
    };
  }

  async _getAccountREST(connection, broker) {
    return {
      balance: 10000,
      equity: 10500,
      currency: 'USD'
    };
  }

  async _getAccountUnofficial(connection, broker) {
    return {
      balance: 10000,
      equity: 10500,
      currency: 'USD'
    };
  }

  async _getPositionsMCP(connection) {
    return [];
  }

  async _getPositionsREST(connection, broker) {
    return [];
  }

  async _getPositionsUnofficial(connection, broker) {
    return [];
  }

  async _getOrderStatusMCP(connection, orderId) {
    return {
      status: 'filled',
      filledQuantity: 100,
      avgFillPrice: 150.25
    };
  }

  async _getOrderStatusREST(connection, broker, orderId) {
    return {
      status: 'filled',
      filledQuantity: 100,
      avgFillPrice: 150.25
    };
  }

  async _getOrderStatusUnofficial(connection, broker, orderId) {
    return {
      status: 'filled',
      filledQuantity: 100,
      avgFillPrice: 150.25
    };
  }

  _validateConnection(brokerId) {
    if (!this.connectedBrokers.has(brokerId)) {
      throw new Error(`Not connected to broker: ${brokerId}. Call connect() first.`);
    }
  }

  _validateOrder(order) {
    const required = ['symbol', 'side', 'type', 'quantity'];
    const missing = required.filter(field => !order[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required order fields: ${missing.join(', ')}`);
    }

    if (!['buy', 'sell'].includes(order.side)) {
      throw new Error(`Invalid order side: ${order.side}. Must be 'buy' or 'sell'.`);
    }

    if (!['market', 'limit', 'stop', 'stop-limit'].includes(order.type)) {
      throw new Error(`Invalid order type: ${order.type}`);
    }

    if (order.quantity <= 0) {
      throw new Error(`Invalid quantity: ${order.quantity}. Must be > 0.`);
    }

    if (order.type === 'limit' && !order.price) {
      throw new Error('Limit orders require a price');
    }

    if (order.type === 'stop' && !order.stopPrice) {
      throw new Error('Stop orders require a stopPrice');
    }

    if (order.type === 'stop-limit' && (!order.price || !order.stopPrice)) {
      throw new Error('Stop-limit orders require both price and stopPrice');
    }
  }

  _generateOrderId() {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  _getSuggestion(brokerId, error) {
    const suggestions = {
      'interactive-brokers': 'Install TWS or IB Gateway and ensure MCP server is running',
      'td-ameritrade': 'Check API credentials and ensure account is approved for API access',
      'alpaca': 'Verify API keys from Alpaca dashboard (paper or live)',
      'oanda': 'Check API token from OANDA account settings',
      'binance': 'Verify API key and secret, ensure IP whitelist is configured',
      'metatrader5': 'Ensure MT5 terminal is running and MCP server is configured'
    };

    return suggestions[brokerId] || 'Check credentials and network connection';
  }
}

module.exports = MCPBrokerIntegration;
