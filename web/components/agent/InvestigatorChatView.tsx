"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Chip,
  Spinner,
  Avatar
} from '@heroui/react';
import {
  Bot,
  Send,
  Sparkles,
  ShieldAlert,
  User,
  Clock,
  HelpCircle,
  ArrowRight,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Case, GraphPayload } from '../../types/graph';
import { askInvestigatorChat } from '../../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

interface InvestigatorChatViewProps {
  currentCase: Case | null;
  graph?: GraphPayload | null;
  onNavigateToGraph?: () => void;
}

const STARTER_PROMPTS = [
  "Who is the primary suspect in this case?",
  "Does Bob have a verified alibi?",
  "What is the single critical choke point?",
  "Summarize the timeline of events",
  "What are the top 2 next investigative steps?"
];

export const InvestigatorChatView: React.FC<InvestigatorChatViewProps> = ({
  currentCase,
  graph,
  onNavigateToGraph
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize greeting on case switch
  useEffect(() => {
    if (!currentCase) return;

    const initialGreeting: ChatMessage = {
      id: `msg-init-${Date.now()}`,
      role: 'assistant',
      content: `Detective, I'm **Senior Investigator Eve**. I've indexed all evidence, timestamped events, and causal links for **"${currentCase.name}"**.

Ask me anything about suspects, alibi contradictions, timeline reconstruction, or tactical bottlenecks. How would you like to proceed?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([initialGreeting]);
  }, [currentCase?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || !currentCase || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await askInvestigatorChat(currentCase.id, text, historyPayload);

      const assistantMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: res.model
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `**Investigator Note**: Unable to process query. Error: ${err.message || 'Network error'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* Top Investigator Status Bar */}
      <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Senior Investigator Eve
              </h2>
              <Chip size="sm" color="success" variant="flat" className="h-5 text-[10px] font-mono font-medium">
                Active Intelligence
              </Chip>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Pair-investigating: <span className="font-semibold text-slate-700 dark:text-zinc-300">{currentCase?.name || 'No case selected'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToGraph && (
            <Button
              size="sm"
              variant="flat"
              color="primary"
              className="text-xs font-semibold h-8"
              endContent={<ArrowRight className="w-3.5 h-3.5" />}
              onPress={onNavigateToGraph}
            >
              Inspect Graph Canvas
            </Button>
          )}
          <Button
            size="sm"
            variant="light"
            isIconOnly
            className="text-slate-400 hover:text-slate-600 h-8 w-8"
            title="Reset conversation"
            onPress={() => {
              if (currentCase) {
                setMessages([{
                  id: `msg-init-${Date.now()}`,
                  role: 'assistant',
                  content: `Conversation reset. Reviewing facts for **"${currentCase.name}"**. What do you need analyzed?`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
              }
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Suggested Starter Chips */}
      <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-zinc-900/60 border-b border-slate-200/50 dark:border-zinc-800/50 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-teal-600" /> Quick Query:
        </span>
        {STARTER_PROMPTS.map((prompt, idx) => (
          <Chip
            key={idx}
            size="sm"
            variant="flat"
            className="cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs shrink-0 transition-colors"
            onClick={() => handleSendMessage(prompt)}
          >
            {prompt}
          </Chip>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-tl-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isUser ? 'text-teal-100' : 'text-slate-400'}`}>
                      {isUser ? 'Detective' : 'Investigator Eve'}
                    </span>
                    <span className={`text-[10px] ${isUser ? 'text-teal-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2 text-xs text-slate-500">
                <Spinner size="sm" color="primary" />
                <span>Investigator Eve is evaluating the evidence graph...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Input
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
            placeholder="Ask Investigator Eve about evidence, alibis, suspects, or next steps..."
            size="md"
            variant="bordered"
            radius="lg"
            className="flex-1 text-xs"
            disabled={isLoading || !currentCase}
          />
          <Button
            color="primary"
            radius="lg"
            className="bg-teal-600 text-white font-semibold text-xs px-5 shadow-sm"
            isLoading={isLoading}
            onPress={() => handleSendMessage()}
            isDisabled={!inputValue.trim() || !currentCase}
            endContent={<Send className="w-3.5 h-3.5" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};
