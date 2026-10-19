import { GraphNode, GraphEdge } from '../types.js';

export interface Community {
  id: string;
  nodeIds: string[];
}

export class CommunityDetectionAlgorithm {
  static findWeaklyConnectedComponents(nodes: GraphNode[], edges: GraphEdge[]): Community[] {
    const adjList = new Map<string, string[]>();
    for (const node of nodes) {
      adjList.set(node.id, []);
    }

    for (const edge of edges) {
      if (adjList.has(edge.source) && adjList.has(edge.target)) {
        adjList.get(edge.source)!.push(edge.target);
        adjList.get(edge.target)!.push(edge.source); // Treat as undirected for WCC
      }
    }

    const visited = new Set<string>();
    const communities: Community[] = [];
    let communityCounter = 1;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component: string[] = [];
        const queue: string[] = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
          const current = queue.shift()!;
          component.push(current);

          for (const neighbor of adjList.get(current)!) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        communities.push({
          id: `community_${communityCounter++}`,
          nodeIds: component
        });
      }
    }

    return communities;
  }
}
