import React from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  Link,
  ArrowRight,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FileText,
  Key
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';

interface InspectorPanelProps {
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedElement,
  onClose,
  nodes,
  edges,
  onSelectElement,
  onDeleteNode,
  onDeleteEdge
}) => {
  if (!selectedElement) {
    return (
      <aside className="w-80 bg-slate-900/95 border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center select-none text-slate-500 text-xs">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-slate-400">
          <Link className="w-5 h-5" />
        </div>
        <p className="font-medium text-slate-400 mb-1">No Element Selected</p>
        <p className="text-[11px] text-slate-600">
          Click any entity, event, evidence node, or relationship edge to inspect its full properties and provenance.
        </p>
      </aside>
    );
  }

  const isNode = selectedElement.type === 'node';
  const node = isNode ? nodes.find(n => n.id === selectedElement.id) : null;
  const edge = !isNode ? edges.find(e => e.id === selectedElement.id) : null;

  if (isNode && !node) return null;
  if (!isNode && !edge) return null;

  // Node relationship helpers
  const outgoingEdges = isNode ? edges.filter(e => e.source === node!.id) : [];
  const incomingEdges = isNode ? edges.filter(e => e.target === node!.id) : [];

  // Supporting & Contradicting evidence for node
  const supportingEvidenceEdges = isNode
    ? edges.filter(e => e.target === node!.id && e.type === 'SUPPORTS')
    : [];
  const contradictingEvidenceEdges = isNode
    ? edges.filter(e => e.target === node!.id && e.type === 'CONTRADICTS')
    : [];

  // For evidence nodes: facts it supports/contradicts
  const supportedFacts = node?.category === 'EVIDENCE'
    ? edges.filter(e => e.source === node!.id && e.type === 'SUPPORTS')
    : [];
  const contradictedFacts = node?.category === 'EVIDENCE'
    ? edges.filter(e => e.source === node!.id && e.type === 'CONTRADICTS')
    : [];

  return (
    <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col h-[calc(100vh-3.5rem-2rem)] select-none">
      {/* Inspector Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
              isNode
                ? node?.category === 'ENTITY'
                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                  : node?.category === 'EVENT'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
            }`}
          >
            {isNode ? node?.category : 'RELATIONSHIP'}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate">
            {isNode ? node?.label : edge?.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Node Details */}
        {isNode && node && (
          <>
            {/* Basic Info */}
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Label</span>
                <span className="text-slate-100 font-medium text-sm">{node.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Type</span>
                  <span className="text-slate-300 font-mono text-[11px]">{node.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">ID</span>
                  <span className="text-slate-400 font-mono text-[10px] truncate block" title={node.id}>
                    {node.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Specific: Temporal Info */}
            {node.category === 'EVENT' && node.time && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Temporal Interval</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Start Time:</span>
                    <span className="text-slate-200 font-mono">{node.time.start || 'Unspecified'}</span>
                  </div>
                  {node.time.end && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">End Time:</span>
                      <span className="text-slate-200 font-mono">{node.time.end}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block text-[10px]">Precision:</span>
                    <span className="text-slate-300 font-mono">{node.time.precision}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Specific: Source & Reliability */}
            {node.category === 'EVIDENCE' && (
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Evidence Provenance</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Source Name:</span>
                    <span className="text-slate-200 font-medium">{node.source?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Source Kind:</span>
                    <span className="text-slate-300 font-mono">{node.source?.kind}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Reliability:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(node.reliability ?? 1.0) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {Math.round((node.reliability ?? 1.0) * 100)}%
                      </span>
                    </div>
                  </div>
                  {node.hashChecksum && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">SHA-256 Checksum:</span>
                      <span className="text-slate-400 font-mono text-[9px] break-all">
                        {node.hashChecksum}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Properties */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5">
                Properties
              </span>
              <div className="bg-slate-950 rounded border border-slate-800 p-2 text-[11px] font-mono max-h-40 overflow-y-auto">
                {Object.keys(node.properties || {}).length === 0 ? (
                  <span className="text-slate-600">No custom properties</span>
                ) : (
                  <dl className="space-y-1">
                    {Object.entries(node.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <dt className="text-slate-400 truncate">{k}:</dt>
                        <dd className="text-slate-200 font-semibold truncate">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>

            {/* Connected Relationships */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5">
                Connected Relationships ({outgoingEdges.length + incomingEdges.length})
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {outgoingEdges.map(e => {
                  const targetNode = nodes.find(n => n.id === e.target);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                      className="w-full text-left p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-[11px] transition"
                    >
                      <div className="flex items-center gap-1 text-indigo-300 truncate">
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="font-mono text-[10px]">{e.type}</span>
                        <span className="text-slate-400 truncate">&rarr; {targetNode?.label}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{e.status}</span>
                    </button>
                  );
                })}

                {incomingEdges.map(e => {
                  const sourceNode = nodes.find(n => n.id === e.source);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                      className="w-full text-left p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-[11px] transition"
                    >
                      <div className="flex items-center gap-1 text-slate-300 truncate">
                        <span className="text-slate-400 truncate">{sourceNode?.label}</span>
                        <span className="font-mono text-[10px] text-indigo-400">&rarr; {e.type}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono">{e.status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contradiction Alert if present */}
            {contradictedFacts.length > 0 && (
              <div className="p-2 rounded bg-red-950/40 border border-red-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-red-400 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Contradiction Detected</span>
                </div>
                <p className="text-[10px] text-red-300/90 leading-relaxed">
                  This evidence contradicts {contradictedFacts.length} other record(s) in the graph.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onDeleteNode(node.id)}
                className="w-full py-1.5 px-3 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60 font-medium flex items-center justify-center gap-1.5 transition text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            </div>
          </>
        )}

        {/* Edge Details */}
        {!isNode && edge && (
          <>
            {/* Relationship Info */}
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Type</span>
                <span className="text-indigo-300 font-mono text-sm font-bold">{edge.type}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Status</span>
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      edge.status === 'OBSERVED'
                        ? 'text-indigo-400'
                        : edge.status === 'DERIVED'
                        ? 'text-purple-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {edge.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Traversal Cost
                  </span>
                  <span className="text-slate-200 font-mono text-[11px]">{edge.cost}</span>
                </div>
              </div>
            </div>

            {/* Source & Target Navigation */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Connected Nodes
              </span>
              <div className="space-y-1.5">
                {(() => {
                  const src = nodes.find(n => n.id === edge.source);
                  return (
                    <button
                      onClick={() => onSelectElement({ type: 'node', id: edge.source })}
                      className="w-full text-left p-1.5 rounded hover:bg-slate-800 flex items-center justify-between transition"
                    >
                      <div>
                        <span className="text-[10px] text-slate-500 block">Source</span>
                        <span className="text-slate-200 font-medium">{src?.label || edge.source}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                  );
                })()}

                {(() => {
                  const tgt = nodes.find(n => n.id === edge.target);
                  return (
                    <button
                      onClick={() => onSelectElement({ type: 'node', id: edge.target })}
                      className="w-full text-left p-1.5 rounded hover:bg-slate-800 flex items-center justify-between transition"
                    >
                      <div>
                        <span className="text-[10px] text-slate-500 block">Target</span>
                        <span className="text-slate-200 font-medium">{tgt?.label || edge.target}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Provenance: Supporting Evidence References */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Supporting Evidence Provenance ({edge.evidenceRefs.length})
              </span>

              {edge.evidenceRefs.length === 0 ? (
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-500 italic">
                  {edge.status === 'OBSERVED'
                    ? 'No evidence linked (validation anomaly)'
                    : 'Hypothesized / Derived relationship without direct primary evidence.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {edge.evidenceRefs.map(evId => {
                    const evNode = nodes.find(n => n.id === evId);
                    return (
                      <button
                        key={evId}
                        onClick={() => onSelectElement({ type: 'node', id: evId })}
                        className="w-full text-left p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 flex items-center justify-between transition"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded bg-emerald-400" />
                            <span className="font-medium text-slate-200 text-xs truncate">
                              {evNode?.label || evId}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Source: {evNode?.source?.name || 'Unknown'} (
                            {Math.round((evNode?.reliability ?? 1.0) * 100)}% reliability)
                          </span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Properties */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5">
                Properties
              </span>
              <div className="bg-slate-950 rounded border border-slate-800 p-2 text-[11px] font-mono max-h-36 overflow-y-auto">
                {Object.keys(edge.properties || {}).length === 0 ? (
                  <span className="text-slate-600">No custom properties</span>
                ) : (
                  <dl className="space-y-1">
                    {Object.entries(edge.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <dt className="text-slate-400 truncate">{k}:</dt>
                        <dd className="text-slate-200 font-semibold truncate">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onDeleteEdge(edge.id)}
                className="w-full py-1.5 px-3 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60 font-medium flex items-center justify-center gap-1.5 transition text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Relationship</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
