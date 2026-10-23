import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  ArrowRight,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FileText,
  Key,
  Edit2,
  Save,
  RotateCcw
} from 'lucide-react';
import { GraphNode, GraphEdge, TemporalPrecision, EdgeStatus } from '../../types/graph';

interface InspectorPanelProps {
  selectedElement: { type: 'node' | 'edge'; id: string } | null;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onUpdateNode?: (id: string, updates: Partial<GraphNode>) => Promise<void>;
  onUpdateEdge?: (id: string, updates: Partial<GraphEdge>) => Promise<void>;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedElement,
  onClose,
  nodes,
  edges,
  onSelectElement,
  onDeleteNode,
  onDeleteEdge,
  onUpdateNode,
  onUpdateEdge
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Node Edit Fields
  const [editLabel, setEditLabel] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPrecision, setEditPrecision] = useState<TemporalPrecision>('SECOND');
  const [editSourceName, setEditSourceName] = useState('');
  const [editSourceKind, setEditSourceKind] = useState<string>('SYSTEM');
  const [editReliability, setEditReliability] = useState<number>(1.0);
  const [editPropertiesText, setEditPropertiesText] = useState('{}');

  // Edge Edit Fields
  const [editCost, setEditCost] = useState<number>(1.0);
  const [editConfidence, setEditConfidence] = useState<string>('');
  const [editStatus, setEditStatus] = useState<EdgeStatus>('OBSERVED');

  const isNode = selectedElement?.type === 'node';
  const node = isNode ? nodes.find(n => n.id === selectedElement.id) : null;
  const edge = !isNode && selectedElement ? edges.find(e => e.id === selectedElement.id) : null;

  useEffect(() => {
    setIsEditing(false);
    setEditError(null);
    if (isNode && node) {
      setEditLabel(node.label || '');
      setEditStartTime(node.time?.start ? node.time.start.slice(0, 16) : '');
      setEditEndTime(node.time?.end ? node.time.end.slice(0, 16) : '');
      setEditPrecision(node.time?.precision || 'SECOND');
      setEditSourceName(node.source?.name || '');
      setEditSourceKind(node.source?.kind || 'SYSTEM');
      setEditReliability(node.reliability !== undefined ? node.reliability : 1.0);
      setEditPropertiesText(JSON.stringify(node.properties || {}, null, 2));
    } else if (!isNode && edge) {
      setEditCost(edge.cost !== undefined ? edge.cost : 1.0);
      setEditConfidence(edge.confidence !== null && edge.confidence !== undefined ? String(edge.confidence) : '');
      setEditStatus(edge.status || 'OBSERVED');
      setEditPropertiesText(JSON.stringify(edge.properties || {}, null, 2));
    }
  }, [selectedElement, node, edge, isNode]);

  if (!selectedElement) return null;
  if (isNode && !node) return null;
  if (!isNode && !edge) return null;

  const outgoingEdges = isNode ? edges.filter(e => e.source === node!.id) : [];
  const incomingEdges = isNode ? edges.filter(e => e.target === node!.id) : [];

  const supportingEvidenceEdges = isNode
    ? edges.filter(e => e.target === node!.id && e.type === 'SUPPORTS')
    : [];
  const contradictingEvidenceEdges = isNode
    ? edges.filter(e => e.target === node!.id && e.type === 'CONTRADICTS')
    : [];

  const handleSaveNode = async () => {
    if (!node || !onUpdateNode) return;
    setEditLoading(true);
    setEditError(null);
    try {
      let parsedProps: Record<string, unknown> = {};
      try {
        parsedProps = JSON.parse(editPropertiesText);
      } catch (err: any) {
        throw new Error(`Properties JSON syntax error: ${err.message}`);
      }

      const updates: Partial<GraphNode> = {
        label: editLabel.trim(),
        properties: parsedProps
      };

      if (node.category === 'EVENT') {
        updates.time = {
          start: editStartTime ? new Date(editStartTime).toISOString() : undefined,
          end: editEndTime ? new Date(editEndTime).toISOString() : undefined,
          precision: editPrecision
        };
      }

      if (node.category === 'EVIDENCE') {
        updates.source = {
          name: editSourceName.trim() || 'Manual Input',
          kind: editSourceKind as any
        };
        updates.reliability = editReliability;
      }

      await onUpdateNode(node.id, updates);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update node.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdge = async () => {
    if (!edge || !onUpdateEdge) return;
    setEditLoading(true);
    setEditError(null);
    try {
      let parsedProps: Record<string, unknown> = {};
      try {
        parsedProps = JSON.parse(editPropertiesText);
      } catch (err: any) {
        throw new Error(`Properties JSON syntax error: ${err.message}`);
      }

      const costVal = Number(editCost);
      if (isNaN(costVal) || costVal < 0) {
        throw new Error('Traversal cost must be a non-negative number.');
      }

      let confVal: number | null = null;
      if (editConfidence.trim() !== '') {
        confVal = Number(editConfidence);
        if (isNaN(confVal) || confVal < 0 || confVal > 1) {
          throw new Error('Confidence must be between 0.0 and 1.0 (or empty).');
        }
      }

      const updates: Partial<GraphEdge> = {
        cost: costVal,
        confidence: confVal,
        status: editStatus,
        properties: parsedProps
      };

      await onUpdateEdge(edge.id, updates);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update edge.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <aside className="w-96 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-6rem)] select-none z-30 overflow-hidden">
      {/* Inspector Header */}
      <div className="h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2.5 truncate">
          <span
            className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase tracking-wider ${
              isNode
                ? node?.category === 'ENTITY'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
                  : node?.category === 'EVENT'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
            }`}
          >
            {isNode ? node?.category : 'RELATION'}
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {isNode ? node?.label : edge?.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(onUpdateNode || onUpdateEdge) && (
            <button
              onClick={() => {
                setEditError(null);
                setIsEditing(!isEditing);
              }}
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                isEditing
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Attributes'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error alert if edit failed */}
      {editError && (
        <div className="p-3 mx-4 mt-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="truncate">{editError}</span>
        </div>
      )}

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm scrollbar-thin">
        {isEditing ? (
          /* --- EDIT MODE --- */
          <div className="space-y-4">
            {isNode && node ? (
              <>
                <div>
                  <label className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                    Label
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 text-sm focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                {node.category === 'EVENT' && (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <span className="text-xs text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider block">
                      Temporal Interval
                    </span>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        value={editStartTime}
                        onChange={e => setEditStartTime(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        value={editEndTime}
                        onChange={e => setEditEndTime(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Precision</label>
                      <select
                        value={editPrecision}
                        onChange={e => setEditPrecision(e.target.value as any)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        {['SECOND', 'MINUTE', 'HOUR', 'DAY', 'UNKNOWN'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {node.category === 'EVIDENCE' && (
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider block">
                      Provenance Source
                    </span>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Source Name</label>
                      <input
                        type="text"
                        value={editSourceName}
                        onChange={e => setEditSourceName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Source Type</label>
                      <select
                        value={editSourceKind}
                        onChange={e => setEditSourceKind(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        {['LOG', 'SYSTEM', 'HUMAN', 'REPORT', 'SENSOR'].map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Reliability (0.0 to 1.0)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editReliability}
                        onChange={e => setEditReliability(parseFloat(e.target.value))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                    Properties (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={editPropertiesText}
                    onChange={e => setEditPropertiesText(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNode}
                    disabled={editLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </>
            ) : !isNode && edge ? (
              <>
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as EdgeStatus)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="OBSERVED">OBSERVED (Direct Proof)</option>
                      <option value="DERIVED">DERIVED (Algorithmic)</option>
                      <option value="HYPOTHESIZED">HYPOTHESIZED (Speculative)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Traversal Cost</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editCost}
                      onChange={e => setEditCost(parseFloat(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Confidence (Optional, 0.0 - 1.0)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={editConfidence}
                      onChange={e => setEditConfidence(e.target.value)}
                      placeholder="e.g. 0.85"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1.5">
                    Properties (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={editPropertiesText}
                    onChange={e => setEditPropertiesText(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 font-mono text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdge}
                    disabled={editLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          /* --- VIEW MODE --- */
          <div className="space-y-5">
            {isNode && node && (
              <>
                {/* Node Metadata Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                      Type
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold text-xs">
                      {node.type}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 truncate">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                      Identifier
                    </span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs truncate block" title={node.id}>
                      {node.id}
                    </span>
                  </div>
                </div>

                {/* Event Interval */}
                {node.category === 'EVENT' && node.time && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2">
                    <span className="text-xs text-amber-700 dark:text-amber-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Temporal Bounds
                    </span>
                    <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300 font-mono">
                      <div>Start: {node.time.start ? new Date(node.time.start).toLocaleString() : 'N/A'}</div>
                      {node.time.end && <div>End: {new Date(node.time.end).toLocaleString()}</div>}
                      <div className="text-zinc-400">Precision: {node.time.precision}</div>
                    </div>
                  </div>
                )}

                {/* Evidence Provenance */}
                {node.category === 'EVIDENCE' && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Provenance & Reliability
                    </span>
                    <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                      <div>Source: <span className="font-semibold">{node.source?.name || 'Manual'}</span> ({node.source?.kind || 'SYSTEM'})</div>
                      <div>Reliability: <span className="font-mono font-semibold">{((node.reliability ?? 1.0) * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>
                )}

                {/* Properties */}
                {node.properties && Object.keys(node.properties).length > 0 && (
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-2">
                      Structured Properties
                    </span>
                    <pre className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 overflow-x-auto">
                      {JSON.stringify(node.properties, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Direct Evidence Links */}
                {(supportingEvidenceEdges.length > 0 || contradictingEvidenceEdges.length > 0) && (
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                      Direct Evidence Links
                    </span>

                    {supportingEvidenceEdges.map(e => {
                      const evNode = nodes.find(n => n.id === e.source);
                      return (
                        <button
                          key={e.id}
                          onClick={() => onSelectElement({ type: 'node', id: e.source })}
                          className="w-full text-left p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between transition cursor-pointer"
                        >
                          <div className="truncate">
                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block">
                              SUPPORTS
                            </span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs truncate block">
                              {evNode?.label || e.source}
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        </button>
                      );
                    })}

                    {contradictingEvidenceEdges.map(e => {
                      const evNode = nodes.find(n => n.id === e.source);
                      return (
                        <button
                          key={e.id}
                          onClick={() => onSelectElement({ type: 'node', id: e.source })}
                          className="w-full text-left p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-between transition cursor-pointer"
                        >
                          <div className="truncate">
                            <span className="text-xs text-rose-700 dark:text-rose-400 font-bold block">
                              CONTRADICTS
                            </span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs truncate block">
                              {evNode?.label || e.source}
                            </span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Connected Relationships */}
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                    Connections ({outgoingEdges.length + incomingEdges.length})
                  </span>

                  {outgoingEdges.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-zinc-400 block font-medium">Outgoing:</span>
                      {outgoingEdges.map(e => {
                        const targetNode = nodes.find(n => n.id === e.target);
                        return (
                          <button
                            key={e.id}
                            onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                            className="w-full text-left px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between transition text-xs cursor-pointer"
                          >
                            <span className="text-teal-600 dark:text-teal-400 font-mono font-semibold truncate">{e.type}</span>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">
                              <ArrowRight className="w-3 h-3 text-zinc-400" />
                              <span className="truncate">{targetNode?.label || e.target}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {incomingEdges.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs text-zinc-400 block font-medium">Incoming:</span>
                      {incomingEdges.map(e => {
                        const sourceNode = nodes.find(n => n.id === e.source);
                        return (
                          <button
                            key={e.id}
                            onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                            className="w-full text-left px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between transition text-xs cursor-pointer"
                          >
                            <span className="text-teal-600 dark:text-teal-400 font-mono font-semibold truncate">{e.type}</span>
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">
                              <span className="text-zinc-400">from</span>
                              <span className="truncate">{sourceNode?.label || e.source}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => onDeleteNode(node.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-semibold flex items-center justify-center gap-2 transition text-xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Node Fact</span>
                  </button>
                </div>
              </>
            )}

            {!isNode && edge && (
              <>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1">
                      Relationship Type
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-mono font-bold text-base">{edge.type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1">Status</span>
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                        {edge.status}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block mb-1">Cost</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs font-semibold">{edge.cost}</span>
                    </div>
                  </div>
                </div>

                {/* Endpoints */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">
                    Endpoints
                  </span>
                  <div className="space-y-1.5">
                    {(() => {
                      const src = nodes.find(n => n.id === edge.source);
                      return (
                        <button
                          onClick={() => onSelectElement({ type: 'node', id: edge.source })}
                          className="w-full text-left p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 flex items-center justify-between transition cursor-pointer"
                        >
                          <div>
                            <span className="text-xs text-zinc-400 block">Source</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{src?.label || edge.source}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      );
                    })()}

                    {(() => {
                      const tgt = nodes.find(n => n.id === edge.target);
                      return (
                        <button
                          onClick={() => onSelectElement({ type: 'node', id: edge.target })}
                          className="w-full text-left p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800 flex items-center justify-between transition cursor-pointer"
                        >
                          <div>
                            <span className="text-xs text-zinc-400 block">Target</span>
                            <span className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{tgt?.label || edge.target}</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Evidence References */}
                <div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Evidence References ({edge.evidenceRefs.length})
                  </span>
                  {edge.evidenceRefs.length === 0 ? (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400 italic">
                      {edge.status === 'OBSERVED' ? 'No direct evidence linked.' : 'Derived or hypothesized relation.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {edge.evidenceRefs.map(refId => {
                        const evNode = nodes.find(n => n.id === refId);
                        return (
                          <button
                            key={refId}
                            onClick={() => onSelectElement({ type: 'node', id: refId })}
                            className="w-full text-left p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between transition text-xs cursor-pointer"
                          >
                            <span className="text-emerald-800 dark:text-emerald-300 font-medium truncate">
                              {evNode?.label || refId}
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => onDeleteEdge(edge.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-semibold flex items-center justify-center gap-2 transition text-xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Relationship</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
