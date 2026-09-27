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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">Investigation Query Agent</h2>
            <p className="text-xs text-slate-400">
              Deterministic graph query and algorithm explanation layer — Zero hallucinations
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat / Query Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Sample Prompt Chips */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Suggested Investigation Inquiries
          </span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* History stream */}
        {history.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Terminal className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
            <p className="text-sm font-medium">Ask any question regarding graph reachability, bottlenecks, or possibilities.</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm text-center">
              The agent translates inquiries into formal graph algorithms (K-shortest paths, dominator trees, min-cut, topological sorts) and presents verified facts.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {history.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-md">
                {/* User Inquiry */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                      Query
                    </span>
                    <span className="text-sm font-semibold text-white">{item.query}</span>
                  </div>
                  {item.algorithmUsed && (
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                      Algo: {item.algorithmUsed}
                    </span>
                  )}
                </div>

                {/* Agent Answer */}
                <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                  {item.factualAnswer}
                </div>

                {/* Suggested Followups */}
                {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Follow-up:
                    </span>
                    {item.suggestedFollowUps.map((fu, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleSend(fu)}
                        className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 border border-slate-700/60 transition-colors flex items-center gap-1"
                      >
                        {fu} <ArrowRight className="w-3 h-3" />
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
      <div className="p-4 border-t border-slate-800 bg-slate-900/80">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask an investigative graph question (e.g. 'Show all connections between Rahul and Prod-DB-01')..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner pr-10"
              disabled={loading}
            />
            <kbd className="absolute right-3 top-3 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
              <CornerDownLeft className="w-2.5 h-2.5" /> Return
            </kbd>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
