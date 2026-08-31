import { readFile, writeFile, appendFile, mkdir, readdir, stat, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Enhanced Memory Manager with structured storage and versioning
 */
class EnhancedMemoryManager {
  constructor(config = {}) {
    this.memoryDir = config.memoryDir || '.memory';
    this.maxVersions = config.maxVersions || 10;
    this.enableVersioning = config.enableVersioning !== false;
    this.enableIndexing = config.enableIndexing !== false;
    this.compressionEnabled = config.compressionEnabled || false;
  }

  /**
   * Initialize memory system
   */
  async initialize() {
    await this.ensureDirectory(this.memoryDir);

    const subdirs = [
      'entries',      // Individual memory entries
      'versions',     // Version history
      'indexes',      // Search indexes
      'sessions',     // Session data
      'audit',        // Audit trail
      'temp'          // Temporary files
    ];

    for (const subdir of subdirs) {
      await this.ensureDirectory(path.join(this.memoryDir, subdir));
    }

    // Load or create index
    if (this.enableIndexing) {
      await this.loadIndex();
    }
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Write a memory entry
   */
  async write(key, data, metadata = {}) {
    await this.ensureDirectory(this.memoryDir);

    // Check if entry already exists to determine version
    const existing = await this.read(key);
    const version = existing ? (existing.metadata.version || 1) + 1 : (metadata.version || 1);

    const entry = {
      key,
      data,
      metadata: {
        ...metadata,
        createdAt: existing ? existing.metadata.createdAt : (metadata.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString(),
        version
      },
      checksum: this.generateChecksum(data)
    };

    // Store previous version if versioning enabled and entry exists
    if (this.enableVersioning && existing) {
      await this.archiveVersion(key, existing);
    }

    // Write entry
    const entryPath = this.getEntryPath(key);
    await writeFile(entryPath, JSON.stringify(entry, null, 2), 'utf8');

    // Update index
    if (this.enableIndexing) {
      await this.updateIndex(key, entry);
    }

    // Write audit log
    await this.writeAuditLog('WRITE', key, entry.metadata);

    return entry;
  }

  /**
   * Read a memory entry
   */
  async read(key) {
    const entryPath = this.getEntryPath(key);

    if (!existsSync(entryPath)) {
      return null;
    }

    const content = await readFile(entryPath, 'utf8');
    const entry = JSON.parse(content);

    // Verify checksum
    if (entry.checksum) {
      const currentChecksum = this.generateChecksum(entry.data);
      if (currentChecksum !== entry.checksum) {
        console.warn(`⚠️  Checksum mismatch for ${key} - data may be corrupted`);
      }
    }

    // Write audit log
    await this.writeAuditLog('READ', key, entry.metadata);

    return entry;
  }

  /**
   * Update an existing memory entry
   */
  async update(key, data, metadata = {}) {
    const existing = await this.read(key);

    if (!existing) {
      throw new Error(`Memory entry not found: ${key}`);
    }

    const updatedEntry = {
      key,
      data: { ...existing.data, ...data },
      metadata: {
        ...existing.metadata,
        ...metadata,
        updatedAt: new Date().toISOString(),
        version: (existing.metadata.version || 1) + 1
      },
      checksum: this.generateChecksum({ ...existing.data, ...data })
    };

    return await this.write(key, updatedEntry.data, updatedEntry.metadata);
  }

  /**
   * Delete a memory entry
   */
  async delete(key) {
    const entryPath = this.getEntryPath(key);

    if (!existsSync(entryPath)) {
      return false;
    }

    // Archive before deleting if versioning enabled
    if (this.enableVersioning) {
      const entry = await this.read(key);
      await this.archiveVersion(key, { ...entry, deleted: true });
    }

    await rm(entryPath, { force: true });

    // Update index
    if (this.enableIndexing) {
      await this.removeFromIndex(key);
    }

    // Write audit log
    await this.writeAuditLog('DELETE', key, {});

    return true;
  }

  /**
   * Search memory entries
   */
  async search(query) {
    if (!this.enableIndexing) {
      throw new Error('Indexing is not enabled');
    }

    const index = await this.loadIndex();
    const results = [];

    for (const [key, indexEntry] of Object.entries(index)) {
      // Simple text search in key and metadata
      const searchText = JSON.stringify({
        key,
        ...indexEntry.metadata
      }).toLowerCase();

      if (searchText.includes(query.toLowerCase())) {
        results.push({
          key,
          ...indexEntry,
          entry: await this.read(key)
        });
      }
    }

    return results;
  }

  /**
   * List all memory entries
   */
  async list(filter = {}) {
    const entriesDir = path.join(this.memoryDir, 'entries');

    if (!existsSync(entriesDir)) {
      return [];
    }

    const files = await readdir(entriesDir);
    const entries = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const key = file.replace('.json', '');
        const entry = await this.read(key);

        if (entry && this.matchesFilter(entry, filter)) {
          entries.push({ key, ...entry });
        }
      }
    }

    return entries;
  }

  /**
   * Check if entry matches filter
   */
  matchesFilter(entry, filter) {
    if (Object.keys(filter).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (entry.metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get entry version history
   */
  async getVersionHistory(key) {
    if (!this.enableVersioning) {
      return [];
    }

    const versionsDir = path.join(this.memoryDir, 'versions', key);

    if (!existsSync(versionsDir)) {
      return [];
    }

    const files = await readdir(versionsDir);
    const versions = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const versionPath = path.join(versionsDir, file);
        const content = await readFile(versionPath, 'utf8');
        versions.push(JSON.parse(content));
      }
    }

    // Sort by version number
    versions.sort((a, b) => (b.metadata.version || 0) - (a.metadata.version || 0));

    return versions;
  }

  /**
   * Restore a specific version
   */
  async restoreVersion(key, version) {
    const history = await this.getVersionHistory(key);
    const versionEntry = history.find(v => v.metadata.version === version);

    if (!versionEntry) {
      throw new Error(`Version ${version} not found for ${key}`);
    }

    return await this.write(key, versionEntry.data, {
      ...versionEntry.metadata,
      restoredFrom: version,
      restoredAt: new Date().toISOString()
    });
  }

  /**
   * Archive a version
   */
  async archiveVersion(key, entry) {
    const versionsDir = path.join(this.memoryDir, 'versions', key);
    await this.ensureDirectory(versionsDir);

    // Check existing versions
    const versions = await this.getVersionHistory(key);

    if (versions.length >= this.maxVersions) {
      // Remove oldest version
      const oldest = versions[versions.length - 1];
      const oldestPath = path.join(
        versionsDir,
        `v${oldest.metadata.version}.json`
      );
      if (existsSync(oldestPath)) {
        await rm(oldestPath, { force: true });
      }
    }

    // Save new version
    const versionPath = path.join(
      versionsDir,
      `v${entry.metadata.version}.json`
    );
    await writeFile(versionPath, JSON.stringify(entry, null, 2), 'utf8');
  }

  /**
   * Load search index
   */
  async loadIndex() {
    const indexPath = path.join(this.memoryDir, 'indexes', 'main.json');

    if (!existsSync(indexPath)) {
      return {};
    }

    const content = await readFile(indexPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Update search index
   */
  async updateIndex(key, entry) {
    const index = await this.loadIndex();

    index[key] = {
      metadata: entry.metadata,
      checksum: entry.checksum,
      lastIndexed: new Date().toISOString()
    };

    const indexPath = path.join(this.memoryDir, 'indexes', 'main.json');
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * Remove from index
   */
  async removeFromIndex(key) {
    const index = await this.loadIndex();
    delete index[key];

    const indexPath = path.join(this.memoryDir, 'indexes', 'main.json');
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * Rebuild index from all entries
   */
  async rebuildIndex() {
    const entries = await this.list();
    const index = {};

    for (const entry of entries) {
      index[entry.key] = {
        metadata: entry.metadata,
        checksum: entry.checksum,
        lastIndexed: new Date().toISOString()
      };
    }

    const indexPath = path.join(this.memoryDir, 'indexes', 'main.json');
    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

    return index;
  }

  /**
   * Write audit log
   */
  async writeAuditLog(action, key, metadata) {
    const auditDir = path.join(this.memoryDir, 'audit');
    await this.ensureDirectory(auditDir);

    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      key,
      metadata
    };

    const logPath = path.join(auditDir, 'audit.jsonl');
    await appendFile(logPath, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Get audit trail for a key
   */
  async getAuditTrail(key) {
    const logPath = path.join(this.memoryDir, 'audit', 'audit.jsonl');

    if (!existsSync(logPath)) {
      return [];
    }

    const content = await readFile(logPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());

    const entries = lines
      .map(line => JSON.parse(line))
      .filter(entry => entry.key === key);

    return entries;
  }

  /**
   * Generate checksum for data integrity
   */
  generateChecksum(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Get entry path
   */
  getEntryPath(key) {
    // Sanitize key for filesystem
    const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.memoryDir, 'entries', `${sanitized}.json`);
  }

  /**
   * Get memory statistics
   */
  async getStatistics() {
    const entries = await this.list();
    const auditPath = path.join(this.memoryDir, 'audit', 'audit.jsonl');

    let totalSize = 0;
    let auditSize = 0;

    for (const entry of entries) {
      const entryPath = this.getEntryPath(entry.key);
      if (existsSync(entryPath)) {
        const stats = await stat(entryPath);
        totalSize += stats.size;
      }
    }

    if (existsSync(auditPath)) {
      const stats = await stat(auditPath);
      auditSize = stats.size;
    }

    return {
      totalEntries: entries.length,
      totalSize,
      auditSize,
      memoryDir: this.memoryDir,
      versioningEnabled: this.enableVersioning,
      indexingEnabled: this.enableIndexing
    };
  }

  /**
   * Export all memory to a single file
   */
  async exportToFile(outputPath) {
    const entries = await this.list();
    const exportData = {
      timestamp: new Date().toISOString(),
      entries: entries.map(e => ({
        key: e.key,
        data: e.data,
        metadata: e.metadata
      }))
    };

    await writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    return exportData;
  }

  /**
   * Import memory from a file
   */
  async importFromFile(inputPath) {
    const content = await readFile(inputPath, 'utf8');
    const importData = JSON.parse(content);

    const imported = [];

    for (const entry of importData.entries) {
      await this.write(entry.key, entry.data, entry.metadata);
      imported.push(entry.key);
    }

    return imported;
  }

  /**
   * Clear all memory (with confirmation)
   */
  async clearAll(confirm = false) {
    if (!confirm) {
      throw new Error('Must confirm to clear all memory');
    }

    const entries = await this.list();

    for (const entry of entries) {
      await this.delete(entry.key);
    }

    return entries.length;
  }
}

export { EnhancedMemoryManager };
