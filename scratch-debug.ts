import { DijkstraAlgorithm } from './backend/src/domain/algorithms/dijkstra.js';
const nodes = [
  { id: 's1' }, { id: 'm1' }, { id: 'm2' }, { id: 't1' }
];
const edges = [
  { source: 's1', target: 'm1' },
  { source: 'm1', target: 'm2' },
  { source: 'm2', target: 't1' }
];
console.log(DijkstraAlgorithm.findShortestPath(nodes as any, edges as any, 's1', 't1'));
