import { GraphNode, ResolutionMatchType } from './types.js';

/**
 * Calculates string similarity using normalized Levenshtein distance (0.0 to 1.0).
 */
export function calculateStringSimilarity(s1: string, s2: string): number {
  const str1 = s1.trim().toLowerCase();
  const str2 = s2.trim().toLowerCase();

  if (str1 === str2) return 1.0;
  if (!str1.length || !str2.length) return 0.0;

  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[m][n];
  const maxLength = Math.max(m, n);
  return 1 - distance / maxLength;
}

/**
 * Checks for nickname or initials matching:
 * e.g., "Rahul Kumar" vs "R. Kumar" or "rahul.k" or "rahulkumar"
 */
export function checkPartialNameMatch(nameA: string, nameB: string): boolean {
  const normA = nameA.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/);
  const normB = nameB.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/);

  if (normA.length >= 2 && normB.length >= 2) {
    const firstA = normA[0];
    const lastA = normA[normA.length - 1];
    const firstB = normB[0];
    const lastB = normB[normB.length - 1];

    // Same last name and matching first initial
    if (lastA === lastB && firstA[0] === firstB[0]) {
      return true;
    }
  }

  // Account username vs full name: e.g. "rahulk" in "rahul kumar"
  const cleanA = nameA.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanB = nameB.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanA.length > 4 && cleanB.length > 4) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return true;
    }
  }

  return false;
}

export interface ResolutionComparison {
  matchType: ResolutionMatchType;
  similarityScore: number;
  reason: string;
}

/**
 * Compares two candidate entity nodes to evaluate identity equivalence.
 */
export function evaluateEntitySimilarity(nodeA: GraphNode, nodeB: GraphNode): ResolutionComparison {
  // Only compare entities of compatible or same type
  if (nodeA.category !== 'ENTITY' || nodeB.category !== 'ENTITY') {
    return { matchType: 'NO_MATCH', similarityScore: 0, reason: 'Only entity nodes are subject to resolution.' };
  }

  if (nodeA.id === nodeB.id) {
    return { matchType: 'EXACT_MATCH', similarityScore: 1.0, reason: 'Identical node ID.' };
  }

  // Check external identifiers if present
  const extIdsA = (nodeA.properties?.externalIdentifiers as string[]) || [];
  const extIdsB = (nodeB.properties?.externalIdentifiers as string[]) || [];
  const commonExtId = extIdsA.find(id => extIdsB.includes(id));

  if (commonExtId) {
    return {
      matchType: 'EXACT_MATCH',
      similarityScore: 1.0,
      reason: `Shared external identifier '${commonExtId}'.`
    };
  }

  // Check exact label match (same entity type)
  if (nodeA.type === nodeB.type && nodeA.label.trim().toLowerCase() === nodeB.label.trim().toLowerCase()) {
    return {
      matchType: 'EXACT_MATCH',
      similarityScore: 1.0,
      reason: `Exact label match for entity type '${nodeA.type}'.`
    };
  }

  // If different entity types and no shared external identifier, NO_MATCH
  if (nodeA.type !== nodeB.type) {
    // Check if Account relates to Person by username/label similarity
    if (
      (nodeA.type === 'PERSON' && nodeB.type === 'ACCOUNT') ||
      (nodeA.type === 'ACCOUNT' && nodeB.type === 'PERSON')
    ) {
      if (checkPartialNameMatch(nodeA.label, nodeB.label)) {
        return {
          matchType: 'POSSIBLE_MATCH',
          similarityScore: 0.8,
          reason: `Potential Account-to-Person correlation between '${nodeA.label}' and '${nodeB.label}'.`
        };
      }
    }
    return { matchType: 'NO_MATCH', similarityScore: 0, reason: 'Different entity types.' };
  }

  // Same entity type: calculate string similarity
  const sim = calculateStringSimilarity(nodeA.label, nodeB.label);

  if (sim >= 0.92) {
    return {
      matchType: 'EXACT_MATCH',
      similarityScore: sim,
      reason: `Near-identical label similarity (${Math.round(sim * 100)}%).`
    };
  }

  if (sim >= 0.70 || checkPartialNameMatch(nodeA.label, nodeB.label)) {
    return {
      matchType: 'POSSIBLE_MATCH',
      similarityScore: Math.max(sim, 0.75),
      reason: `Possible duplicate identity between '${nodeA.label}' and '${nodeB.label}' (${Math.round(
        Math.max(sim, 0.75) * 100
      )}% match). Requires human investigator review.`
    };
  }

  return { matchType: 'NO_MATCH', similarityScore: sim, reason: 'Below similarity threshold.' };
}
