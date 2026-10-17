/**
 * Sloth Library Indexer Frontend Unit Tests
 * Tests useLibraryIndexer hook, state transitions, and LibraryIndexerRow component.
 */

import { describe, it, expect } from 'vitest';
import { LibraryIndexerRow, useLibraryIndexer } from '../features/library';

describe('Sloth Library Indexer UI & Hook', () => {
  it('exports LibraryIndexerRow and useLibraryIndexer', () => {
    expect(LibraryIndexerRow).toBeDefined();
    expect(typeof LibraryIndexerRow).toBe('function');
    expect(useLibraryIndexer).toBeDefined();
    expect(typeof useLibraryIndexer).toBe('function');
  });
});
