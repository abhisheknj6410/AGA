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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Graph Analysis Engine</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic graph algorithms as the primary investigative computational engine
            </p>
          </div>
        </div>

        <button
          onClick={handleExecute}
          disabled={isRunning}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition-all disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Computing...' : 'Run Algorithm'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Algorithm Selection & Parameters Panel */}
        <div className="w-72 border-r border-slate-200/80 dark:border-slate-800/80 p-4 overflow-y-auto space-y-5 bg-white dark:bg-slate-900 scrollbar-thin">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              Select Graph Algorithm
            </label>
            <div className="space-y-1">
              {[
                { id: 'DIJKSTRA', name: 'Weighted Shortest Path', desc: 'Lowest-cost evidence route', icon: Route },
                { id: 'K_SHORTEST_PATHS', name: 'K-Shortest Paths', desc: 'Alternative corridors', icon: Split },
                { id: 'ARTICULATION_POINTS', name: 'Articulation Points', desc: 'Critical intermediaries & bridges', icon: GitCommit },
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
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="font-semibold text-[11px] truncate">{algo.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{algo.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Parameters */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Parameters
            </span>

            {/* Source Node */}
            {['DIJKSTRA', 'K_SHORTEST_PATHS', 'DOMINATORS', 'MIN_CUT', 'DISJOINT_PATHS'].includes(selectedAlgo) && (
              <div>
                <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Source / Root Node:</label>
                <select
                  value={sourceId}
                  onChange={e => setSourceId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
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
                <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                  Target Node {selectedAlgo === 'DOMINATORS' ? '(Optional)' : ''}:
                </label>
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
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
                <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">K Paths to Find: {kValue}</label>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={kValue}
                  onChange={e => setKValue(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Disjoint Mode */}
            {selectedAlgo === 'DISJOINT_PATHS' && (
              <div>
                <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Disjoint Mode:</label>
                <select
                  value={disjointMode}
                  onChange={e => setDisjointMode(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="VERTEX_DISJOINT">Vertex-Disjoint</option>
                  <option value="EDGE_DISJOINT">Edge-Disjoint</option>
                </select>
              </div>
            )}

            {/* Steiner Terminals */}
            {selectedAlgo === 'STEINER_SUBGRAPH' && (
              <div>
                <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">
                  Terminal Nodes ({selectedTerminals.length}):
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-md border border-slate-200 dark:border-slate-800 text-xs">
                  {nodes.map(n => (
                    <label key={n.id} className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedTerminals.includes(n.id)}
                        onChange={() => toggleTerminal(n.id)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="truncate text-[11px]">{n.label}</span>
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
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !error && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
              <Cpu className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Select an algorithm and click "Run Algorithm".</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm text-center">
                All algorithms operate directly on the evidence-constrained graph and return deterministic forensic findings.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-5">
              {/* Summary Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Computational Result
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {result.summary || `${selectedAlgo} Completed Successfully`}
                </h3>
              </div>

              {/* Path Display (Dijkstra, K-Paths) */}
              {(result.paths || (result.nodeIds && [result])) && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Discovered Evidence Path(s)
                  </h4>
                  {(result.paths || [result]).map((p: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-2 font-mono">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Path #{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold text-[11px]">
                          Cost: {p.totalCost?.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                        {p.nodes?.map((n: any, nIdx: number) => (
                          <React.Fragment key={n.id}>
                            <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px]">
                              {n.label} <span className="text-[10px] text-slate-400">({n.type})</span>
                            </span>
                            {nIdx < p.nodes.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-400" />
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
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Critical Intermediaries (Articulation Points)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {result.articulationPoints.map((ap: any) => (
                      <div key={ap.nodeId} className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                        <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">{ap.label} ({ap.type})</span>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">{ap.impactExplanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dominators */}
              {result.unavoidableNodesForTarget && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Unavoidable Choke Points (Dominators)
                  </h4>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                    {result.unavoidableNodesForTarget.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.unavoidableNodesForTarget.map((u: any) => (
                          <span key={u.nodeId} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold font-mono text-[11px]">
                            {u.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No intermediate single-dominator choke points found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Min-Cut Containment */}
              {result.cutEdges && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Recommended Containment Points (Cut Edges)
                  </h4>
                  <div className="space-y-1.5">
                    {result.cutEdges.map((ce: any) => (
                      <div key={ce.edgeId} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between shadow-xs">
                        <span className="text-slate-700 dark:text-slate-300">
                          Sever <strong className="text-rose-600 dark:text-rose-400">{ce.type}</strong> from <span className="font-semibold text-slate-900 dark:text-slate-100">{ce.sourceLabel}</span> to <span className="font-semibold text-slate-900 dark:text-slate-100">{ce.targetLabel}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Cost: {ce.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attack Patterns */}
              {Array.isArray(result) && result[0]?.patternId && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Attack Stage Motif Matching
                  </h4>
                  <div className="space-y-2.5">
                    {result.map((pat: any) => (
                      <div key={pat.patternId} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{pat.patternName}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${pat.isFullMatch ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {pat.matchPercentage}% Matched
                          </span>
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          {pat.matchedStages.map((s: any) => (
                            <div key={s.stageId} className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{s.stageName}: <strong className="text-slate-800 dark:text-slate-100">{s.matchedNode.label}</strong></span>
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
