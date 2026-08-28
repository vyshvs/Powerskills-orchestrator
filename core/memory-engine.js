/**
 * PowerSkills Memory Engine
 * Handles memory read/write operations with full session recording
 * Platform-agnostic design for OpenAI, Claude, and Antigravity
 */

class MemoryEngine {
  constructor(config = {}) {
    this.memoryStore = new Map();
    this.sessionLog = [];
    this.config = {
      persistencePath: config.persistencePath || './memory',
      maxMemorySize: config.maxMemorySize || 100000000, // 100MB
      compressionEnabled: config.compressionEnabled || true,
      encryptionEnabled: config.encryptionEnabled || false,
      ...config
    };
    this.eventEmitter = new EventEmitter();
    this.initializeMemoryStore();
  }

  async initializeMemoryStore() {
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
    this.log('INIT', 'Memory Engine initialized', { sessionId: this.sessionId });
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(type, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type,
      message,
      metadata
    };
    this.sessionLog.push(logEntry);
    this.eventEmitter.emit('log', logEntry);
    return logEntry;
  }

  async write(key, value, options = {}) {
    try {
      const entry = {
        key,
        value,
        timestamp: Date.now(),
        metadata: {
          type: options.type || 'general',
          tags: options.tags || [],
          ttl: options.ttl || null,
          version: options.version || 1
        }
      };

      // Apply compression if enabled
      if (this.config.compressionEnabled && typeof value === 'string') {
        entry.compressed = true;
        entry.value = this.compress(value);
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled) {
        entry.encrypted = true;
        entry.value = await this.encrypt(entry.value);
      }

      this.memoryStore.set(key, entry);
      this.log('WRITE', `Memory written: ${key}`, { size: JSON.stringify(value).length });

      // Persist to disk
      await this.persist(key, entry);

      return { success: true, key, timestamp: entry.timestamp };
    } catch (error) {
      this.log('ERROR', `Failed to write memory: ${key}`, { error: error.message });
      throw error;
    }
  }

  async read(key, options = {}) {
    try {
      let entry = this.memoryStore.get(key);

      // If not in memory, try loading from disk
      if (!entry && this.config.persistencePath) {
        entry = await this.loadFromDisk(key);
      }

      if (!entry) {
        this.log('READ', `Memory not found: ${key}`);
        return null;
      }

      // Check TTL
      if (entry.metadata.ttl && Date.now() > entry.timestamp + entry.metadata.ttl) {
        this.log('READ', `Memory expired: ${key}`);
        await this.delete(key);
        return null;
      }

      let value = entry.value;

      // Decrypt if needed
      if (entry.encrypted) {
        value = await this.decrypt(value);
      }

      // Decompress if needed
      if (entry.compressed) {
        value = this.decompress(value);
      }

      this.log('READ', `Memory read: ${key}`);

      return {
        key,
        value,
        timestamp: entry.timestamp,
        metadata: entry.metadata
      };
    } catch (error) {
      this.log('ERROR', `Failed to read memory: ${key}`, { error: error.message });
      throw error;
    }
  }

  async delete(key) {
    const deleted = this.memoryStore.delete(key);
    if (deleted) {
      this.log('DELETE', `Memory deleted: ${key}`);
      await this.removeFromDisk(key);
    }
    return deleted;
  }

  async search(query, options = {}) {
    const results = [];
    const searchType = options.type || 'fuzzy';

    for (const [key, entry] of this.memoryStore.entries()) {
      let match = false;

      if (searchType === 'fuzzy') {
        match = key.toLowerCase().includes(query.toLowerCase());
      } else if (searchType === 'exact') {
        match = key === query;
      } else if (searchType === 'regex') {
        const regex = new RegExp(query, 'i');
        match = regex.test(key);
      } else if (searchType === 'tags') {
        match = entry.metadata.tags.some(tag => tag.includes(query));
      }

      if (match) {
        results.push({
          key,
          timestamp: entry.timestamp,
          metadata: entry.metadata
        });
      }
    }

    this.log('SEARCH', `Search completed: "${query}"`, { resultsCount: results.length });
    return results;
  }

  async clear(filter = {}) {
    if (Object.keys(filter).length === 0) {
      // Clear all
      const count = this.memoryStore.size;
      this.memoryStore.clear();
      this.log('CLEAR', 'All memory cleared', { count });
      return count;
    }

    // Clear with filter
    let count = 0;
    for (const [key, entry] of this.memoryStore.entries()) {
      if (this.matchesFilter(entry, filter)) {
        await this.delete(key);
        count++;
      }
    }
    return count;
  }

  matchesFilter(entry, filter) {
    if (filter.type && entry.metadata.type !== filter.type) return false;
    if (filter.tags && !filter.tags.every(tag => entry.metadata.tags.includes(tag))) return false;
    if (filter.olderThan && entry.timestamp > Date.now() - filter.olderThan) return false;
    return true;
  }

  getStats() {
    const stats = {
      sessionId: this.sessionId,
      uptime: Date.now() - this.startTime,
      memoryCount: this.memoryStore.size,
      totalLogs: this.sessionLog.length,
      memorySize: this.calculateMemorySize(),
      config: this.config
    };
    this.log('STATS', 'Statistics retrieved', stats);
    return stats;
  }

  calculateMemorySize() {
    let size = 0;
    for (const entry of this.memoryStore.values()) {
      size += JSON.stringify(entry).length;
    }
    return size;
  }

  async persist(key, entry) {
    // This would write to actual file system in production
    // For now, it's a placeholder for the persistence logic
    return true;
  }

  async loadFromDisk(key) {
    // Placeholder for loading from disk
    return null;
  }

  async removeFromDisk(key) {
    // Placeholder for removing from disk
    return true;
  }

  compress(data) {
    // Simple compression placeholder - in production use zlib or similar
    return data;
  }

  decompress(data) {
    // Simple decompression placeholder
    return data;
  }

  async encrypt(data) {
    // Encryption placeholder - in production use crypto module
    return data;
  }

  async decrypt(data) {
    // Decryption placeholder
    return data;
  }

  exportSession() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      logs: this.sessionLog,
      memory: Array.from(this.memoryStore.entries()),
      stats: this.getStats()
    };
  }

  async importSession(sessionData) {
    this.sessionId = sessionData.sessionId;
    this.startTime = sessionData.startTime;
    this.sessionLog = sessionData.logs || [];
    this.memoryStore = new Map(sessionData.memory || []);
    this.log('IMPORT', 'Session imported', { sessionId: sessionData.sessionId });
  }
}

// Simple EventEmitter implementation
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(data));
    }
  }
}

module.exports = MemoryEngine;
