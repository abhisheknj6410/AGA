import React, { useState } from 'react';
import { GraphPayload, GraphNode } from '../../types/graph';
import { runAlgorithm } from '../../api/client';
import {
  Cpu,
  Play,
  Share2,
  GitCommit,
  Scissors,
  Split,
  Clock,
  ShieldAlert,
  GitMerge,
  Route,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AnalysisViewProps {
  caseId: string;
  graph: GraphPayload | null;
  onHighlightNodes?: (nodeIds: string[]) => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ caseId, graph }) => {
  const [selectedAlgo, setSelectedAlgo] = useState<string>('DIJKSTRA');
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [kValue, setKValue] = useState<number>(3);
  const [disjointMode, setDisjointMode] = useState<'VERTEX_DISJOINT' | 'EDGE_DISJOINT'>('VERTEX_DISJOINT');
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodes = graph?.nodes || [];
  const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]));

  // Auto-fill initial defaults if available
  React.useEffect(() => {
    if (nodes.length >= 2 && !sourceId && !targetId) {
      const p = nodes.find(n => n.type === 'PERSON' || n.type === 'ACCOUNT');
      const t = nodes.find(n => n.type === 'SERVER' || n.type === 'FILE');
      if (p) setSourceId(p.id);
      if (t) setTargetId(t.id);
      if (nodes.length >= 3) {
        setSelectedTerminals([nodes[0].id, nodes[1].id, nodes[2].id]);
      }
    }
  }, [nodes, sourceId, targetId]);

  const handleExecute = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      let params: Record<string, any> = {};
      switch (selectedAlgo) {
        case 'DIJKSTRA':
          params = { sourceId, targetId };
          break;
        case 'K_SHORTEST_PATHS':
          params = { sourceId, targetId, k: kValue };
          break;
        case 'DOMINATORS':
          params = { rootId: sourceId, targetId: targetId || undefined };
          break;
        case 'MIN_CUT':
          params = { sourceId, targetId };
          break;
        case 'DISJOINT_PATHS':
          params = { sourceId, targetId, mode: disjointMode };
          break;
        case 'STEINER_SUBGRAPH':
          params = { terminalIds: selectedTerminals };
          break;
        default:
          params = {};
          break;
      }

      const res = await runAlgorithm(caseId, selectedAlgo, params);
      setResult(res.output);
    } catch (err: any) {
      setError(err.message || 'Algorithm execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleTerminal = (id: string) => {
    setSelectedTerminals(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">Graph Analysis Engine</h2>
            <p className="text-xs text-slate-400">
              Deterministic graph algorithms as the primary investigative computational engine
            </p>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Computing...' : 'Run Algorithm'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Algorithm Selection & Parameters Panel */}
        <div className="w-80 border-r border-slate-800/80 p-5 overflow-y-auto space-y-6 bg-slate-900/30">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Select Graph Algorithm
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'DIJKSTRA', name: 'Weighted Shortest Path', desc: 'Lowest-cost evidence route', icon: Route },
                { id: 'K_SHORTEST_PATHS', name: 'K-Shortest Paths', desc: 'Alternative access corridors', icon: Split },
                { id: 'ARTICULATION_POINTS', name: 'Articulation Points', desc: 'Critical intermediaries & bridges', icon: GitCommit },
                { id: 'DOMINATORS', name: 'Dominator Tree', desc: 'Unavoidable choke points', icon: GitMerge },
                { id: 'MIN_CUT', name: 'Minimum s-t Cut', desc: 'Containment & isolation barriers', icon: Scissors },
                { id: 'DISJOINT_PATHS', name: 'Disjoint Paths', desc: 'Independent evidence corroboration', icon: Share2 },
                { id: 'TEMPORAL_ANALYSIS', name: 'Temporal & Ambiguity', desc: 'Topological flow & order gaps', icon: Clock },
                { id: 'PATTERN_MATCHING', name: 'Attack Stage Matching', desc: 'Subgraph motif detection', icon: ShieldAlert },
                { id: 'STEINER_SUBGRAPH', name: 'Minimal Evidence Chain', desc: 'Steiner connecting subgraph', icon: Cpu }
              ].map(algo => {
                const Icon = algo.icon;
                const isSelected = selectedAlgo === algo.id;
                return (
                  <button
                    key={algo.id}
                    onClick={() => {
                      setSelectedAlgo(algo.id);
                      setResult(null);
                      setError(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-semibold">{algo.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{algo.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Parameters */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Algorithm Parameters
            </span>

            {/* Source Node (for path, dominator, cut, disjoint) */}
            {['DIJKSTRA', 'K_SHORTEST_PATHS', 'DOMINATORS', 'MIN_CUT', 'DISJOINT_PATHS'].includes(selectedAlgo) && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Source / Root Node:</label>
                <select
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Source Node...</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      [{n.category}] {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target Node */}
            {['DIJKSTRA', 'K_SHORTEST_PATHS', 'DOMINATORS', 'MIN_CUT', 'DISJOINT_PATHS'].includes(selectedAlgo) && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Target Node {selectedAlgo === 'DOMINATORS' ? '(Optional)' : ''}:
                </label>
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Target Node...</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      [{n.category}] {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* K Value */}
            {selectedAlgo === 'K_SHORTEST_PATHS' && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">K Paths to Find: {kValue}</label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={kValue}
                  onChange={e => setKValue(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            {/* Disjoint Mode */}
            {selectedAlgo === 'DISJOINT_PATHS' && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Disjoint Mode:</label>
                <select
                  value={disjointMode}
                  onChange={e => setDisjointMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="VERTEX_DISJOINT">Vertex-Disjoint (Zero shared nodes)</option>
                  <option value="EDGE_DISJOINT">Edge-Disjoint (Zero shared edges)</option>
                </select>
              </div>
            )}

            {/* Steiner Terminals */}
            {selectedAlgo === 'STEINER_SUBGRAPH' && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Select Terminal Nodes ({selectedTerminals.length} selected):
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
                  {nodes.map(n => (
                    <label key={n.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedTerminals.includes(n.id)}
                        onChange={() => toggleTerminal(n.id)}
                        className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                      />
                      <span className="truncate">{n.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Output Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !error && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
              <Cpu className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
              <p className="text-sm font-medium">Select an algorithm and click "Run Algorithm" to compute results.</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
                All algorithms operate directly on the validated evidence graph and return deterministic forensic findings.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Computational Result
                </div>
                <h3 className="text-base font-semibold text-white">
                  {result.summary || `${selectedAlgo} Completed Successfully`}
                </h3>
              </div>

              {/* Path Display (Dijkstra, K-Paths) */}
              {(result.paths || (result.nodeIds && [result])) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Discovered Evidence Path(s)
                  </h4>
                  {(result.paths || [result]).map((p: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="flex items-center justify-between text-xs mb-3 font-mono">
                        <span className="font-bold text-slate-300">Path #{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold">
                          Total Cost: {p.totalCost?.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        {p.nodes?.map((n: any, nIdx: number) => (
                          <React.Fragment key={n.id}>
                            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
                              {n.label} <span className="text-[10px] text-slate-500">({n.type})</span>
                            </span>
                            {nIdx < p.nodes.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Articulation Points */}
              {result.articulationPoints && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Critical Intermediaries (Articulation Points)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.articulationPoints.map((ap: any) => (
                      <div key={ap.nodeId} className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 text-xs">
                        <span className="font-bold text-amber-400 block mb-0.5">{ap.label} ({ap.type})</span>
                        <p className="text-slate-400 text-[11px]">{ap.impactExplanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dominators */}
              {result.unavoidableNodesForTarget && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Unavoidable Choke Points (Dominators)
                  </h4>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    {result.unavoidableNodesForTarget.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.unavoidableNodesForTarget.map((u: any) => (
                          <span key={u.nodeId} className="px-2.5 py-1 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                            {u.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">No intermediate single-dominator choke points found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Min-Cut Containment */}
              {result.cutEdges && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recommended Containment Points (Cut Edges)
                  </h4>
                  <div className="space-y-2">
                    {result.cutEdges.map((ce: any) => (
                      <div key={ce.edgeId} className="p-3 rounded-lg bg-slate-900 border border-rose-500/30 text-xs flex items-center justify-between">
                        <span className="text-slate-200">
                          Sever <strong className="text-rose-400">{ce.type}</strong> from <span className="font-semibold text-white">{ce.sourceLabel}</span> to <span className="font-semibold text-white">{ce.targetLabel}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">Cap: {ce.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attack Patterns */}
              {Array.isArray(result) && result[0]?.patternId && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Attack Stage Motif Matching
                  </h4>
                  <div className="space-y-3">
                    {result.map((pat: any) => (
                      <div key={pat.patternId} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-100">{pat.patternName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${pat.isFullMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                            {pat.matchPercentage}% Matched
                          </span>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          {pat.matchedStages.map((s: any) => (
                            <div key={s.stageId} className="text-slate-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{s.stageName}: <strong className="text-white">{s.matchedNode.label}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
