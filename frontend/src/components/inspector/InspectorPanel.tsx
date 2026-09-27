import React, { useState, useEffect } from 'react';
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

  // Initialize edit fields whenever selectedElement changes
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

  if (!selectedElement) {
    return null;
  }

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
    <aside className="w-84 max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[calc(100vh-6rem)] select-none z-30 overflow-hidden">
      {/* Inspector Header */}
      <div className="h-10 px-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
              isNode
                ? node?.category === 'ENTITY'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : node?.category === 'EVENT'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
            }`}
          >
            {isNode ? node?.category : 'RELATION'}
          </span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {isNode ? node?.label : edge?.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(onUpdateNode || onUpdateEdge) && (
            <button
              onClick={() => {
                setEditError(null);
                setIsEditing(!isEditing);
              }}
              className={`p-1 rounded text-xs transition ${
                isEditing
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isEditing ? 'Cancel Edit' : 'Edit Attributes'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close Panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error alert if edit failed */}
      {editError && (
        <div className="p-2.5 mx-3 mt-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="truncate">{editError}</span>
        </div>
      )}

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs scrollbar-thin">
        {isEditing ? (
          /* --- EDIT MODE --- */
          <div className="space-y-3">
            {isNode && node ? (
              <>
                <div>
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {node.category === 'EVENT' && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold block">
                      Temporal Interval
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Start Time</label>
                      <input
                        type="datetime-local"
                        value={editStartTime}
                        onChange={e => setEditStartTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">End Time</label>
                      <input
                        type="datetime-local"
                        value={editEndTime}
                        onChange={e => setEditEndTime(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Precision</label>
                      <select
                        value={editPrecision}
                        onChange={e => setEditPrecision(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                      >
                        {['SECOND', 'MINUTE', 'HOUR', 'DAY', 'UNKNOWN'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {node.category === 'EVIDENCE' && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">
                      Evidence Source
                    </span>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Source Name</label>
                      <input
                        type="text"
                        value={editSourceName}
                        onChange={e => setEditSourceName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Reliability ({Math.round(editReliability * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editReliability}
                        onChange={e => setEditReliability(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded accent-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Custom Properties (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={editPropertiesText}
                    onChange={e => setEditPropertiesText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveNode}
                    disabled={editLoading}
                    className="flex-1 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editLoading ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : edge ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                      Cost (w &ge; 0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={editCost}
                      onChange={e => setEditCost(parseFloat(e.target.value))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                      Confidence
                    </label>
                    <input
                      type="text"
                      placeholder="0.0 - 1.0"
                      value={editConfidence}
                      onChange={e => setEditConfidence(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-800 dark:text-slate-200 text-xs"
                  >
                    <option value="OBSERVED">OBSERVED</option>
                    <option value="DERIVED">DERIVED</option>
                    <option value="HYPOTHESIZED">HYPOTHESIZED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Custom Properties (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={editPropertiesText}
                    onChange={e => setEditPropertiesText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-slate-800 dark:text-slate-200 font-mono text-[11px]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleSaveEdge}
                    disabled={editLoading}
                    className="flex-1 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editLoading ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          /* --- READ / INSPECTION VIEW --- */
          <>
            {/* Node Details */}
            {isNode && node && (
              <>
                {/* Basic Info */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">Label</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{node.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">Type</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{node.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">ID</span>
                      <span className="text-slate-400 font-mono text-[10px] truncate block" title={node.id}>
                        {node.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Specific: Temporal Info */}
                {node.category === 'EVENT' && node.time && (
                  <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Temporal Interval</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Start:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono">{node.time.start || 'Unspecified'}</span>
                      </div>
                      {node.time.end && (
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px]">End:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{node.time.end}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Precision:</span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono">{node.time.precision}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Specific: Source & Reliability */}
                {node.category === 'EVIDENCE' && (
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Evidence Provenance</span>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Source:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{node.source?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Kind:</span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono">{node.source?.kind}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Reliability:</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(node.reliability ?? 1.0) * 100}%` }}
                            />
                          </div>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                            {Math.round((node.reliability ?? 1.0) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Properties */}
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Properties
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-[11px] font-mono max-h-36 overflow-y-auto">
                    {Object.keys(node.properties || {}).length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500 italic">No custom attributes</span>
                    ) : (
                      <dl className="space-y-1">
                        {Object.entries(node.properties).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <dt className="text-slate-500 truncate">{k}:</dt>
                            <dd className="text-slate-800 dark:text-slate-200 font-medium truncate">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>

                {/* Provenance: Supporting / Contradicting Evidence */}
                {(supportingEvidenceEdges.length > 0 || contradictingEvidenceEdges.length > 0) && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                      Direct Evidence Links
                    </span>

                    {supportingEvidenceEdges.map(e => {
                      const evNode = nodes.find(n => n.id === e.source);
                      return (
                        <button
                          key={e.id}
                          onClick={() => onSelectElement({ type: 'node', id: e.source })}
                          className="w-full text-left p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between transition"
                        >
                          <div className="truncate">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                              SUPPORTS
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium truncate block">
                              {evNode?.label || e.source}
                            </span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        </button>
                      );
                    })}

                    {contradictingEvidenceEdges.map(e => {
                      const evNode = nodes.find(n => n.id === e.source);
                      return (
                        <button
                          key={e.id}
                          onClick={() => onSelectElement({ type: 'node', id: e.source })}
                          className="w-full text-left p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-between transition"
                        >
                          <div className="truncate">
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold block">
                              CONTRADICTS
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium truncate block">
                              {evNode?.label || e.source}
                            </span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Connected Relationships Navigation */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                    Connections ({outgoingEdges.length + incomingEdges.length})
                  </span>

                  {outgoingEdges.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Outgoing:</span>
                      {outgoingEdges.map(e => {
                        const targetNode = nodes.find(n => n.id === e.target);
                        return (
                          <button
                            key={e.id}
                            onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                            className="w-full text-left px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition text-[11px]"
                          >
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono truncate">{e.type}</span>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{targetNode?.label || e.target}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {incomingEdges.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Incoming:</span>
                      {incomingEdges.map(e => {
                        const sourceNode = nodes.find(n => n.id === e.source);
                        return (
                          <button
                            key={e.id}
                            onClick={() => onSelectElement({ type: 'edge', id: e.id })}
                            className="w-full text-left px-2 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition text-[11px]"
                          >
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono truncate">{e.type}</span>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                              <span className="text-slate-400">from</span>
                              <span className="truncate">{sourceNode?.label || e.source}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => onDeleteNode(node.id)}
                    className="w-full py-1.5 px-3 rounded-md bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-medium flex items-center justify-center gap-1.5 transition text-xs"
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
                {/* Edge Basic Info */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                      Relationship
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-mono font-bold text-sm">{edge.type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">Status</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          edge.status === 'OBSERVED'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : edge.status === 'DERIVED'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {edge.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                        Cost
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{edge.cost}</span>
                    </div>
                  </div>
                </div>

                {/* Connected Nodes */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">
                    Endpoints
                  </span>
                  <div className="space-y-1">
                    {(() => {
                      const src = nodes.find(n => n.id === edge.source);
                      return (
                        <button
                          onClick={() => onSelectElement({ type: 'node', id: edge.source })}
                          className="w-full text-left p-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 flex items-center justify-between transition"
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 block">Source</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{src?.label || edge.source}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      );
                    })()}

                    {(() => {
                      const tgt = nodes.find(n => n.id === edge.target);
                      return (
                        <button
                          onClick={() => onSelectElement({ type: 'node', id: edge.target })}
                          className="w-full text-left p-1.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 flex items-center justify-between transition"
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 block">Target</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">{tgt?.label || edge.target}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Provenance: Supporting Evidence References */}
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Evidence References ({edge.evidenceRefs.length})
                  </span>

                  {edge.evidenceRefs.length === 0 ? (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
                      {edge.status === 'OBSERVED'
                        ? 'No evidence linked'
                        : 'Hypothesized / Derived relationship without primary evidence.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {edge.evidenceRefs.map(evId => {
                        const evNode = nodes.find(n => n.id === evId);
                        return (
                          <button
                            key={evId}
                            onClick={() => onSelectElement({ type: 'node', id: evId })}
                            className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">
                                  {evNode?.label || evId}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {evNode?.source?.name || 'Unknown'} (
                                {Math.round((evNode?.reliability ?? 1.0) * 100)}% reliability)
                              </span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Properties */}
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-1">
                    Properties
                  </span>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-[11px] font-mono max-h-36 overflow-y-auto">
                    {Object.keys(edge.properties || {}).length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500 italic">No custom attributes</span>
                    ) : (
                      <dl className="space-y-1">
                        {Object.entries(edge.properties).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <dt className="text-slate-500 truncate">{k}:</dt>
                            <dd className="text-slate-800 dark:text-slate-200 font-medium truncate">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => onDeleteEdge(edge.id)}
                    className="w-full py-1.5 px-3 rounded-md bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-medium flex items-center justify-center gap-1.5 transition text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Relationship</span>
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
