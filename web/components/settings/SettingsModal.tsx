"use client";

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip,
  Divider,
  Alert
} from '@heroui/react';
import {
  Key,
  CheckCircle2,
  XCircle,
  Cpu,
  Server,
  Globe,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Sliders,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { fetchSettings, updateSettings, testSettingsConnection } from '../../api/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

interface ProviderPreset {
  id: 'gemini' | 'nvidia' | 'openai' | 'deepseek' | 'custom';
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  availableModels: string[];
  keyPrefix: string;
  keyHint: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    availableModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyPrefix: 'AIzaSy...',
    keyHint: 'Google AI Studio Key (starts with AIzaSy)'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    keyPrefix: 'sk-...',
    keyHint: 'OpenAI Platform Key (starts with sk-)'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Direct',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    keyPrefix: 'sk-...',
    keyHint: 'DeepSeek API Key (starts with sk-)'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'deepseek-ai/deepseek-r1',
    availableModels: ['deepseek-ai/deepseek-r1', 'meta/llama-3.1-70b-instruct'],
    keyPrefix: 'nvapi-...',
    keyHint: 'NVIDIA NIM Key (starts with nvapi-)'
  },
  {
    id: 'custom',
    name: 'Local / Ollama / vLLM',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:8b',
    availableModels: ['llama3:8b', 'mistral', 'qwen2.5:7b'],
    keyPrefix: '',
    keyHint: 'Local API Key (or leave empty)'
  }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated
}) => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderPreset['id']>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [activeConfig, setActiveConfig] = useState<{
    provider: string;
    baseUrl: string;
    model: string;
    apiKeyMasked: string;
    hasApiKey: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; reply?: string } | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrentSettings();
    }
  }, [isOpen]);

  const loadCurrentSettings = async () => {
    setIsLoading(true);
    setStatusNotice(null);
    setTestResult(null);
    try {
      const data = await fetchSettings();
      setActiveConfig(data);
      setSelectedProvider(data.provider);
      setBaseUrl(data.baseUrl);
      setModel(data.model);
      setApiKey(''); // Do not display unmasked key for security
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.message || 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProvider = (provId: ProviderPreset['id']) => {
    setSelectedProvider(provId);
    const preset = PROVIDERS.find(p => p.id === provId);
    if (preset) {
      setBaseUrl(preset.defaultBaseUrl);
      setModel(preset.defaultModel);
      setTestResult(null);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setStatusNotice(null);
    try {
      const res = await testSettingsConnection({
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim(),
        model: model.trim()
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusNotice(null);
    try {
      await updateSettings({
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        provider: selectedProvider
      });
      setStatusNotice({ type: 'success', message: 'API settings updated and applied live!' });
      await loadCurrentSettings();
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusNotice({ type: 'error', message: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const currentPreset = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[0];

  // Validation warning if key prefix doesn't match selected provider
  const keyWarning = (() => {
    const trimmed = apiKey.trim();
    if (!trimmed) return null;
    if (selectedProvider === 'gemini' && trimmed.startsWith('sk-')) {
      return 'You selected Google Gemini, but your key starts with "sk-". If this is an OpenAI or DeepSeek key, please select OpenAI or DeepSeek above.';
    }
    if ((selectedProvider === 'openai' || selectedProvider === 'deepseek') && trimmed.startsWith('AIzaSy')) {
      return 'You selected OpenAI/DeepSeek, but your key starts with "AIzaSy" (Google Gemini). Please select Google Gemini above.';
    }
    if (selectedProvider === 'nvidia' && !trimmed.startsWith('nvapi-')) {
      return 'NVIDIA NIM API keys typically start with "nvapi-".';
    }
    return null;
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      classNames={{
        backdrop: "bg-slate-900/60 backdrop-blur-sm",
        base: "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl",
        header: "border-b border-slate-100 dark:border-zinc-800 pb-3",
        footer: "border-t border-slate-100 dark:border-zinc-800 pt-3"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 px-6 pt-5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-zinc-100 block">
              Forensic Copilot & LLM Settings
            </span>
            <span className="text-xs text-slate-500 font-normal">
              Select your AI provider first, then enter your API key and model.
            </span>
          </div>
        </ModalHeader>

        <ModalBody className="px-6 py-5 space-y-4">
          {/* Active Config Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${activeConfig?.hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                {activeConfig?.hasApiKey ? 'Live AI Mode Active' : 'Offline / Local NLP Mode'}
              </span>
            </div>
            {activeConfig?.hasApiKey && (
              <Chip size="sm" variant="flat" color="success" className="font-mono text-[10px]">
                {activeConfig.model}
              </Chip>
            )}
          </div>

          {/* Feedback Alerts */}
          {statusNotice && (
            <Alert
              color={statusNotice.type === 'success' ? 'success' : 'danger'}
              variant="flat"
              title={statusNotice.type === 'success' ? 'Saved' : 'Error'}
              description={statusNotice.message}
            />
          )}

          {testResult && (
            <Alert
              color={testResult.success ? 'success' : 'danger'}
              variant="flat"
              title={testResult.success ? 'Connection Successful' : 'Connection Failed'}
              description={testResult.message + (testResult.reply ? ` (Echo: "${testResult.reply}")` : '')}
            />
          )}

          {/* STEP 1: SELECT PROVIDER FIRST */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Select Your AI Provider
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROVIDERS.map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleSelectProvider(prov.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-500 ring-2 ring-teal-500'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 bg-white dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                      {prov.name}
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-1 font-mono">
                      {prov.defaultModel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* STEP 2: ENTER KEY & MODEL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Enter API Key & Model for {currentPreset.name}
              </label>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-teal-600" />
                  API Key
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentPreset.keyPrefix ? `Expected: ${currentPreset.keyPrefix}` : ''}
                </span>
              </div>
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={activeConfig?.apiKeyMasked ? `Currently: ${activeConfig.apiKeyMasked}` : currentPreset.keyHint}
                endContent={
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                variant="bordered"
                radius="lg"
                size="sm"
              />
              {keyWarning && (
                <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{keyWarning}</span>
                </div>
              )}
            </div>

            {/* Model Selection and Quick Pills */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
                  Model Identifier
                </label>
                <div className="flex items-center gap-1">
                  {currentPreset.availableModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                        model === m
                          ? 'bg-teal-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                variant="bordered"
                radius="lg"
                size="sm"
                placeholder={currentPreset.defaultModel}
                className="font-mono text-xs"
              />
            </div>

            {/* API Base URL */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
                API Base URL
              </label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                variant="bordered"
                radius="lg"
                size="sm"
                placeholder="https://..."
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-zinc-700/60">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>
              Keys are encrypted in server storage and never exposed in the graph canvas or exported court dossiers.
            </span>
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-between px-6 py-4">
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isLoading={isTesting}
            onPress={handleTest}
            startContent={!isTesting && <RefreshCw className="w-3.5 h-3.5" />}
            className="font-semibold text-xs"
          >
            Test Connection
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              onPress={onClose}
              className="text-xs text-slate-500"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="primary"
              variant="solid"
              isLoading={isSaving}
              onPress={handleSave}
              className="font-semibold text-xs bg-teal-600 text-white shadow-teal-500/20"
            >
              Save & Apply Settings
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
