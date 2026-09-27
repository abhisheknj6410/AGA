import { GraphNode, GraphEdge } from '../types.js';

export interface DominatorAnalysisResult {
  rootId: string;
  rootLabel: string;
  targetId?: string;
  targetLabel?: string;
  unavoidableNodesForTarget?: Array<{ nodeId: string; label: string; category: string }>;
  dominanceMap: Record<string, string[]>; // nodeId -> dominators
  immediateDominators: Record<string, string>; // nodeId -> idom
  summary: string;
}

export class DominatorsAlgorithm {
  /**
   * Computes Dominator Tree for directed graph relative to a root source node.
   * Node D dominates N if every directed path from root to N passes through D.
   */
  static analyze(
    nodes: GraphNode[],
    edges: GraphEdge[],
    rootId: string,
    targetId?: string
  ): DominatorAnalysisResult {
    const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));
    if (!nodeMap.has(rootId)) {
      return {
        rootId,
        rootLabel: rootId,
        dominanceMap: {},
        immediateDominators: {},
        summary: `Root node '${rootId}' not found in graph.`
      };
    }

    // Filter forward reachability from rootId
    const forwardAdj = new Map<string, string[]>();
    const predecessors = new Map<string, string[]>();
    for (const n of nodes) {
      forwardAdj.set(n.id, []);
      predecessors.set(n.id, []);
    }

    for (const e of edges) {
      if (forwardAdj.has(e.source) && predecessors.has(e.target)) {
        forwardAdj.get(e.source)!.push(e.target);
        predecessors.get(e.target)!.push(e.source);
      }
    }

    // BFS to find reachable nodes from root
    const reachable = new Set<string>();
    const queue = [rootId];
    reachable.add(rootId);
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of forwardAdj.get(u) || []) {
        if (!reachable.has(v)) {
          reachable.add(v);
          queue.push(v);
        }
      }
    }

    const reachableNodes = Array.from(reachable);

    // Iterative data-flow algorithm for Dominators:
    // Dom(root) = {root}
    // Dom(n) = {n} ∪ ( ∩ Dom(p) for p in preds(n) )
    const dom = new Map<string, Set<string>>();
    for (const n of reachableNodes) {
      if (n === rootId) {
        dom.set(n, new Set([rootId]));
      } else {
        dom.set(n, new Set(reachableNodes));
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const n of reachableNodes) {
        if (n === rootId) continue;

        // Valid predecessors that are reachable
        const preds = (predecessors.get(n) || []).filter(p => reachable.has(p));
        if (preds.length === 0) continue;

        // Intersection of dom of predecessors
        let newDom: Set<string> | null = null;
        for (const p of preds) {
          const domP = dom.get(p)!;
          if (newDom === null) {
            newDom = new Set(domP);
          } else {
            for (const item of newDom) {
              if (!domP.has(item)) {
                newDom.delete(item);
              }
            }
          }
        }

        if (newDom === null) newDom = new Set();
        newDom.add(n);

        const currentDom = dom.get(n)!;
        if (newDom.size !== currentDom.size || ![...newDom].every(x => currentDom.has(x))) {
          dom.set(n, newDom);
          changed = true;
        }
      }
    }

    // Compute immediate dominators (idom)
    // idom(n) is the strictly dominating node d of n such that d does not strictly dominate any other strict dominator of n
    const idomMap: Record<string, string> = {};
    for (const n of reachableNodes) {
      if (n === rootId) continue;
      const strictDominators = Array.from(dom.get(n)!).filter(d => d !== n);
      for (const d of strictDominators) {
        // d is idom if no other strict dominator s in strictDominators has d as a strict dominator of s
        const isImmediate = strictDominators.every(other => {
          if (other === d) return true;
          return !dom.get(other)!.has(d);
        });
        if (isImmediate) {
          idomMap[n] = d;
          break;
        }
      }
    }

    const dominanceMap: Record<string, string[]> = {};
    for (const [k, v] of dom.entries()) {
      dominanceMap[k] = Array.from(v);
    }

    // If targetId is provided, extract unavoidable nodes
    let unavoidableNodesForTarget: Array<{ nodeId: string; label: string; category: string }> | undefined;
    if (targetId && dom.has(targetId)) {
      unavoidableNodesForTarget = Array.from(dom.get(targetId)!)
        .filter(id => id !== rootId && id !== targetId)
        .map(id => {
          const n = nodeMap.get(id)!;
          return {
            nodeId: id,
            label: n?.label || id,
            category: n?.category || 'ENTITY'
          };
        });
    }

    const rootNode = nodeMap.get(rootId);
    const targetNode = targetId ? nodeMap.get(targetId) : undefined;

    return {
      rootId,
      rootLabel: rootNode?.label || rootId,
      targetId,
      targetLabel: targetNode?.label || targetId,
      unavoidableNodesForTarget,
      dominanceMap,
      immediateDominators: idomMap,
      summary: targetId
        ? `Identified ${unavoidableNodesForTarget?.length || 0} unavoidable choke points between '${rootNode?.label}' and '${targetNode?.label}'.`
        : `Dominator tree computed for ${reachableNodes.length} reachable nodes from root '${rootNode?.label}'.`
    };
  }
}
