import { GraphNode, GraphEdge } from '../types.js';

export interface AttackStage {
  stageId: string;
  name: string;
  requiredCategory?: string;
  requiredTypes?: string[];
  requiredIncomingEdgeTypes?: string[];
  requiredOutgoingEdgeTypes?: string[];
}

export interface AttackPatternTemplate {
  patternId: string;
  name: string;
  description: string;
  stages: AttackStage[];
}

export interface PatternMatchResult {
  patternId: string;
  patternName: string;
  isFullMatch: boolean;
  matchPercentage: number;
  matchedStages: Array<{
    stageId: string;
    stageName: string;
    matchedNode: { id: string; label: string; category: string; type: string };
  }>;
  missingStages: string[];
  matchedEdgeIds: string[];
  summary: string;
}

export const KNOWN_ATTACK_PATTERNS: AttackPatternTemplate[] = [
  {
    patternId: 'DATA_EXFILTRATION_CORRIDOR',
    name: 'Multi-Stage Data Exfiltration',
    description: 'Initial Authentication -> Process Execution -> Sensitive Data Access -> File Transfer Exfiltration',
    stages: [
      {
        stageId: 'STAGE_1_AUTH',
        name: 'Initial Authentication / Login',
        requiredCategory: 'EVENT',
        requiredTypes: ['LOGIN']
      },
      {
        stageId: 'STAGE_2_EXECUTION',
        name: 'Process Execution',
        requiredCategory: 'EVENT',
        requiredTypes: ['PROCESS_EXECUTION']
      },
      {
        stageId: 'STAGE_3_DATA_ACCESS',
        name: 'Sensitive File / DB Access',
        requiredCategory: 'EVENT',
        requiredTypes: ['FILE_ACCESS', 'DATA_ACCESS']
      },
      {
        stageId: 'STAGE_4_TRANSFER',
        name: 'Outbound Exfiltration Transfer',
        requiredCategory: 'EVENT',
        requiredTypes: ['FILE_TRANSFER', 'COMMUNICATION']
      }
    ]
  },
  {
    patternId: 'CREDENTIAL_SPOOFING',
    name: 'Credential Abuse & Remote Hijack',
    description: 'Account Owner -> Account Principle -> Login Event on Server with Discrepancy',
    stages: [
      {
        stageId: 'STAGE_1_PERSON',
        name: 'Identity Owner',
        requiredCategory: 'ENTITY',
        requiredTypes: ['PERSON']
      },
      {
        stageId: 'STAGE_2_ACCOUNT',
        name: 'Account Principal',
        requiredCategory: 'ENTITY',
        requiredTypes: ['ACCOUNT']
      },
      {
        stageId: 'STAGE_3_LOGIN',
        name: 'Authentication Event',
        requiredCategory: 'EVENT',
        requiredTypes: ['LOGIN']
      },
      {
        stageId: 'STAGE_4_SERVER',
        name: 'Target Infrastructure',
        requiredCategory: 'ENTITY',
        requiredTypes: ['SERVER', 'DEVICE']
      }
    ]
  }
];

export class PatternMatchingAlgorithm {
  /**
   * Evaluates known structural incident patterns against the graph.
   * Finds matching sequential subgraphs connecting stages via valid paths.
   */
  static matchPatterns(
    nodes: GraphNode[],
    edges: GraphEdge[],
    patterns: AttackPatternTemplate[] = KNOWN_ATTACK_PATTERNS
  ): PatternMatchResult[] {
    const results: PatternMatchResult[] = [];

    for (const pattern of patterns) {
      const matchedStages: PatternMatchResult['matchedStages'] = [];
      const missingStages: string[] = [];
      const matchedEdgeIds = new Set<string>();

      let lastMatchedNode: GraphNode | null = null;

      for (const stage of pattern.stages) {
        // Find matching nodes that satisfy stage constraints
        const candidateNodes = nodes.filter(n => {
          if (stage.requiredCategory && n.category !== stage.requiredCategory) return false;
          if (stage.requiredTypes && !stage.requiredTypes.includes(n.type)) return false;
          return true;
        });

        if (candidateNodes.length === 0) {
          missingStages.push(stage.name);
          continue;
        }

        // If there was a previous stage, find a candidate that has a path/edge from the previous stage
        let selectedNode: GraphNode | null = null;
        if (lastMatchedNode) {
          const connectingEdge = edges.find(
            e =>
              (e.source === lastMatchedNode!.id && candidateNodes.some(cn => cn.id === e.target)) ||
              (e.target === lastMatchedNode!.id && candidateNodes.some(cn => cn.id === e.source)) ||
              candidateNodes.some(cn => cn.id === e.target)
          );

          if (connectingEdge) {
            selectedNode = candidateNodes.find(cn => cn.id === connectingEdge.target || cn.id === connectingEdge.source) || candidateNodes[0];
            matchedEdgeIds.add(connectingEdge.id);
          } else {
            selectedNode = candidateNodes[0];
          }
        } else {
          selectedNode = candidateNodes[0];
        }

        if (selectedNode) {
          matchedStages.push({
            stageId: stage.stageId,
            stageName: stage.name,
            matchedNode: {
              id: selectedNode.id,
              label: selectedNode.label,
              category: selectedNode.category,
              type: selectedNode.type
            }
          });
          lastMatchedNode = selectedNode;
        } else {
          missingStages.push(stage.name);
        }
      }

      const matchPercentage = Math.round((matchedStages.length / pattern.stages.length) * 100);
      const isFullMatch = matchedStages.length === pattern.stages.length;

      results.push({
        patternId: pattern.patternId,
        patternName: pattern.name,
        isFullMatch,
        matchPercentage,
        matchedStages,
        missingStages,
        matchedEdgeIds: Array.from(matchedEdgeIds),
        summary: isFullMatch
          ? `Full match (100%): All ${pattern.stages.length} stages of '${pattern.name}' detected in graph structure.`
          : `Partial match (${matchPercentage}%): ${matchedStages.length} of ${pattern.stages.length} stages identified.`
      });
    }

    return results;
  }
}
