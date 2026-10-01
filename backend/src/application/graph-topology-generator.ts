import { GraphPayload, GraphNode, GraphEdge, NodeCategory, EdgeType, TemporalInfo } from '../domain/types.js';
import { TopologyClass, TopologyInstance } from '../domain/generalization-types.js';

function makeNode(
  id: string,
  label: string,
  category: NodeCategory,
  type: string,
  time?: TemporalInfo,
  properties: Record<string, unknown> = {}
): GraphNode {
  return {
    id,
    caseId: 'benchmark-case',
    category,
    type,
    label,
    properties,
    metadata: { source: 'BENCHMARK_GENERATOR' },
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    time
  };
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  type: EdgeType = 'PRECEDED',
  cost: number = 1.0,
  confidence: number = 0.9,
  properties: Record<string, unknown> = {}
): GraphEdge {
  return {
    id,
    caseId: 'benchmark-case',
    source,
    target,
    type,
    status: 'OBSERVED',
    cost,
    confidence,
    evidenceRefs: [],
    properties,
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00Z').toISOString()
  };
}

export class GraphTopologyGenerator {
  /**
   * Generates all 12 canonical benchmark topologies.
   */
  static generateAll(): TopologyInstance[] {
    return [
      this.generateLinearChain(),
      this.generateBranchingTree(),
      this.generateConvergingFunnel(),
      this.generateParallelCorridors(),
      this.generateDiamondLattice(),
      this.generateHighlyConnectedDense(),
      this.generateSparseExpander(),
      this.generateDisconnectedIslands(),
      this.generateCyclicParadox(),
      this.generateTemporalConflict(),
      this.generateEvidenceConflict(),
      this.generateLargeScaleSynthetic(500)
    ];
  }

  /**
   * 1. LINEAR_CHAIN
   * Topology: Simple unbranching chain: Source -> Step1 -> Step2 -> Step3 -> Target
   * Characteristics: Zero alternative paths, single bridge edges, all intermediate nodes dominate.
   */
  static generateLinearChain(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('lc-src', 'Initial Entry', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('lc-step1', 'Corridor Transit', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('lc-step2', 'Access Checkpoint', 'EVENT', 'FILE_ACCESS', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' }),
      makeNode('lc-step3', 'Secure Threshold', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:45:00Z', precision: 'MINUTE' }),
      makeNode('lc-tgt', 'Vault Breach', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T11:00:00Z', precision: 'MINUTE' })
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-lc-1', 'lc-src', 'lc-step1', 'PRECEDED', 1.0),
      makeEdge('e-lc-2', 'lc-step1', 'lc-step2', 'PRECEDED', 1.0),
      makeEdge('e-lc-3', 'lc-step2', 'lc-step3', 'PRECEDED', 1.0),
      makeEdge('e-lc-4', 'lc-step3', 'lc-tgt', 'PRECEDED', 1.0)
    ];

    return {
      id: 'topo-linear-chain',
      name: 'Linear Invariant Chain',
      topologyClass: 'LINEAR_CHAIN',
      description: 'Single unbranching sequential causal path without alternative transit corridors or bypass routes.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'lc-src',
      targetNodeId: 'lc-tgt',
      graph: { caseId: 'topo-linear-chain', nodes, edges },
      expectedCharacteristics: [
        'Single shortest path exists',
        'Min-cut capacity is 1',
        'Intermediate nodes are trivial dominators',
        'Baseline BFS/Dijkstra sufficient'
      ]
    };
  }

  /**
   * 2. BRANCHING_TREE
   * Topology: Root branches into 3 divergent routes converging at Target.
   */
  static generateBranchingTree(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('bt-src', 'Intrusion Origin', 'EVENT', 'LOGIN', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('bt-b1', 'West Hallway', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('bt-b2', 'East Service Corridor', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('bt-c1', 'Stairwell A', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:20:00Z', precision: 'MINUTE' }),
      makeNode('bt-c2', 'Maintenance Lift', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:20:00Z', precision: 'MINUTE' }),
      makeNode('bt-c3', 'HVAC Duct Run', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:20:00Z', precision: 'MINUTE' }),
      makeNode('bt-tgt', 'Server Enclosure', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' })
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-bt-1', 'bt-src', 'bt-b1', 'PRECEDED', 1.0),
      makeEdge('e-bt-2', 'bt-src', 'bt-b2', 'PRECEDED', 1.2),
      makeEdge('e-bt-3', 'bt-b1', 'bt-c1', 'PRECEDED', 1.0),
      makeEdge('e-bt-4', 'bt-b1', 'bt-c2', 'PRECEDED', 1.1),
      makeEdge('e-bt-5', 'bt-b2', 'bt-c3', 'PRECEDED', 1.0),
      makeEdge('e-bt-6', 'bt-c1', 'bt-tgt', 'PRECEDED', 1.0),
      makeEdge('e-bt-7', 'bt-c2', 'bt-tgt', 'PRECEDED', 1.0),
      makeEdge('e-bt-8', 'bt-c3', 'bt-tgt', 'PRECEDED', 1.0)
    ];

    return {
      id: 'topo-branching-tree',
      name: 'Divergent Branching Tree',
      topologyClass: 'BRANCHING_TREE',
      description: 'Causal root diverges into hierarchical branching corridors reaching target through distinct path variants.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'bt-src',
      targetNodeId: 'bt-tgt',
      graph: { caseId: 'topo-branching-tree', nodes, edges },
      expectedCharacteristics: [
        'Multiple alternative loopless paths',
        'Multi-edge min-cut required',
        'Yen discovers all 3 corridors',
        'Baseline misses alternative branches'
      ]
    };
  }

  /**
   * 3. CONVERGING_FUNNEL
   * Topology: Dispersed initial corridors funnel into a single unavoidable bottleneck node before Target.
   */
  static generateConvergingFunnel(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('cf-src', 'Perimeter Insertion', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('cf-in1', 'Ground Window Breach', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('cf-in2', 'Roof Hatch Entry', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('cf-in3', 'Underground Utility Tunnel', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('cf-choke', 'Security Mantrap Door', 'EVENT', 'DEVICE_CONNECTION', { start: '2026-01-01T10:20:00Z', precision: 'MINUTE' }),
      makeNode('cf-tgt', 'Central Archive', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' })
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-cf-1', 'cf-src', 'cf-in1', 'PRECEDED', 1.0),
      makeEdge('e-cf-2', 'cf-src', 'cf-in2', 'PRECEDED', 1.0),
      makeEdge('e-cf-3', 'cf-src', 'cf-in3', 'PRECEDED', 1.0),
      makeEdge('e-cf-4', 'cf-in1', 'cf-choke', 'PRECEDED', 1.0),
      makeEdge('e-cf-5', 'cf-in2', 'cf-choke', 'PRECEDED', 1.0),
      makeEdge('e-cf-6', 'cf-in3', 'cf-choke', 'PRECEDED', 1.0),
      makeEdge('e-cf-7', 'cf-choke', 'cf-tgt', 'PRECEDED', 1.0)
    ];

    return {
      id: 'topo-converging-funnel',
      name: 'Converging Bottleneck Funnel',
      topologyClass: 'CONVERGING_FUNNEL',
      description: 'Multiple independent ingress paths funnelling through an unavoidable physical choke point prior to target.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'cf-src',
      targetNodeId: 'cf-tgt',
      graph: { caseId: 'topo-converging-funnel', nodes, edges },
      expectedCharacteristics: [
        'Single intermediate dominator: Security Mantrap Door',
        'Dominator separates common invariant from distinguishing ingress paths',
        'Min-cut identifies mantrap bridge as optimal single-point interdiction'
      ]
    };
  }

  /**
   * 4. PARALLEL_CORRIDORS
   * Topology: Three completely disjoint corridors from Source to Target with zero shared intermediate nodes.
   */
  static generateParallelCorridors(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('pc-src', 'Suspect Base Location', 'ENTITY', 'PERSON'),
      makeNode('pc-p1-a', 'Physical Courier Route A1', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('pc-p1-b', 'Physical Courier Route A2', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('pc-p2-a', 'Encrypted VPN Proxy B1', 'EVENT', 'NETWORK_CONNECTION', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('pc-p2-b', 'Tor Exit Node B2', 'EVENT', 'NETWORK_CONNECTION', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('pc-p3-a', 'Insider Badge Clone C1', 'EVENT', 'DEVICE_CONNECTION', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('pc-p3-b', 'Internal Terminal Access C2', 'EVENT', 'LOGIN', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('pc-tgt', 'Exfiltration Target', 'ENTITY', 'ACCOUNT')
    ];

    const edges: GraphEdge[] = [
      // Corridor 1
      makeEdge('e-pc-1', 'pc-src', 'pc-p1-a', 'PERFORMED', 1.0),
      makeEdge('e-pc-2', 'pc-p1-a', 'pc-p1-b', 'PRECEDED', 1.0),
      makeEdge('e-pc-3', 'pc-p1-b', 'pc-tgt', 'TARGETED', 1.0),
      // Corridor 2
      makeEdge('e-pc-4', 'pc-src', 'pc-p2-a', 'PERFORMED', 1.0),
      makeEdge('e-pc-5', 'pc-p2-a', 'pc-p2-b', 'PRECEDED', 1.0),
      makeEdge('e-pc-6', 'pc-p2-b', 'pc-tgt', 'TARGETED', 1.0),
      // Corridor 3
      makeEdge('e-pc-7', 'pc-src', 'pc-p3-a', 'PERFORMED', 1.0),
      makeEdge('e-pc-8', 'pc-p3-a', 'pc-p3-b', 'PRECEDED', 1.0),
      makeEdge('e-pc-9', 'pc-p3-b', 'pc-tgt', 'TARGETED', 1.0)
    ];

    return {
      id: 'topo-parallel-corridors',
      name: 'Triple Disjoint Parallel Corridors',
      topologyClass: 'PARALLEL_CORRIDORS',
      description: 'Three mutually edge-disjoint and node-disjoint corridors providing independent evidence channels.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'pc-src',
      targetNodeId: 'pc-tgt',
      graph: { caseId: 'topo-parallel-corridors', nodes, edges },
      expectedCharacteristics: [
        'DisjointPaths proves 3 independent corroboration corridors',
        'Menger theorem confirms cut capacity is 3',
        'No intermediate dominator exists (3 distinct bypasses)',
        'Baseline hop count completely fails to assess corridor redundancy'
      ]
    };
  }

  /**
   * 5. DIAMOND_LATTICE
   * Topology: Classic diamond graph with cross-connecting intermediate bridge.
   */
  static generateDiamondLattice(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('dl-src', 'Primary Attacker', 'ENTITY', 'PERSON'),
      makeNode('dl-left1', 'Stolen Credentials', 'EVENT', 'LOGIN', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('dl-left2', 'Admin Escalation', 'EVENT', 'ACCOUNT_MODIFICATION', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('dl-right1', 'Zero-Day Exploit', 'EVENT', 'PROCESS_EXECUTION', { start: '2026-01-01T10:02:00Z', precision: 'MINUTE' }),
      makeNode('dl-right2', 'Kernel Privilege', 'EVENT', 'PROCESS_EXECUTION', { start: '2026-01-01T10:12:00Z', precision: 'MINUTE' }),
      makeNode('dl-tgt', 'Core Ledger', 'ENTITY', 'DATABASE_RECORD')
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-dl-1', 'dl-src', 'dl-left1', 'PERFORMED', 1.0),
      makeEdge('e-dl-2', 'dl-left1', 'dl-left2', 'PRECEDED', 1.0),
      makeEdge('e-dl-3', 'dl-left2', 'dl-tgt', 'ACCESSED', 1.0),
      makeEdge('e-dl-4', 'dl-src', 'dl-right1', 'PERFORMED', 1.5),
      makeEdge('e-dl-5', 'dl-right1', 'dl-right2', 'PRECEDED', 1.0),
      makeEdge('e-dl-6', 'dl-right2', 'dl-tgt', 'ACCESSED', 1.0),
      // Cross link between left and right branch
      makeEdge('e-dl-7', 'dl-left1', 'dl-right2', 'TRIGGERED', 1.2)
    ];

    return {
      id: 'topo-diamond-lattice',
      name: 'Diamond Lattice with Cross-Bridge',
      topologyClass: 'DIAMOND_LATTICE',
      description: 'Diamond DAG with dual main tracks and cross-track transitions creating multiple candidate routing permutations.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'dl-src',
      targetNodeId: 'dl-tgt',
      graph: { caseId: 'topo-diamond-lattice', nodes, edges },
      expectedCharacteristics: [
        'Yen discovers 3 distinct loopless paths',
        'Min-cut requires 2 edges to interdict',
        'Baseline shortest path only finds left track',
        'Cross link creates hybrid third possibility'
      ]
    };
  }

  /**
   * 6. HIGHLY_CONNECTED_DENSE
   * Topology: Dense mesh of 8 nodes with high cross-connectivity.
   * Demonstrates: Dominator refutes false choke points suggested by high degree centrality.
   */
  static generateHighlyConnectedDense(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('hd-src', 'Coordinator Hub', 'ENTITY', 'PERSON'),
      makeNode('hd-n1', 'Broker 1', 'ENTITY', 'ORGANIZATION'),
      makeNode('hd-n2', 'Broker 2', 'ENTITY', 'ORGANIZATION'),
      makeNode('hd-n3', 'Broker 3', 'ENTITY', 'ORGANIZATION'),
      makeNode('hd-n4', 'Relay Station Alpha', 'ENTITY', 'SERVER'),
      makeNode('hd-n5', 'Relay Station Beta', 'ENTITY', 'SERVER'),
      makeNode('hd-n6', 'Relay Station Gamma', 'ENTITY', 'SERVER'),
      makeNode('hd-tgt', 'Offshore Destination', 'ENTITY', 'ACCOUNT')
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-hd-1', 'hd-src', 'hd-n1', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-2', 'hd-src', 'hd-n2', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-3', 'hd-src', 'hd-n3', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-4', 'hd-n1', 'hd-n4', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-5', 'hd-n1', 'hd-n5', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-6', 'hd-n2', 'hd-n4', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-7', 'hd-n2', 'hd-n5', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-8', 'hd-n2', 'hd-n6', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-9', 'hd-n3', 'hd-n5', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-10', 'hd-n3', 'hd-n6', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-11', 'hd-n4', 'hd-tgt', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-12', 'hd-n5', 'hd-tgt', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-13', 'hd-n6', 'hd-tgt', 'CONNECTED_TO', 1.0),
      // Inter-broker and inter-relay cross edges
      makeEdge('e-hd-14', 'hd-n1', 'hd-n2', 'CONNECTED_TO', 1.0),
      makeEdge('e-hd-15', 'hd-n4', 'hd-n5', 'CONNECTED_TO', 1.0)
    ];

    return {
      id: 'topo-highly-connected-dense',
      name: 'Dense High-Degree Mesh',
      topologyClass: 'HIGHLY_CONNECTED_DENSE',
      description: 'Highly connected network where multiple entities have high degree centrality but zero topological dominance.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'hd-src',
      targetNodeId: 'hd-tgt',
      graph: { caseId: 'topo-highly-connected-dense', nodes, edges },
      expectedCharacteristics: [
        'Degree centrality falsely claims Broker 2 or Relay Beta are critical bottlenecks',
        'Dominator mathematically proves 0 intermediate dominators exist due to bypasses',
        'Significant value in debunking false investigator choke points'
      ]
    };
  }

  /**
   * 7. SPARSE_EXPANDER
   * Topology: High diameter sparse graph with few long connections and one high-cost sparse detour.
   */
  static generateSparseExpander(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('se-src', 'Origin Node', 'ENTITY', 'PERSON'),
      makeNode('se-n1', 'Waypoint 1', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('se-n2', 'Waypoint 2', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:20:00Z', precision: 'MINUTE' }),
      makeNode('se-n3', 'Waypoint 3', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:40:00Z', precision: 'MINUTE' }),
      makeNode('se-n4', 'Waypoint 4', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T11:00:00Z', precision: 'MINUTE' }),
      makeNode('se-detour', 'Long Detour Trail', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' }),
      makeNode('se-tgt', 'Target Node', 'ENTITY', 'LOCATION')
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-se-1', 'se-src', 'se-n1', 'PRECEDED', 1.0),
      makeEdge('e-se-2', 'se-n1', 'se-n2', 'PRECEDED', 1.0),
      makeEdge('e-se-3', 'se-n2', 'se-n3', 'PRECEDED', 1.0),
      makeEdge('e-se-4', 'se-n3', 'se-n4', 'PRECEDED', 1.0),
      makeEdge('e-se-5', 'se-n4', 'se-tgt', 'PRECEDED', 1.0),
      // Sparse high-cost detour bypassing n2, n3, n4
      makeEdge('e-se-6', 'se-n1', 'se-detour', 'PRECEDED', 4.0),
      makeEdge('e-se-7', 'se-detour', 'se-tgt', 'PRECEDED', 4.0)
    ];

    return {
      id: 'topo-sparse-expander',
      name: 'Sparse Elongated Corridor with Detour',
      topologyClass: 'SPARSE_EXPANDER',
      description: 'Sparse network with high path diameter, low average degree, and an asymmetric secondary bypass route.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'se-src',
      targetNodeId: 'se-tgt',
      graph: { caseId: 'topo-sparse-expander', nodes, edges },
      expectedCharacteristics: [
        'Waypoint 1 is unavoidable dominator',
        'Yen discovers primary path and long detour',
        'Min-cut separates network with cost-bounded capacity'
      ]
    };
  }

  /**
   * 8. DISCONNECTED_ISLANDS
   * Topology: Disconnected components; Source cannot reach Target.
   */
  static generateDisconnectedIslands(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('di-src', 'Source Island Node A', 'ENTITY', 'PERSON'),
      makeNode('di-a1', 'Source Island Node B', 'ENTITY', 'DEVICE'),
      makeNode('di-a2', 'Source Island Node C', 'ENTITY', 'ACCOUNT'),
      makeNode('di-tgt', 'Target Island Node X', 'ENTITY', 'SERVER'),
      makeNode('di-b1', 'Target Island Node Y', 'ENTITY', 'DATABASE_RECORD')
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-di-1', 'di-src', 'di-a1', 'USES', 1.0),
      makeEdge('di-a1', 'di-a1', 'di-a2', 'ACCESSED', 1.0),
      makeEdge('e-di-2', 'di-b1', 'di-tgt', 'CONNECTED_TO', 1.0)
    ];

    return {
      id: 'topo-disconnected-islands',
      name: 'Disconnected Graph Islands',
      topologyClass: 'DISCONNECTED_ISLANDS',
      description: 'Source and target lie in separate disconnected graph components with zero reachability.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'di-src',
      targetNodeId: 'di-tgt',
      graph: { caseId: 'topo-disconnected-islands', nodes, edges },
      expectedCharacteristics: [
        'Zero reachable paths from source to target',
        'Classified as NOT_APPLICABLE for path-dependent algorithms',
        'Guards against runtime exceptions on disconnected states'
      ]
    };
  }

  /**
   * 9. CYCLIC_PARADOX
   * Topology: Graph contains a directed cycle (A -> B -> C -> B) violating DAG causality assumptions.
   */
  static generateCyclicParadox(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('cy-src', 'Initial Query', 'EVENT', 'LOGIN', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('cy-node-a', 'Session Start', 'EVENT', 'LOGIN', { start: '2026-01-01T10:05:00Z', precision: 'MINUTE' }),
      makeNode('cy-node-b', 'Token Refresh', 'EVENT', 'ACCOUNT_MODIFICATION', { start: '2026-01-01T10:10:00Z', precision: 'MINUTE' }),
      makeNode('cy-node-c', 'Re-Authentication Loop', 'EVENT', 'LOGIN', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('cy-tgt', 'Data Exfiltration', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' })
    ];

    const edges: GraphEdge[] = [
      makeEdge('e-cy-1', 'cy-src', 'cy-node-a', 'PRECEDED', 1.0),
      makeEdge('e-cy-2', 'cy-node-a', 'cy-node-b', 'PRECEDED', 1.0),
      makeEdge('e-cy-3', 'cy-node-b', 'cy-node-c', 'PRECEDED', 1.0),
      // Cycle: c points back to b
      makeEdge('e-cy-4', 'cy-node-c', 'cy-node-b', 'CAUSED', 1.0),
      makeEdge('e-cy-5', 'cy-node-c', 'cy-tgt', 'PRECEDED', 1.0)
    ];

    return {
      id: 'topo-cyclic-paradox',
      name: 'Cyclic Causal Paradox',
      topologyClass: 'CYCLIC_PARADOX',
      description: 'Directed graph containing a cyclic causal dependency loop that violates the DAG precondition of topological sorting.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'cy-src',
      targetNodeId: 'cy-tgt',
      graph: { caseId: 'topo-cyclic-paradox', nodes, edges },
      expectedCharacteristics: [
        'Kahn topological sort detects cycle and returns isAcyclic = false',
        'Algorithm correctly reports ASSUMPTION_VIOLATED',
        'Protects against infinite loops in downstream pipeline'
      ]
    };
  }

  /**
   * 10. TEMPORAL_CONFLICT
   * Topology: Two candidate corridors; Corridor 2 has an inverted backward-in-time timestamp sequence.
   */
  static generateTemporalConflict(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('tc-src', 'Terminal Login', 'EVENT', 'LOGIN', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      // Valid path
      makeNode('tc-v1', 'Valid Payload Download', 'EVENT', 'FILE_TRANSFER', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' }),
      makeNode('tc-v2', 'Valid Local Execution', 'EVENT', 'PROCESS_EXECUTION', { start: '2026-01-01T11:00:00Z', precision: 'MINUTE' }),
      // Chronologically inverted path (paradox)
      makeNode('tc-p1', 'Reported USB Insertion', 'EVENT', 'DEVICE_CONNECTION', { start: '2026-01-01T14:00:00Z', precision: 'MINUTE' }),
      makeNode('tc-p2', 'Unsynchronized File Copy', 'EVENT', 'FILE_CREATION', { start: '2026-01-01T09:00:00Z', precision: 'MINUTE' }), // Backwards!
      makeNode('tc-tgt', 'System Tamper Alert', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T11:30:00Z', precision: 'MINUTE' })
    ];

    const edges: GraphEdge[] = [
      // Valid corridor
      makeEdge('e-tc-v1', 'tc-src', 'tc-v1', 'PRECEDED', 1.0),
      makeEdge('e-tc-v2', 'tc-v1', 'tc-v2', 'PRECEDED', 1.0),
      makeEdge('e-tc-v3', 'tc-v2', 'tc-tgt', 'PRECEDED', 1.0),
      // Inverted corridor
      makeEdge('e-tc-p1', 'tc-src', 'tc-p1', 'PRECEDED', 1.0),
      makeEdge('e-tc-p2', 'tc-p1', 'tc-p2', 'PRECEDED', 1.0),
      makeEdge('e-tc-p3', 'tc-p2', 'tc-tgt', 'PRECEDED', 1.0)
    ];

    return {
      id: 'topo-temporal-conflict',
      name: 'Temporal Inversion Anomaly',
      topologyClass: 'TEMPORAL_CONFLICT',
      description: 'Candidate graph with an inverted event sequence violating arrow-of-time chronology alongside a valid chronological route.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'tc-src',
      targetNodeId: 'tc-tgt',
      graph: { caseId: 'topo-temporal-conflict', nodes, edges },
      expectedCharacteristics: [
        'Baseline unordered traversal treats both paths as equally viable',
        'Temporal analysis eliminates inverted route',
        'Delivers SIGNIFICANT_VALUE by pruning causal impossibility'
      ]
    };
  }

  /**
   * 11. EVIDENCE_CONFLICT
   * Topology: Two competing hypothesis routes; one supported by corroborating logs, one directly contradicted.
   */
  static generateEvidenceConflict(): TopologyInstance {
    const nodes: GraphNode[] = [
      makeNode('ec-src', 'Suspect Persona', 'ENTITY', 'PERSON'),
      makeNode('ec-r1', 'Remote SSH Ingress', 'EVENT', 'NETWORK_CONNECTION', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('ec-r2', 'Remote Key Injection', 'EVENT', 'FILE_ACCESS', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('ec-p1', 'Physical Biometric Breach', 'EVENT', 'LOCATION_CHANGE', { start: '2026-01-01T10:00:00Z', precision: 'MINUTE' }),
      makeNode('ec-p2', 'Console Login', 'EVENT', 'LOGIN', { start: '2026-01-01T10:15:00Z', precision: 'MINUTE' }),
      makeNode('ec-tgt', 'Database Dump', 'EVENT', 'DATA_ACCESS', { start: '2026-01-01T10:30:00Z', precision: 'MINUTE' }),
      // Evidence nodes
      makeNode('ec-ev-corrob', 'Firewall Log Dump', 'EVIDENCE', 'LOG', undefined, { reliability: 0.95 }),
      makeNode('ec-ev-contra', 'Alibi Guard Log', 'EVIDENCE', 'DOCUMENT', undefined, { reliability: 0.90 })
    ];

    const edges: GraphEdge[] = [
      // Remote corridor (Supported)
      makeEdge('e-ec-r1', 'ec-src', 'ec-r1', 'PERFORMED', 1.0),
      makeEdge('e-ec-r2', 'ec-r1', 'ec-r2', 'PRECEDED', 1.0),
      makeEdge('e-ec-r3', 'ec-r2', 'ec-tgt', 'PRECEDED', 1.0),
      makeEdge('e-ec-sup', 'ec-ev-corrob', 'ec-r1', 'SUPPORTS', 1.0),
      // Physical corridor (Contradicted)
      makeEdge('e-ec-p1', 'ec-src', 'ec-p1', 'PERFORMED', 1.0),
      makeEdge('e-ec-p2', 'ec-p1', 'ec-p2', 'PRECEDED', 1.0),
      makeEdge('e-ec-p3', 'ec-p2', 'ec-tgt', 'PRECEDED', 1.0),
      makeEdge('e-ec-con', 'ec-ev-contra', 'ec-p1', 'CONTRADICTS', 1.0)
    ];

    return {
      id: 'topo-evidence-conflict',
      name: 'Corroboration vs Contradiction Duality',
      topologyClass: 'EVIDENCE_CONFLICT',
      description: 'Two structural pathways where evidence explicitly supports one corridor while directly contradicting the competing route.',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'ec-src',
      targetNodeId: 'ec-tgt',
      graph: { caseId: 'topo-evidence-conflict', nodes, edges },
      expectedCharacteristics: [
        'Structural differentiation clearly isolates conflicting corroboration profiles',
        'Contradiction impact analysis flags affected physical corridor',
        'Resolution candidate targets alibi validation'
      ]
    };
  }

  /**
   * 12. LARGE_SCALE_SYNTHETIC
   * Topology: Layered DAG with targetNodeCount (e.g. 500 nodes).
   * Verifies scalability, polynomial efficiency, and lack of runaway complexity on large networks.
   */
  static generateLargeScaleSynthetic(targetNodeCount: number = 500): TopologyInstance {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Origin
    nodes.push(makeNode('syn-src', 'Synthetic Origin', 'EVENT', 'LOGIN', { start: '2026-01-01T08:00:00Z', precision: 'MINUTE' }));

    const layerCount = 20;
    const nodesPerLayer = Math.floor((targetNodeCount - 2) / layerCount);

    let nodeIdx = 1;
    let prevLayerIds = ['syn-src'];

    for (let layer = 0; layer < layerCount; layer++) {
      const currentLayerIds: string[] = [];
      const layerTime = new Date(new Date('2026-01-01T08:00:00Z').getTime() + (layer + 1) * 360000).toISOString();

      for (let i = 0; i < nodesPerLayer; i++) {
        const id = `syn-n-L${layer}-${i}`;
        nodes.push(makeNode(id, `Layer ${layer} Event ${i}`, 'EVENT', 'PROCESS_EXECUTION', { start: layerTime, precision: 'MINUTE' }));
        currentLayerIds.push(id);
        nodeIdx++;
      }

      // Connect previous layer to current layer deterministically
      for (let j = 0; j < currentLayerIds.length; j++) {
        const u = prevLayerIds[j % prevLayerIds.length];
        const v = currentLayerIds[j];
        edges.push(makeEdge(`syn-e-${u}-${v}`, u, v, 'PRECEDED', 1.0 + (j % 3) * 0.2));

        // Add cross connections for density
        if (prevLayerIds.length > 1) {
          const u2 = prevLayerIds[(j + 1) % prevLayerIds.length];
          edges.push(makeEdge(`syn-e-cross-${u2}-${v}`, u2, v, 'PRECEDED', 1.5));
        }
      }

      prevLayerIds = currentLayerIds;
    }

    // Connect last layer to target
    const finalTime = new Date(new Date('2026-01-01T08:00:00Z').getTime() + (layerCount + 1) * 360000).toISOString();
    const targetNode = makeNode('syn-tgt', 'Synthetic Destination', 'EVENT', 'DATA_ACCESS', { start: finalTime, precision: 'MINUTE' });
    nodes.push(targetNode);

    for (let k = 0; k < Math.min(prevLayerIds.length, 5); k++) {
      edges.push(makeEdge(`syn-e-tgt-${k}`, prevLayerIds[k], 'syn-tgt', 'PRECEDED', 1.0));
    }

    return {
      id: 'topo-large-scale-synthetic',
      name: `Large Scale Layered Synthetic DAG (${nodes.length} Nodes)`,
      topologyClass: 'LARGE_SCALE_SYNTHETIC',
      description: `Synthetic layered directed acyclic graph with ${nodes.length} nodes and ${edges.length} edges testing computational scalability.`,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      sourceNodeId: 'syn-src',
      targetNodeId: 'syn-tgt',
      graph: { caseId: 'topo-large-scale-synthetic', nodes, edges },
      expectedCharacteristics: [
        'Execution completes deterministically within sub-second thresholds',
        'Yen discovers multi-layer route variants',
        'Scalability verified without algorithmic timeout'
      ]
    };
  }
}
