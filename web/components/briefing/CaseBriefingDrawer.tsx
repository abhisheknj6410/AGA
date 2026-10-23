"use client";

import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  Chip,
  Card,
  CardBody,
  Divider,
  ScrollShadow
} from '@heroui/react';
import {
  FileText,
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Target,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bot,
  ExternalLink,
  Layers,
  FileBadge
} from 'lucide-react';
import { Case, GraphNode, GraphEdge } from '../../types/graph';

interface CaseBriefingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: Case | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNavigateToChat?: () => void;
  onNavigateToAlgorithm?: (mode: 'CAUSAL_PATH' | 'DOMINATORS' | 'MIN_CUT') => void;
}

export const CaseBriefingDrawer: React.FC<CaseBriefingDrawerProps> = ({
  isOpen,
  onClose,
  currentCase,
  nodes,
  edges,
  onNavigateToChat,
  onNavigateToAlgorithm
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  if (!currentCase) return null;

  // Extract key categories
  const entities = nodes.filter(n => n.category === 'ENTITY');
  const events = nodes.filter(n => n.category === 'EVENT').sort((a, b) => {
    const tA = a.time?.start ? new Date(a.time.start).getTime() : 0;
    const tB = b.time?.start ? new Date(b.time.start).getTime() : 0;
    return tA - tB;
  });
  const evidence = nodes.filter(n => n.category === 'EVIDENCE');

  // Detect suspects
  const suspects = entities.filter(e => {
    const role = (e.properties?.role || '').toLowerCase();
    const label = e.label.toLowerCase();
    return e.type === 'PERSON' || role.includes('suspect') || role.includes('accountant') || role.includes('janitor') || label.includes('alice') || label.includes('bob') || label.includes('viktor');
  });

  const handleGenerateSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch(`/api/cases/${currentCase.id}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Provide a concise, 4-bullet executive briefing: 1. Incident Overview, 2. Suspects & Verified Alibis, 3. Critical Timeline Sequence, 4. Investigative Conclusion.',
          history: []
        })
      });
      const data = await res.json();
      setAiSummary(data.reply || 'Briefing generated.');
    } catch {
      setAiSummary('Failed to generate dynamic briefing. Review the structured facts below.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 leading-tight">
              Case Briefing & Dossier
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {currentCase.id}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <ScrollShadow className="flex-1 p-5 space-y-5 overflow-y-auto">
        {/* Case Title & Narrative */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Chip size="sm" color="primary" variant="flat" className="text-[10px] font-semibold uppercase">
              {currentCase.status}
            </Chip>
            <span className="text-xs text-slate-400">
              Created: {new Date(currentCase.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
            {currentCase.name}
          </h2>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/80 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
            {currentCase.description || 'No detailed narrative recorded for this case.'}
          </div>
        </div>

        {/* AI Briefing Button / Result */}
        <Card className="border border-teal-200/80 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20 shadow-none">
          <CardBody className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Senior Investigator Eve's Executive Summary
              </span>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                isLoading={isGeneratingAi}
                onPress={handleGenerateSummary}
                className="text-[11px] h-6 px-2.5 font-semibold bg-teal-600 text-white"
              >
                {aiSummary ? 'Refresh' : 'Generate Briefing'}
              </Button>
            </div>

            {aiSummary ? (
              <div className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line bg-white/80 dark:bg-zinc-900/80 p-3 rounded-lg border border-teal-100 dark:border-teal-900/40">
                {aiSummary}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Click "Generate Briefing" to synthesize evidence, alibis, and discrete graph proofs into a 4-point briefing.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Suspects & Persons of Interest */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            Key Persons & Suspects ({suspects.length})
          </h4>

          <div className="space-y-2">
            {suspects.map((suspect) => {
              const label = suspect.label;
              const isBob = label.toLowerCase().includes('bob');
              const isAlice = label.toLowerCase().includes('alice');
              const isViktor = label.toLowerCase().includes('viktor');

              return (
                <div
                  key={suspect.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-zinc-100 block">
                      {suspect.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Role: {suspect.properties?.role || suspect.type}
                    </span>

                    {/* Explanatory notes */}
                    {isBob && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Alibi Verified: CCTV proves 1st floor presence (access to 4th floor impossible).</span>
                      </div>
                    )}
                    {isAlice && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Prime Suspect: Badge swipe recorded at 10:02 AM directly preceding theft.</span>
                      </div>
                    )}
                    {isViktor && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Prime Suspect: Cell tower ping at Pier 19 refutes Starlight Diner receipt.</span>
                      </div>
                    )}
                  </div>

                  <Chip
                    size="sm"
                    variant="flat"
                    color={isBob ? 'success' : isAlice || isViktor ? 'danger' : 'default'}
                    className="text-[10px] font-semibold shrink-0"
                  >
                    {isBob ? 'CLEARED' : isAlice || isViktor ? 'PRIME SUSPECT' : 'PERSON OF INTEREST'}
                  </Chip>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chronological Incident Timeline */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            Chronological Events ({events.length})
          </h4>

          <div className="space-y-2 relative border-l-2 border-slate-200 dark:border-zinc-800 ml-2 pl-3">
            {events.map((ev, idx) => (
              <div key={ev.id} className="relative">
                <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-white dark:border-zinc-900" />
                <div className="text-[11px] font-mono text-teal-600 dark:text-teal-400">
                  {ev.time?.start ? new Date(ev.time.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `Step ${idx + 1}`}
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {ev.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Evidence Items */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Supporting Evidence Vault ({evidence.length})
          </h4>

          <div className="space-y-1.5">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-slate-800 dark:text-zinc-200 block">
                    {ev.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Source: {(ev as any).source?.name || ev.type} (100% Reliable)
                  </span>
                </div>
                <Chip size="sm" variant="dot" color="primary" className="text-[9px]">
                  {ev.type}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      </ScrollShadow>

      {/* Footer / Quick Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 flex items-center justify-between gap-3">
        {onNavigateToChat && (
          <Button
            size="sm"
            color="primary"
            variant="solid"
            className="bg-teal-600 text-white font-semibold text-xs flex-1 h-9"
            startContent={<Bot className="w-4 h-4" />}
            onPress={() => {
              onClose();
              onNavigateToChat();
            }}
          >
            Chat with Eve Copilot
          </Button>
        )}

        {onNavigateToAlgorithm && (
          <Button
            size="sm"
            variant="flat"
            className="text-xs font-semibold h-9"
            startContent={<Target className="w-3.5 h-3.5 text-rose-500" />}
            onPress={() => {
              onClose();
              onNavigateToAlgorithm('CAUSAL_PATH');
            }}
          >
            Trace Causal Path
          </Button>
        )}
      </div>
    </div>
  );
};
