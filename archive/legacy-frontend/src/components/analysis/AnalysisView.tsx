import React, { useState } from 'react';
import { GraphPayload } from '../../types/graph';
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
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Deterministic Graph Algorithms</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Rigorous graph theory as the primary computational engine (shortest path, dominators, cuts, bottlenecks)
            </p>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Computing...' : 'Run Algorithm'}</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Algorithm Selection & Parameters Panel */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 p-5 overflow-y-auto space-y-6 bg-white dark:bg-zinc-950 scrollbar-thin">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-2.5">
              Select Graph Algorithm
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'DIJKSTRA', name: 'Weighted Shortest Path', desc: 'Lowest-cost evidence route', icon: Route },
                { id: 'K_SHORTEST_PATHS', name: 'K-Shortest Paths', desc: 'Alternative corridors', icon: Split },
                { id: 'ARTICULATION_POINTS', name: 'Articulation Points', desc: 'Critical single points of failure', icon: GitCommit },
                { id: 'DOMINATORS', name: 'Dominator Tree', desc: 'Unavoidable choke points', icon: GitMerge },
                { id: 'MIN_CUT', name: 'Minimum s-t Cut', desc: 'Containment barriers', icon: Scissors },
                { id: 'DISJOINT_PATHS', name: 'Disjoint Paths', desc: 'Independent corroboration', icon: Share2 },
                { id: 'TEMPORAL_ANALYSIS', name: 'Temporal & Ambiguity', desc: 'Topological order gaps', icon: Clock },
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
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400'}`} />
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{algo.name}</div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{algo.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Parameters */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
              Execution Parameters
            </span>

            {/* Source Node */}
            {['DIJKSTRA', 'K_SHORTEST_PATHS', 'DOMINATORS', 'MIN_CUT', 'DISJOINT_PATHS'].includes(selectedAlgo) && (
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block mb-1.5">Source / Root Node:</label>
                <select
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-teal-500 cursor-pointer"
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
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block mb-1.5">
                  Target Node {selectedAlgo === 'DOMINATORS' ? '(Optional)' : ''}:
                </label>
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-teal-500 cursor-pointer"
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
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block mb-1.5">K Alternative Paths: {kValue}</label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={kValue}
                  onChange={e => setKValue(Number(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>
            )}

            {/* Disjoint Mode */}
            {selectedAlgo === 'DISJOINT_PATHS' && (
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block mb-1.5">Disjoint Mode:</label>
                <select
                  value={disjointMode}
                  onChange={e => setDisjointMode(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
                >
                  <option value="VERTEX_DISJOINT">Vertex-Disjoint (Zero Shared Nodes)</option>
                  <option value="EDGE_DISJOINT">Edge-Disjoint (Zero Shared Links)</option>
                </select>
              </div>
            )}

            {/* Steiner Terminals */}
            {selectedAlgo === 'STEINER_SUBGRAPH' && (
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block mb-1.5">
                  Terminal Nodes ({selectedTerminals.length}):
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
                  {nodes.map(n => (
                    <label key={n.id} className="flex items-center gap-2.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={selectedTerminals.includes(n.id)}
                        onChange={() => toggleTerminal(n.id)}
                        className="rounded border-zinc-300 text-teal-600 accent-teal-600 cursor-pointer"
                      />
                      <span className="truncate text-xs">{n.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Output Area */}
        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3 mb-5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !error && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-20">
              <Cpu className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Select an algorithm and run deterministic computation.</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-md text-center leading-relaxed">
                All algorithms operate mathematically on the evidence graph constraints and produce deterministic, reproducible forensic proofs.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 max-w-4xl">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Computational Finding
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {result.summary || `${selectedAlgo} Finished Successfully`}
                </h3>
              </div>

              {/* Path Display */}
              {(result.paths || (result.nodeIds && [result])) && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Discovered Evidence Path(s)
                  </h4>
                  {(result.paths || [result]).map((p: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-3 font-mono">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Path #{idx + 1}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-xs">
                          Total Traversal Cost: {p.totalCost?.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        {p.nodes?.map((n: any, nIdx: number) => (
                          <React.Fragment key={n.id}>
                            <span className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                              {n.label} <span className="text-zinc-400">({n.type})</span>
                            </span>
                            {nIdx < p.nodes.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Critical Intermediaries (Articulation Points)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.articulationPoints.map((ap: any) => (
                      <div key={ap.nodeId} className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                        <span className="font-bold text-amber-900 dark:text-amber-200 block mb-1 text-sm">{ap.label} ({ap.type})</span>
                        <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">{ap.impactExplanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dominators */}
              {result.unavoidableNodesForTarget && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Unavoidable Choke Points (Dominators)
                  </h4>
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs shadow-xs">
                    {result.unavoidableNodesForTarget.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.unavoidableNodesForTarget.map((u: any) => (
                          <span key={u.nodeId} className="px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold font-mono text-xs">
                            {u.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-400 italic text-xs">No intermediate single-dominator choke points found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Min-Cut Containment */}
              {result.cutEdges && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Recommended Containment Barriers (Minimum s-t Cut)
                  </h4>
                  <div className="space-y-2">
                    {result.cutEdges.map((ce: any) => (
                      <div key={ce.edgeId} className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between shadow-xs">
                        <span className="text-zinc-700 dark:text-zinc-300 text-xs">
                          Sever <strong className="text-rose-600 dark:text-rose-400">{ce.type}</strong> from <span className="font-semibold text-zinc-900 dark:text-zinc-100">{ce.sourceLabel}</span> to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{ce.targetLabel}</span>
                        </span>
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">Cost: {ce.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attack Patterns */}
              {Array.isArray(result) && result[0]?.patternId && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Attack Stage Motif Matching
                  </h4>
                  <div className="space-y-3">
                    {result.map((pat: any) => (
                      <div key={pat.patternId} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{pat.patternName}</span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${pat.isFullMatch ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                            {pat.matchPercentage}% Matched
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          {pat.matchedStages.map((s: any) => (
                            <div key={s.stageId} className="text-zinc-600 dark:text-zinc-300 flex items-center gap-2 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>{s.stageName}: <strong className="text-zinc-800 dark:text-zinc-100">{s.matchedNode.label}</strong></span>
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
