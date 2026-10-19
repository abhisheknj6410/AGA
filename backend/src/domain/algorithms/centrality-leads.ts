import { GraphNode, GraphEdge } from '../types.js';
import { PageRankAlgorithm } from './pagerank.js';
import { CommunityDetectionAlgorithm } from './community-detection.js';

export interface AdvancedLead {
  type: 'HIDDEN_INFLUENCER' | 'DISJOINT_CELL' | 'STRUCTURAL_HOLE';
  targetNodeIds: string[];
  description: string;
  priority: 'HIGH' | 'CRITICAL';
}

export class AdvancedLeadGenerator {
  static generateLeads(nodes: GraphNode[], edges: GraphEdge[]): AdvancedLead[] {
    const leads: AdvancedLead[] = [];

    if (nodes.length === 0) return leads;

    // 1. PageRank for Hidden Influencers
    const prResults = PageRankAlgorithm.calculate(nodes, edges);
    if (prResults.length > 0) {
      const topNode = prResults[0];
      // Only flag if score is significant (e.g. much higher than average)
      const avgScore = 1 / nodes.length;
      // With damping, absolute score might be lower. Check relative difference.
      if (prResults.length > 1 && topNode.score > prResults[1].score * 2) {
        leads.push({
          type: 'HIDDEN_INFLUENCER',
          targetNodeIds: [topNode.nodeId],
          description: `Node ${topNode.nodeId} acts as a covert coordinator/hub with a disproportionately high influence score.`,
          priority: 'CRITICAL'
        });
      }
    }

    // 2. Community Detection for Disjoint Cells
    const communities = CommunityDetectionAlgorithm.findWeaklyConnectedComponents(nodes, edges);
    if (communities.length > 1) {
      // Find small isolated components
      for (const community of communities) {
        if (community.nodeIds.length > 1 && community.nodeIds.length < nodes.length) {
          leads.push({
            type: 'DISJOINT_CELL',
            targetNodeIds: community.nodeIds,
            description: `A seemingly isolated sub-network of ${community.nodeIds.length} entities was detected. This may represent a disjoint operating cell or burner phone network.`,
            priority: 'HIGH'
          });
        }
      }
    }

    return leads;
  }
}
