import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import {
  ENTITY_TYPES,
  EVENT_TYPES,
  EVIDENCE_TYPES,
  TEMPORAL_PRECISIONS,
  GraphNode,
  NodeCategory
} from '../../types/graph';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: NodeCategory;
  onSubmit: (node: Partial<GraphNode>) => Promise<void>;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  category: initialCategory,
  onSubmit
}) => {
  if (!isOpen) return null;

  const [category, setCategory] = useState<NodeCategory>(initialCategory);
  const [type, setType] = useState<string>(
    initialCategory === 'ENTITY' ? 'PERSON' : initialCategory === 'EVENT' ? 'LOGIN' : 'LOG'
  );
  const [label, setLabel] = useState('');
  const [propertiesJson, setPropertiesJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Event specifics
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 19) + 'Z');
  const [endTime, setEndTime] = useState('');
  const [precision, setPrecision] = useState<'SECOND' | 'MINUTE' | 'HOUR' | 'DAY' | 'UNKNOWN'>('SECOND');

  // Evidence specifics
  const [sourceName, setSourceName] = useState('');
  const [sourceKind, setSourceKind] = useState('SYSTEM');
  const [reliability, setReliability] = useState(0.95);
  const [hashChecksum, setHashChecksum] = useState('');

  const handleCategoryChange = (cat: NodeCategory) => {
    setCategory(cat);
    if (cat === 'ENTITY') setType('PERSON');
    else if (cat === 'EVENT') setType('LOGIN');
    else setType('LOG');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Label is required.');
      return;
    }

    let parsedProps = {};
    try {
      if (propertiesJson.trim()) {
        parsedProps = JSON.parse(propertiesJson);
      }
    } catch {
      setError('Properties must be valid JSON.');
      return;
    }

    const payload: Partial<GraphNode> = {
      category,
      type,
      label: label.trim(),
      properties: parsedProps
    };

    if (category === 'EVENT') {
      payload.time = {
        start: startTime.trim() || undefined,
        end: endTime.trim() || undefined,
        precision
      };
    } else if (category === 'EVIDENCE') {
      if (!sourceName.trim()) {
        setError('Evidence source name is required.');
        return;
      }
      payload.evidenceType = type as any;
      payload.source = {
        name: sourceName.trim(),
        kind: sourceKind
      };
      payload.reliability = reliability;
      payload.hashChecksum = hashChecksum.trim() || undefined;
      payload.collectionTime = new Date().toISOString();
    }

    try {
      setLoading(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create node.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add Graph Node
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800/80 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Tabs */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Category</label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
              {(['ENTITY', 'EVENT', 'EVIDENCE'] as NodeCategory[]).map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`py-1 rounded font-medium transition ${
                    category === cat
                      ? cat === 'ENTITY'
                        ? 'bg-blue-600 text-white'
                        : cat === 'EVENT'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {category === 'ENTITY' ? 'Entity Type' : category === 'EVENT' ? 'Event Type' : 'Evidence Type'}
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {category === 'ENTITY' &&
                ENTITY_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              {category === 'EVENT' &&
                EVENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              {category === 'EVIDENCE' &&
                EVIDENCE_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Human-Readable Label *</label>
            <input
              type="text"
              required
              placeholder={category === 'ENTITY' ? 'e.g. Rahul Kumar, Prod-DB-01' : 'e.g. SSH Login to Server'}
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Event Specific Inputs */}
          {category === 'EVENT' && (
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Start ISO Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    placeholder="2026-09-10T14:15:00Z"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">End ISO Time (Optional)</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    placeholder="2026-09-10T14:30:00Z"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[11px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Temporal Precision</label>
                <select
                  value={precision}
                  onChange={e => setPrecision(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  {TEMPORAL_PRECISIONS.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Evidence Specific Inputs */}
          {category === 'EVIDENCE' && (
            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Source Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /var/log/auth.log"
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Source Kind</label>
                  <select
                    value={sourceKind}
                    onChange={e => setSourceKind(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-[11px]"
                  >
                    <option value="SYSTEM">SYSTEM</option>
                    <option value="HUMAN">HUMAN</option>
                    <option value="DEVICE">DEVICE</option>
                    <option value="NETWORK">NETWORK</option>
                    <option value="SENSOR">SENSOR</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Source Reliability</span>
                  <span className="font-mono text-emerald-400 font-bold">{Math.round(reliability * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={reliability}
                  onChange={e => setReliability(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">SHA-256 Hash / Checksum</label>
                <input
                  type="text"
                  placeholder="Optional cryptographic integrity hash"
                  value={hashChecksum}
                  onChange={e => setHashChecksum(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-[10px]"
                />
              </div>
            </div>
          )}

          {/* Properties JSON */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Properties (JSON format)</label>
            <textarea
              rows={2}
              value={propertiesJson}
              onChange={e => setPropertiesJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
            />
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
              disabled={loading}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
