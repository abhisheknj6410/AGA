import React, { useState, useMemo } from 'react';
import { X, Link, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EDGE_TYPES, GraphNode, GraphEdge, EdgeType, EdgeStatus } from '../../types/graph';

interface AddEdgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  onSubmit: (edge: Partial<GraphEdge>) => Promise<void>;
}

export const AddEdgeModal: React.FC<AddEdgeModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onSubmit
}) => {
  if (!isOpen) return null;

  const [sourceId, setSourceId] = useState<string>(nodes[0]?.id || '');
  const [targetId, setTargetId] = useState<string>(nodes[1]?.id || '');
  const [type, setType] = useState<EdgeType>('PERFORMED');
  const [status, setStatus] = useState<EdgeStatus>('OBSERVED');
  const [cost, setCost] = useState<number>(1.0);
  const [confidence, setConfidence] = useState<string>('0.9');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const evidenceNodes = useMemo(() => nodes.filter(n => n.category === 'EVIDENCE'), [nodes]);
  const sourceNode = useMemo(() => nodes.find(n => n.id === sourceId), [nodes, sourceId]);
  const targetNode = useMemo(() => nodes.find(n => n.id === targetId), [nodes, targetId]);

  // Client-side live direction validation
  const directionCheck = useMemo(() => {
    if (!sourceNode || !targetNode) return { valid: false, reason: 'Source and target nodes required.' };

    const srcCat = sourceNode.category;
    const tgtCat = targetNode.category;

    // Vocabulary rules
    if (['OWNS', 'USES', 'LOCATED_AT', 'MEMBER_OF', 'ASSOCIATED_WITH', 'CONTACTED'].includes(type)) {
      if (srcCat !== 'ENTITY' || tgtCat !== 'ENTITY') {
        return { valid: false, reason: `'${type}' requires ENTITY source and ENTITY target.` };
      }
    } else if (['PERFORMED', 'INITIATED', 'PARTICIPATED_IN'].includes(type)) {
      if (srcCat !== 'ENTITY' || tgtCat !== 'EVENT') {
        return { valid: false, reason: `'${type}' requires ENTITY source and EVENT target.` };
      }
    } else if (['TARGETED', 'AFFECTED', 'ACCESSED', 'CREATED', 'MODIFIED', 'DELETED', 'USED'].includes(type)) {
      if (srcCat !== 'EVENT' || tgtCat !== 'ENTITY') {
        return { valid: false, reason: `'${type}' requires EVENT source and ENTITY target.` };
      }
    } else if (['PRECEDED', 'CAUSED', 'DEPENDS_ON', 'TRIGGERED'].includes(type)) {
      if (srcCat !== 'EVENT' || tgtCat !== 'EVENT') {
        return { valid: false, reason: `'${type}' requires EVENT source and EVENT target.` };
      }
    } else if (type === 'CONNECTED_TO') {
      if ((srcCat !== 'ENTITY' && srcCat !== 'EVENT') || tgtCat !== 'ENTITY') {
        return { valid: false, reason: `'CONNECTED_TO' requires ENTITY/EVENT source and ENTITY target.` };
      }
    }

    return { valid: true };
  }, [sourceNode, targetNode, type]);

  const toggleEvidence = (evId: string) => {
    setSelectedEvidence(prev =>
      prev.includes(evId) ? prev.filter(id => id !== evId) : [...prev, evId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!directionCheck.valid) {
      setError(directionCheck.reason || 'Invalid relationship direction.');
      return;
    }

    if (status === 'OBSERVED' && selectedEvidence.length === 0) {
      setError("OBSERVED relationships must reference at least one supporting evidence item.");
      return;
    }

    const payload: Partial<GraphEdge> = {
      source: sourceId,
      target: targetId,
      type,
      status,
      cost: Number(cost),
      confidence: status === 'OBSERVED' ? null : parseFloat(confidence) || null,
      evidenceRefs: selectedEvidence
    };

    try {
      setLoading(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create relationship.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-400" />
            Create Directed Graph Relationship
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Node */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Source Node (Origin)</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  [{n.category}] {n.label} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Relationship Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as EdgeType)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
            >
              {EDGE_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Target Node */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Node (Destination)</label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {nodes.map(n => (
                <option key={n.id} value={n.id}>
                  [{n.category}] {n.label} ({n.type})
                </option>
              ))}
            </select>
          </div>

          {/* Live Direction Rule Validation Feedback */}
          <div
            className={`p-2 rounded border flex items-center gap-2 ${
              directionCheck.valid
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
                : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            {directionCheck.valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px]">
                  Valid direction: {sourceNode?.category} &rarr; {type} &rarr; {targetNode?.category}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-[11px]">{directionCheck.reason}</span>
              </>
            )}
          </div>

          {/* Status & Traversal Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Relationship Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EdgeStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              >
                <option value="OBSERVED">OBSERVED (Evidence-backed)</option>
                <option value="DERIVED">DERIVED (Deterministic graph fact)</option>
                <option value="HYPOTHESIZED">HYPOTHESIZED (Speculative path)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Traversal Cost (Weight)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={cost}
                onChange={e => setCost(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Supporting Evidence Checklist */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Supporting Evidence References ({selectedEvidence.length} selected)
              {status === 'OBSERVED' && <span className="text-amber-400 ml-1">* Required</span>}
            </label>
            <div className="bg-slate-950 rounded border border-slate-800 p-2 max-h-32 overflow-y-auto space-y-1">
              {evidenceNodes.length === 0 ? (
                <div className="text-slate-500 italic p-1">No registered evidence objects in this case.</div>
              ) : (
                evidenceNodes.map(ev => (
                  <label
                    key={ev.id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-slate-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvidence.includes(ev.id)}
                      onChange={() => toggleEvidence(ev.id)}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-300 truncate">{ev.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">{ev.type}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !directionCheck.valid}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
