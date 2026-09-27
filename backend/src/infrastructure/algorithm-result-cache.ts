import { GraphDelta, AffectedSubgraph } from '../domain/incremental-types.js';

export interface AlgorithmCacheEntry {
  key: string;
  algorithm: string;
  graphVersion: number;
  dependentNodes: Set<string>;
  dependentEdges: Set<string>;
  dependentEvidence: Set<string>;
  result: any;
  createdAt: string;
}

export class AlgorithmResultCache {
  private cache = new Map<string, AlgorithmCacheEntry>();
  private reusedCount = 0;
  private invalidatedCount = 0;
  private recomputedCount = 0;

  generateKey(algorithm: string, graphVersion: number, params: Record<string, any> = {}): string {
    const pStr = Object.keys(params).sort().map(k => `${k}:${JSON.stringify(params[k])}`).join('|');
    return `${algorithm}@v${graphVersion}[${pStr}]`;
  }

  get(algorithm: string, graphVersion: number, params: Record<string, any> = {}): any | null {
    const key = this.generateKey(algorithm, graphVersion, params);
    const entry = this.cache.get(key);
    if (entry) {
      this.reusedCount++;
      return entry.result;
    }
    return null;
  }

  set(
    algorithm: string,
    graphVersion: number,
    params: Record<string, any>,
    result: any,
    dependencies: {
      nodes?: string[];
      edges?: string[];
      evidence?: string[];
    } = {}
  ): void {
    const key = this.generateKey(algorithm, graphVersion, params);
    this.cache.set(key, {
      key,
      algorithm,
      graphVersion,
      dependentNodes: new Set(dependencies.nodes || []),
      dependentEdges: new Set(dependencies.edges || []),
      dependentEvidence: new Set(dependencies.evidence || []),
      result,
      createdAt: new Date().toISOString()
    });
    this.recomputedCount++;
  }

  /**
   * Invalidates cache entries whose dependent nodes, edges, or evidence intersect the affected subgraph.
   * Unaffected entries are retained and recorded as reused.
   */
  invalidateAffected(
    delta: GraphDelta,
    affectedSubgraph: AffectedSubgraph
  ): { invalidated: string[]; reused: string[] } {
    const affectedNodeSet = new Set(affectedSubgraph.affectedNodeIds);
    const affectedEdgeSet = new Set(affectedSubgraph.affectedEdgeIds);
    const affectedEvSet = new Set(affectedSubgraph.affectedEvidenceIds);

    const invalidated: string[] = [];
    const reused: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      let isAffected = false;

      for (const n of entry.dependentNodes) {
        if (affectedNodeSet.has(n)) {
          isAffected = true;
          break;
        }
      }
      if (!isAffected) {
        for (const e of entry.dependentEdges) {
          if (affectedEdgeSet.has(e)) {
            isAffected = true;
            break;
          }
        }
      }
      if (!isAffected) {
        for (const ev of entry.dependentEvidence) {
          if (affectedEvSet.has(ev)) {
            isAffected = true;
            break;
          }
        }
      }

      if (isAffected) {
        this.cache.delete(key);
        invalidated.push(entry.algorithm);
        this.invalidatedCount++;
      } else {
        reused.push(entry.algorithm);
      }
    }

    return {
      invalidated: Array.from(new Set(invalidated)),
      reused: Array.from(new Set(reused))
    };
  }

  getMetrics(): { reusedCount: number; invalidatedCount: number; recomputedCount: number; totalEntries: number } {
    return {
      reusedCount: this.reusedCount,
      invalidatedCount: this.invalidatedCount,
      recomputedCount: this.recomputedCount,
      totalEntries: this.cache.size
    };
  }

  getStats(): { hits: number; misses: number; total: number } {
    return {
      hits: this.reusedCount,
      misses: this.recomputedCount,
      total: this.cache.size
    };
  }

  resetMetrics(): void {
    this.reusedCount = 0;
    this.invalidatedCount = 0;
    this.recomputedCount = 0;
  }

  clear(): void {
    this.cache.clear();
    this.resetMetrics();
  }
}
