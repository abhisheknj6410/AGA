import React, { useState, useEffect } from 'react';
import { X, History, Search } from 'lucide-react';
import { AuditLog } from '../../types/graph';
import { fetchAuditLogs } from '../../api/client';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, caseId }) => {
  if (!isOpen) return null;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAuditLogs(caseId)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [caseId]);

  const filteredLogs = logs.filter(
    l =>
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      l.who.toLowerCase().includes(query.toLowerCase()) ||
      l.objectType.toLowerCase().includes(query.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Investigation Audit Trail ({logs.length} entries)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-800 bg-slate-900">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search audit trail by action, user, object type, reason..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs rounded pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No audit logs found.</div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-start justify-between gap-3 font-mono text-[11px]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : log.action === 'UPDATE'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : log.action === 'DELETE'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : log.action === 'MERGE'
                          ? 'bg-purple-950 text-purple-400 border border-purple-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-300 font-bold">{log.objectType}</span>
                    <span className="text-slate-500">by {log.who}</span>
                  </div>
                  {log.reason && <p className="text-slate-400 italic text-[11px]">&ldquo;{log.reason}&rdquo;</p>}
                </div>
                <div className="text-right flex-shrink-0 text-slate-500 text-[10px]">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 flex justify-end bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
