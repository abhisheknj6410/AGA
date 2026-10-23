import React, { useState, useMemo } from 'react';
import { X, Link, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  EDGE_TYPES,
  GraphNode,
  GraphEdge,
  EdgeType,
  EdgeStatus
} from '../../types/graph';

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
  const [targetId, setTargetId] = useState<string>(nodes[1]?.id || nodes[0]?.id || '');
  const [type, setType] = useState<EdgeType>('TRIGGERED');
  const [status, setStatus] = useState<EdgeStatus>('OBSERVED');
  const [cost, setCost] = useState<number>(1.0);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [propertiesJson, setPropertiesJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Available evidence nodes in graph
  const evidenceNodes = useMemo(() => nodes.filter(n => n.category === 'EVIDENCE'), [nodes]);

  const sourceNode = useMemo(() => nodes.find(n => n.id === sourceId), [nodes, sourceId]);
  const targetNode = useMemo(() => nodes.find(n => n.id === targetId), [nodes, targetId]);

  // Strict Direction Verification Logic
  const directionCheck = useMemo(() => {
    if (!sourceNode || !targetNode) return { valid: false, reason: 'Source and Target must exist.' };

    const sCat = sourceNode.category;
    const tCat = targetNode.category;

    switch (type) {
      case 'PARTICIPATED_IN':
        if (sCat !== 'ENTITY' || tCat !== 'EVENT') {
          return { valid: false, reason: 'PARTICIPATED_IN must go from ENTITY -> EVENT' };
        }
        break;
      case 'CAUSED':
      case 'PRECEDED':
      case 'DEPENDS_ON':
      case 'TRIGGERED':
        if (sCat !== 'EVENT' || tCat !== 'EVENT') {
          return { valid: false, reason: `${type} must go from EVENT -> EVENT` };
        }
        break;
      case 'LOCATED_AT':
      case 'CONTACTED':
      case 'OWNS':
      case 'MEMBER_OF':
        if (sCat !== 'ENTITY' || tCat !== 'ENTITY') {
          return { valid: false, reason: `${type} must connect ENTITY -> ENTITY` };
        }
        break;
      case 'AFFECTED':
        if (sCat !== 'EVENT' || tCat !== 'ENTITY') {
          return { valid: false, reason: 'AFFECTED must go from EVENT -> ENTITY' };
        }
        break;
      case 'SUPPORTS':
      case 'CONTRADICTS':
        if (sCat !== 'EVIDENCE') {
          return { valid: false, reason: `${type} must originate from an EVIDENCE node` };
        }
        break;
      default:
        break;
    }

    return { valid: true, reason: 'Direction matches strict ontology rules.' };
  }, [sourceNode, targetNode, type]);

  const toggleEvidence = (evId: string) => {
    setSelectedEvidence(prev =>
      prev.includes(evId) ? prev.filter(x => x !== evId) : [...prev, evId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!directionCheck.valid) {
      setError(directionCheck.reason);
      return;
    }

    if (status === 'OBSERVED' && selectedEvidence.length === 0) {
      setError('OBSERVED relationships require at least one supporting evidence reference.');
      return;
    }

    let parsedProps = {};
    try {
      parsedProps = JSON.parse(propertiesJson);
    } catch {
      setError('Invalid JSON in properties field.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        source: sourceId,
        target: targetId,
        type,
        status,
        cost: Number(cost) || 1.0,
        evidenceRefs: selectedEvidence,
        properties: parsedProps
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create relationship.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Link className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Create Directed Relationship
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Source Node */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Source Node</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
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
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Relationship Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as EdgeType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-indigo-700 dark:text-indigo-300 font-mono font-semibold focus:outline-hidden focus:border-indigo-500"
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
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Target Node</label>
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
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
            className={`p-2 rounded-lg border flex items-center gap-2 ${
              directionCheck.valid
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {directionCheck.valid ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">
                  Valid direction: {sourceNode?.category} &rarr; {type} &rarr; {targetNode?.category}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="text-[11px]">{directionCheck.reason}</span>
              </>
            )}
          </div>

          {/* Status & Traversal Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Relationship Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EdgeStatus)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
              >
                <option value="OBSERVED">OBSERVED (Evidence-backed)</option>
                <option value="DERIVED">DERIVED (Algorithm fact)</option>
                <option value="HYPOTHESIZED">HYPOTHESIZED (Speculative)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">Cost (Weight)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={cost}
                onChange={e => setCost(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Supporting Evidence Checklist */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
              Supporting Evidence References ({selectedEvidence.length} selected)
              {status === 'OBSERVED' && <span className="text-amber-600 dark:text-amber-400 ml-1">* Required</span>}
            </label>
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-2 max-h-32 overflow-y-auto space-y-1">
              {evidenceNodes.length === 0 ? (
                <div className="text-slate-400 italic p-1">No registered evidence objects in this case.</div>
              ) : (
                evidenceNodes.map(ev => (
                  <label
                    key={ev.id}
                    className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvidence.includes(ev.id)}
                      onChange={() => toggleEvidence(ev.id)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-slate-800 dark:text-slate-200 truncate">{ev.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">{ev.type}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !directionCheck.valid}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
