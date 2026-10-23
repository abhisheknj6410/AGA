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
  ShieldCheck
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
  keyPrefix: string;
  keyHint: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash-lite',
    keyPrefix: 'AIzaSy...',
    keyHint: 'Google AI Studio API Key'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'deepseek-ai/deepseek-v4.1-flash',
    keyPrefix: 'nvapi-...',
    keyHint: 'NVIDIA NIM API Key'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPrefix: 'sk-proj-...',
    keyHint: 'OpenAI Platform Key'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Direct',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    keyPrefix: 'sk-...',
    keyHint: 'DeepSeek API Key'
  },
  {
    id: 'custom',
    name: 'Local / Ollama / vLLM',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:8b',
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
              Configure or change your API keys for Senior Investigator Eve and evidence extraction.
            </span>
          </div>
        </ModalHeader>

        <ModalBody className="p-6 space-y-5">
          {/* Active Status Badge */}
          {activeConfig && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/80 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${activeConfig.hasApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  Current Engine:
                </span>
                <span className="font-mono text-teal-600 dark:text-teal-400">
                  {activeConfig.model}
                </span>
                <span className="text-slate-400">({activeConfig.provider.toUpperCase()})</span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">
                Key: {activeConfig.apiKeyMasked || 'None'}
              </div>
            </div>
          )}

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

          {/* Provider Preset Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
              Select Provider / Service
            </label>
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
                        ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-500 ring-1 ring-teal-500'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 bg-white dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                      {prov.name}
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      {prov.defaultModel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-teal-600" />
                API Key
              </label>
              <span className="text-[10px] text-slate-400">
                {activeConfig?.hasApiKey ? '(Leave blank to keep existing key)' : '(Required)'}
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
          </div>

          {/* Base URL and Model Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
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
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">
                Model Identifier
              </label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                variant="bordered"
                radius="lg"
                size="sm"
                placeholder="gemini-2.5-flash-lite"
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
            startContent={!isTesting && <Sparkles className="w-3.5 h-3.5" />}
            className="text-xs font-semibold"
          >
            Test Connection
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="light"
              onPress={onClose}
              className="text-xs font-medium text-slate-500"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="primary"
              className="bg-teal-600 text-white text-xs font-semibold px-4 shadow-sm"
              isLoading={isSaving}
              onPress={handleSave}
            >
              Save & Apply
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
