import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import { createCase } from '../../api/client';
import { Case } from '../../types/graph';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: Case) => void;
}

export const NewCaseModal: React.FC<NewCaseModalProps> = ({ isOpen, onClose, onCaseCreated }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Case name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const c = await createCase(name.trim(), description.trim());
      onCaseCreated(c);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            Create Investigation Case
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
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-400 font-medium mb-1">Case Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Incident-2026-Q3 Breach Investigation"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Objective, initial indicators, scope..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

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
              {loading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
