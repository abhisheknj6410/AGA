import React, { useState } from 'react';
import { queryAgent } from '../../api/client';
import { AgentQueryResult } from '../../types/graph';
import {
  Terminal,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Bot,
  RotateCcw
} from 'lucide-react';

interface InvestigationQueryViewProps {
  caseId: string;
  onSwitchToGraph?: () => void;
}

const SAMPLE_PROMPTS = [
  'Show all connections between Rahul Kumar and Prod-DB-01',
  'Which nodes are critical bottlenecks?',
  'Why does possibility exist?',
  'What is different between possibilities?',
  'Which possibilities are temporally invalid?',
  'What evidence is common to all surviving possibilities?',
  'Match attack stages against the graph'
];

export const InvestigationQueryView: React.FC<InvestigationQueryViewProps> = ({
  caseId,
  onSwitchToGraph
}) => {
  const [query, setQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [history, setHistory] = useState<AgentQueryResult[]>([]);

  const handleSendQuery = async (textToSend?: string) => {
    const text = (textToSend || query).trim();
    if (!text || queryLoading) return;

    setQueryLoading(true);
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
      setQueryLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Investigation Query Agent</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Deterministic conversational graph reasoning, shortest paths, bottleneck cuts, and possibility comparisons
            </p>
          </div>
        </div>

        {onSwitchToGraph && (
          <button
            onClick={onSwitchToGraph}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <span>View Graph</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Suggested Inquiries */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-3">
              Suggested Investigative Inquiries
            </span>
            <div className="flex flex-wrap gap-2.5">
              {SAMPLE_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSendQuery(prompt)}
                  disabled={queryLoading}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-zinc-900 hover:border-teal-500 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* History stream */}
          {history.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/50">
              <Bot className="w-14 h-14 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
              <h3 className="text-base font-bold text-zinc-700 dark:text-zinc-300">Deterministic Investigation Engine Ready</h3>
              <p className="text-sm text-zinc-500 max-w-md text-center mt-2 leading-relaxed">
                Ask questions about causal paths, articulation bottlenecks, temporal violations, or click any suggested prompt above.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
                >
                  {/* User Question */}
                  <div className="flex items-start gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-mono font-bold uppercase tracking-wider">
                      QUERY
                    </span>
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.query}</span>
                  </div>

                  {/* Factual Deterministic Answer */}
                  <div className="pl-4 border-l-2 border-teal-500 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                    {item.factualAnswer}
                  </div>

                  {/* Structured Result Proof */}
                  {item.structuredData && Object.keys(item.structuredData).length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2.5 font-bold">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>Deterministic Graph Proof:</span>
                      </div>
                      <pre className="text-xs overflow-x-auto text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {JSON.stringify(item.structuredData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-zinc-400 font-semibold">Follow-up:</span>
                      {item.suggestedFollowUps.map((fu, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendQuery(fu)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-teal-700 dark:text-teal-400 transition cursor-pointer"
                        >
                          {fu}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Query Input Bar */}
      <div className="p-5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="max-w-5xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={queryLoading}
            placeholder="Ask question (e.g. 'Show shortest path from Rahul Kumar to Prod-DB-01')..."
            className="flex-1 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={queryLoading || !query.trim()}
            className="px-7 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{queryLoading ? 'Reasoning...' : 'Ask Agent'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
