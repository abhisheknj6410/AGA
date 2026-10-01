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
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Investigation Audit Trail ({logs.length} entries)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by action, user, object type, reason..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs rounded-lg pl-9 pr-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs scrollbar-thin">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No audit logs found.</div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 font-mono text-[11px]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : log.action === 'UPDATE'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : log.action === 'DELETE'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : log.action === 'MERGE'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{log.objectType}</span>
                    <span className="text-slate-400">by {log.who}</span>
                  </div>
                  {log.reason && <p className="text-slate-600 dark:text-slate-300 italic text-[11px]">&ldquo;{log.reason}&rdquo;</p>}
                </div>
                <div className="text-right text-[10px] text-slate-400 shrink-0">
                  <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                  <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
