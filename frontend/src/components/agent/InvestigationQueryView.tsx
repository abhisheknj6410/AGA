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
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Investigation Query Agent</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Deterministic conversational graph reasoning, shortest paths, bottleneck cuts, and possibility comparisons
            </p>
          </div>
        </div>

        {onSwitchToGraph && (
          <button
            onClick={onSwitchToGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <span>View Graph</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Chat Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Suggested Inquiries */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-2">
              Suggested Investigative Inquiries
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSendQuery(prompt)}
                  disabled={queryLoading}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 hover:border-teal-400 dark:hover:border-teal-600 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* History stream */}
          {history.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50">
              <Bot className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 stroke-1" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Deterministic Investigation Engine Ready</p>
              <p className="text-xs text-zinc-500 max-w-md text-center mt-1">
                Ask questions about causal paths, articulation bottlenecks, temporal violations, or click any suggested prompt above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3.5"
                >
                  {/* User Question */}
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-mono font-bold uppercase tracking-wider">
                      QUERY
                    </span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{item.query}</span>
                  </div>

                  {/* Factual Deterministic Answer */}
                  <div className="pl-4 border-l-2 border-teal-500 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                    {item.factualAnswer}
                  </div>

                  {/* Structured Result Proof */}
                  {item.structuredData && Object.keys(item.structuredData).length > 0 && (
                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-zinc-500 mb-2 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Deterministic Graph Proof:</span>
                      </div>
                      <pre className="text-[11px] overflow-x-auto text-zinc-700 dark:text-zinc-300">
                        {JSON.stringify(item.structuredData, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {item.suggestedFollowUps && item.suggestedFollowUps.length > 0 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-zinc-400 font-medium">Follow-up:</span>
                      {item.suggestedFollowUps.map((fu, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendQuery(fu)}
                          className="px-2.5 py-1 rounded-md text-[11px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-teal-700 dark:text-teal-400 transition"
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
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="max-w-4xl mx-auto flex items-center gap-2.5"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={queryLoading}
            placeholder="Ask question (e.g. 'Show shortest path from Rahul Kumar to Prod-DB-01')..."
            className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
          />
          <button
            type="submit"
            disabled={queryLoading || !query.trim()}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{queryLoading ? 'Reasoning...' : 'Ask'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
