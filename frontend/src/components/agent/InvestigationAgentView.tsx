import React, { useState } from 'react';
import { queryAgent } from '../../api/client';
import { AgentQueryResult } from '../../types/graph';
import { Bot, Send, Sparkles, Terminal, ArrowRight, CornerDownLeft } from 'lucide-react';

interface InvestigationAgentViewProps {
  caseId: string;
}

export const InvestigationAgentView: React.FC<InvestigationAgentViewProps> = ({ caseId }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AgentQueryResult[]>([]);

  const samplePrompts = [
    'Show all connections between Rahul Kumar and Prod-DB-01',
    'Which nodes are critical bottlenecks?',
    'Why does possibility exist?',
    'What is different between possibilities?',
    'Which possibilities are temporally invalid?',
    'What evidence is common to all surviving possibilities?',
    'Match attack stages against the graph'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text || loading) return;

    setLoading(true);
    setQuery('');

    try {
      const res: AgentQueryResult = await queryAgent(caseId, text);
      setHistory(prev => [res, ...prev]);
    } catch (err: any) {
      setHistory(prev => [
        {
          query: text,
          intent: 'ERROR',
          factualAnswer: `Error executing query: ${err.message || 'Unknown network error'}`,
          structuredData: {},
          suggestedFollowUps: []
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Investigation Query Agent</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic graph query and algorithm explanation layer — Zero hallucinations
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat / Query Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        {/* Sample Prompt Chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
            Suggested Investigation Inquiries
          </span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* History stream */}
        {history.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Terminal className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Ask any question regarding graph reachability, bottlenecks, or possibilities.</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm text-center">
              The agent translates inquiries into formal graph algorithms (K-shortest paths, dominator trees, min-cut, topological sorts) and presents verified facts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 space-y-3 shadow-xs">
                {/* User Inquiry */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Query
                    </span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.query}</span>
                  </div>
                  {item.algorithmUsed && (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                      Algo: {item.algorithmUsed}
                    </span>
                  )}
                </div>

                {/* Agent Answer */}
                <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {item.factualAnswer}
                </div>

                {/* Suggested Followups */}
                {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Follow-up:
                    </span>
                    {item.suggestedFollowUps.map((fu, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleSend(fu)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                      >
                        {fu} <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Input Box */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask an investigative graph question (e.g. 'Show all connections between Rahul and Prod-DB-01')..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-inner pr-16"
              disabled={loading}
            />
            <kbd className="absolute right-2.5 top-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1 shadow-2xs">
              <CornerDownLeft className="w-2.5 h-2.5" /> Return
            </kbd>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
