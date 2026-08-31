import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { EnhancedMemoryManager } from './enhanced-memory-manager.js';

const TEST_MEMORY_DIR = '.memory/test-enhanced-memory';

describe('EnhancedMemoryManager', () => {
  let manager;

  beforeEach(async () => {
    // Clean up test directory
    if (existsSync(TEST_MEMORY_DIR)) {
      await rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
    await mkdir(TEST_MEMORY_DIR, { recursive: true });

    manager = new EnhancedMemoryManager({
      memoryDir: TEST_MEMORY_DIR,
      enableVersioning: true,
      enableIndexing: true,
      maxVersions: 5
    });

    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync(TEST_MEMORY_DIR)) {
      await rm(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
  });

  it('should initialize memory directories', async () => {
    assert.strictEqual(existsSync(TEST_MEMORY_DIR), true);
    assert.strictEqual(existsSync(`${TEST_MEMORY_DIR}/entries`), true);
    assert.strictEqual(existsSync(`${TEST_MEMORY_DIR}/versions`), true);
    assert.strictEqual(existsSync(`${TEST_MEMORY_DIR}/indexes`), true);
    assert.strictEqual(existsSync(`${TEST_MEMORY_DIR}/audit`), true);
  });

  it('should write and read a memory entry', async () => {
    const data = { message: 'Hello World', count: 42 };
    const metadata = { author: 'test', tags: ['demo'] };

    await manager.write('test-key', data, metadata);

    const entry = await manager.read('test-key');

    assert.strictEqual(entry.key, 'test-key');
    assert.deepStrictEqual(entry.data, data);
    assert.strictEqual(entry.metadata.author, 'test');
    assert.strictEqual(entry.checksum !== undefined, true);
  });

  it('should return null for non-existent key', async () => {
    const entry = await manager.read('non-existent');
    assert.strictEqual(entry, null);
  });

  it('should update an existing entry', async () => {
    await manager.write('test-key', { value: 1 });

    await manager.update('test-key', { value: 2, extra: 'data' });

    const entry = await manager.read('test-key');

    assert.strictEqual(entry.data.value, 2);
    assert.strictEqual(entry.data.extra, 'data');
    assert.strictEqual(entry.metadata.version, 2);
  });

  it('should throw error when updating non-existent entry', async () => {
    await assert.rejects(
      async () => manager.update('non-existent', {}),
      /Memory entry not found/
    );
  });

  it('should delete an entry', async () => {
    await manager.write('test-key', { value: 1 });

    const deleted = await manager.delete('test-key');

    assert.strictEqual(deleted, true);

    const entry = await manager.read('test-key');
    assert.strictEqual(entry, null);
  });

  it('should return false when deleting non-existent entry', async () => {
    const deleted = await manager.delete('non-existent');
    assert.strictEqual(deleted, false);
  });

  it('should list all entries', async () => {
    await manager.write('key1', { value: 1 });
    await manager.write('key2', { value: 2 });
    await manager.write('key3', { value: 3 });

    const entries = await manager.list();

    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries.some(e => e.key === 'key1'), true);
    assert.strictEqual(entries.some(e => e.key === 'key2'), true);
    assert.strictEqual(entries.some(e => e.key === 'key3'), true);
  });

  it('should filter entries by metadata', async () => {
    await manager.write('key1', { value: 1 }, { type: 'A' });
    await manager.write('key2', { value: 2 }, { type: 'B' });
    await manager.write('key3', { value: 3 }, { type: 'A' });

    const filtered = await manager.list({ type: 'A' });

    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered.every(e => e.metadata.type === 'A'), true);
  });

  it('should search entries', async () => {
    await manager.write('user-profile', { name: 'Alice' }, { tags: ['user'] });
    await manager.write('user-settings', { theme: 'dark' }, { tags: ['user'] });
    await manager.write('system-config', { debug: true }, { tags: ['system'] });

    const results = await manager.search('user');

    assert.strictEqual(results.length >= 2, true);
    assert.strictEqual(results.some(r => r.key === 'user-profile'), true);
  });

  it('should maintain version history', async () => {
    await manager.write('versioned-key', { value: 1 });
    await manager.write('versioned-key', { value: 2 });
    await manager.write('versioned-key', { value: 3 });

    const history = await manager.getVersionHistory('versioned-key');

    assert.strictEqual(history.length >= 2, true);
    assert.strictEqual(history[0].metadata.version > history[history.length - 1].metadata.version, true);
  });

  it('should restore a previous version', async () => {
    await manager.write('versioned-key', { value: 1 });
    await manager.write('versioned-key', { value: 2 });
    await manager.write('versioned-key', { value: 3 });

    await manager.restoreVersion('versioned-key', 1);

    const entry = await manager.read('versioned-key');

    assert.strictEqual(entry.data.value, 1);
    assert.strictEqual(entry.metadata.restoredFrom, 1);
  });

  it('should throw error when restoring non-existent version', async () => {
    await manager.write('test-key', { value: 1 });

    await assert.rejects(
      async () => manager.restoreVersion('test-key', 999),
      /Version 999 not found/
    );
  });

  it('should limit version history', async () => {
    const manager = new EnhancedMemoryManager({
      memoryDir: TEST_MEMORY_DIR,
      maxVersions: 3
    });
    await manager.initialize();

    // Write more versions than max
    for (let i = 1; i <= 10; i++) {
      await manager.write('test-key', { value: i });
    }

    const history = await manager.getVersionHistory('test-key');

    assert.strictEqual(history.length <= 3, true);
  });

  it('should maintain audit trail', async () => {
    await manager.write('test-key', { value: 1 });
    await manager.read('test-key');
    await manager.update('test-key', { value: 2 });
    await manager.delete('test-key');

    const trail = await manager.getAuditTrail('test-key');

    assert.strictEqual(trail.length >= 4, true);
    assert.strictEqual(trail.some(e => e.action === 'WRITE'), true);
    assert.strictEqual(trail.some(e => e.action === 'READ'), true);
    assert.strictEqual(trail.some(e => e.action === 'DELETE'), true);
  });

  it('should verify checksums', async () => {
    const data = { message: 'Test data' };
    await manager.write('test-key', data);

    const entry = await manager.read('test-key');

    const expectedChecksum = manager.generateChecksum(data);
    assert.strictEqual(entry.checksum, expectedChecksum);
  });

  it('should get memory statistics', async () => {
    await manager.write('key1', { value: 1 });
    await manager.write('key2', { value: 2 });

    const stats = await manager.getStatistics();

    assert.strictEqual(stats.totalEntries, 2);
    assert.strictEqual(stats.totalSize > 0, true);
    assert.strictEqual(stats.versioningEnabled, true);
    assert.strictEqual(stats.indexingEnabled, true);
  });

  it('should export memory to file', async () => {
    await manager.write('key1', { value: 1 }, { tag: 'test' });
    await manager.write('key2', { value: 2 }, { tag: 'test' });

    const exportPath = `${TEST_MEMORY_DIR}/export.json`;
    const exported = await manager.exportToFile(exportPath);

    assert.strictEqual(exported.entries.length, 2);
    assert.strictEqual(existsSync(exportPath), true);
  });

  it('should import memory from file', async () => {
    // Create export
    await manager.write('key1', { value: 1 });
    await manager.write('key2', { value: 2 });

    const exportPath = `${TEST_MEMORY_DIR}/export.json`;
    await manager.exportToFile(exportPath);

    // Clear memory
    await manager.clearAll(true);

    // Import
    const imported = await manager.importFromFile(exportPath);

    assert.strictEqual(imported.length, 2);

    const entry = await manager.read('key1');
    assert.strictEqual(entry.data.value, 1);
  });

  it('should rebuild index', async () => {
    await manager.write('key1', { value: 1 });
    await manager.write('key2', { value: 2 });

    const index = await manager.rebuildIndex();

    assert.strictEqual(Object.keys(index).length, 2);
    assert.strictEqual(index.key1 !== undefined, true);
    assert.strictEqual(index.key2 !== undefined, true);
  });

  it('should clear all memory with confirmation', async () => {
    await manager.write('key1', { value: 1 });
    await manager.write('key2', { value: 2 });

    const cleared = await manager.clearAll(true);

    assert.strictEqual(cleared, 2);

    const entries = await manager.list();
    assert.strictEqual(entries.length, 0);
  });

  it('should throw error when clearing without confirmation', async () => {
    await assert.rejects(
      async () => manager.clearAll(false),
      /Must confirm to clear all memory/
    );
  });
});

console.log('🧪 Running enhanced memory manager tests...\n');
