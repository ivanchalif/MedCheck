import React, { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle, XCircle, Loader2, ExternalLink, Eye, EyeOff,
  Zap, Trash2, BookmarkPlus, ChevronRight, Server,
} from 'lucide-react';
import { saveConfig, testConfig, addSavedProvider, deleteSavedProvider, AppConfig, SavedProvider } from '../services/geminiService';

interface Props {
  currentConfig: AppConfig | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ModelChip {
  label: string;
  model: string;
  resolvesTo?: string;
  tag?: string;
}

interface ProviderPreset {
  label: string;
  value: string;
  baseUrl: string;
  defaultModel: string;
  keyLabel: string;
  keyPlaceholder: string;
  helpUrl: string;
  helpText: string;
  models: ModelChip[];
}

const PRESETS: ProviderPreset[] = [
  {
    label: 'Google Gemini',
    value: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    keyLabel: 'Gemini API Key',
    keyPlaceholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/apikey',
    helpText: 'Get a free key at Google AI Studio',
    models: [
      { label: 'gemini-2.0-flash', model: 'gemini-2.0-flash', tag: 'default' },
      { label: 'gemini-2.5-flash', model: 'gemini-2.5-flash' },
      { label: 'gemini-2.5-pro', model: 'gemini-2.5-pro' },
      { label: 'gemini-1.5-flash', model: 'gemini-1.5-flash' },
      { label: 'gemini-1.5-pro', model: 'gemini-1.5-pro' },
    ],
  },
  {
    label: 'OpenAI',
    value: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Get a key from platform.openai.com',
    models: [
      { label: 'gpt-4o', model: 'gpt-4o', tag: 'default' },
      { label: 'gpt-4o-mini', model: 'gpt-4o-mini', tag: 'fast' },
      { label: 'o3-mini', model: 'o3-mini' },
      { label: 'gpt-4-turbo', model: 'gpt-4-turbo' },
    ],
  },
  {
    label: 'Groq',
    value: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyLabel: 'Groq API Key',
    keyPlaceholder: 'gsk_...',
    helpUrl: 'https://console.groq.com',
    helpText: 'Get a free key at console.groq.com',
    models: [
      { label: 'llama-3.3-70b-versatile', model: 'llama-3.3-70b-versatile', tag: 'default' },
      { label: 'llama-3.1-8b-instant', model: 'llama-3.1-8b-instant', tag: 'fast' },
      { label: 'gemma2-9b-it', model: 'gemma2-9b-it' },
      { label: 'mixtral-8x7b', model: 'mixtral-8x7b-32768' },
    ],
  },
  {
    label: 'OpenRouter',
    value: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-exp:free',
    keyLabel: 'OpenRouter API Key',
    keyPlaceholder: 'sk-or-...',
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Get a key at openrouter.ai — access 200+ models',
    models: [
      { label: 'openrouter/auto', model: 'openrouter/auto', tag: 'auto router' },
      { label: 'openrouter/free', model: 'openrouter/free', tag: 'free router' },
      { label: 'gemini-2.0-flash (free)', model: 'google/gemini-2.0-flash-exp:free', tag: 'free' },
      { label: 'claude-3-haiku', model: 'anthropic/claude-3-haiku' },
      { label: 'llama-3.1-70b', model: 'meta-llama/llama-3.1-70b-instruct' },
    ],
  },
  {
    label: 'Ollama (local)',
    value: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    keyLabel: 'API Key',
    keyPlaceholder: 'ollama',
    helpUrl: 'https://ollama.com',
    helpText: 'Run: ollama pull llama3',
    models: [
      { label: 'llama3', model: 'llama3', tag: 'default' },
      { label: 'llama3.1', model: 'llama3.1' },
      { label: 'llama3.2', model: 'llama3.2' },
      { label: 'mistral', model: 'mistral' },
      { label: 'phi3', model: 'phi3' },
      { label: 'codellama', model: 'codellama' },
    ],
  },
  {
    label: 'LM Studio (local)',
    value: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    keyLabel: 'API Key',
    keyPlaceholder: 'lm-studio',
    helpUrl: 'https://lmstudio.ai',
    helpText: 'Start the local server inside LM Studio',
    models: [],
  },
  {
    label: 'Custom',
    value: 'custom',
    baseUrl: '',
    defaultModel: '',
    keyLabel: 'API Key',
    keyPlaceholder: '',
    helpUrl: '',
    helpText: 'Any OpenAI-compatible endpoint',
    models: [],
  },
];

function detectPreset(baseUrl: string): string {
  if (!baseUrl) return 'custom';
  if (baseUrl.includes('googleapis.com')) return 'gemini';
  if (baseUrl.includes('openai.com')) return 'openai';
  if (baseUrl.includes('groq.com')) return 'groq';
  if (baseUrl.includes('openrouter.ai')) return 'openrouter';
  if (baseUrl.includes('11434')) return 'ollama';
  if (baseUrl.includes('1234')) return 'lmstudio';
  return 'custom';
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

export function SettingsModal({ currentConfig, onClose, onSaved }: Props) {
  const [selectedPreset, setSelectedPreset] = useState(() =>
    detectPreset(currentConfig?.baseUrl || '')
  );
  const [baseUrl, setBaseUrl] = useState(currentConfig?.baseUrl || '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(currentConfig?.model || '');
  const [showKey, setShowKey] = useState(false);

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>(
    currentConfig?.savedProviders ?? []
  );
  const [savingProvider, setSavingProvider] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const saveAsRef = useRef<HTMLInputElement>(null);

  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const preset = PRESETS.find(p => p.value === selectedPreset) ?? PRESETS[PRESETS.length - 1];

  useEffect(() => {
    if (currentConfig) {
      setBaseUrl(currentConfig.baseUrl || '');
      setModel(currentConfig.model || '');
      setSelectedPreset(detectPreset(currentConfig.baseUrl || ''));
      setSavedProviders(currentConfig.savedProviders ?? []);
    }
  }, [currentConfig]);

  useEffect(() => {
    if (showSaveAs && saveAsRef.current) saveAsRef.current.focus();
  }, [showSaveAs]);

  function applyPreset(p: ProviderPreset) {
    setSelectedPreset(p.value);
    setBaseUrl(p.baseUrl);
    if (p.defaultModel) setModel(p.defaultModel);
    setApiKey('');
    setTestStatus('idle');
    setTestMessage('');
    setSaveError('');
  }

  function loadSavedProvider(sp: SavedProvider) {
    setBaseUrl(sp.baseUrl);
    setApiKey(sp.apiKey);
    setModel(sp.model);
    setSelectedPreset(detectPreset(sp.baseUrl));
    setTestStatus('idle');
    setTestMessage('');
    setSaveError('');
  }

  async function handleUse(sp: SavedProvider) {
    setActivatingId(sp.id);
    try {
      await saveConfig({ baseUrl: sp.baseUrl, apiKey: sp.apiKey, model: sp.model });
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to switch provider');
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeleteSaved(id: string) {
    setDeletingId(id);
    try {
      await deleteSavedProvider(id);
      setSavedProviders(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setSaveError(e.message || 'Failed to delete provider');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveAs(e: React.FormEvent) {
    e.preventDefault();
    if (!saveAsName.trim() || !baseUrl.trim() || !apiKey.trim() || !model.trim()) return;
    setSavingProvider(true);
    try {
      const saved = await addSavedProvider({ name: saveAsName.trim(), baseUrl, apiKey, model });
      setSavedProviders(prev => [...prev, saved]);
      setSaveAsName('');
      setShowSaveAs(false);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save provider');
    } finally {
      setSavingProvider(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await saveConfig({ baseUrl, apiKey, model });
      onSaved();
      onClose();
    } catch (e: any) {
      setSaveError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestStatus('testing');
    setTestMessage('');
    const result = await testConfig({ baseUrl, apiKey, model });
    if (result.ok) {
      setTestStatus('ok');
      setTestMessage(`Connected — provider replied: "${result.response}"`);
    } else {
      setTestStatus('error');
      setTestMessage(result.error || 'Connection failed');
    }
  }

  const isActive = (sp: SavedProvider) =>
    sp.baseUrl === currentConfig?.baseUrl && sp.model === currentConfig?.model;

  const keyOk = !!(apiKey.trim()) || !!(currentConfig?.keyConfigured);
  const canTest = !!(baseUrl.trim() && keyOk && model.trim());
  const canSave = canTest && !saving;
  const canSaveAs = !!(baseUrl.trim() && apiKey.trim() && model.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">AI Provider Settings</h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure the AI backend for MedCheck</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Saved providers */}
          {savedProviders.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Saved providers</label>
              <ul className="space-y-1.5">
                {savedProviders.map(sp => (
                  <li
                    key={sp.id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border group transition-colors ${
                      isActive(sp)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Server size={14} className={isActive(sp) ? 'text-blue-500' : 'text-slate-400'} />
                    <button
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                      onClick={() => loadSavedProvider(sp)}
                      title="Load into form"
                    >
                      <span className={`text-sm font-medium truncate ${isActive(sp) ? 'text-blue-800' : 'text-slate-700'}`}>
                        {sp.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono truncate shrink-0">
                        {sp.model}
                      </span>
                      <span className="text-xs text-slate-300 font-mono truncate shrink-0 hidden sm:block">
                        {maskKey(sp.apiKey)}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive(sp) ? (
                        <span className="text-xs text-blue-600 font-medium px-2 py-0.5 bg-blue-100 rounded-full">Active</span>
                      ) : (
                        <button
                          onClick={() => handleUse(sp)}
                          disabled={activatingId === sp.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {activatingId === sp.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <ChevronRight size={11} />
                          }
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSaved(sp.id)}
                        disabled={deletingId === sp.id}
                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove saved provider"
                      >
                        {deletingId === sp.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Trash2 size={13} />
                        }
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-slate-100" />
            </div>
          )}

          {/* Provider type quick-fill */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              {savedProviders.length > 0 ? 'New / edit provider' : 'Provider'}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                    selectedPreset === p.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset.helpText && (
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                {preset.helpText}
                {preset.helpUrl && (
                  <a href={preset.helpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                    <ExternalLink size={11} />
                  </a>
                )}
              </p>
            )}
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provider URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={e => { setBaseUrl(e.target.value); setTestStatus('idle'); }}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{preset.keyLabel}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setTestStatus('idle'); }}
                placeholder={
                  currentConfig?.keyConfigured
                    ? '(leave blank to keep current key)'
                    : preset.keyPlaceholder || 'Enter your API key'
                }
                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {currentConfig?.keyConfigured && !apiKey && (
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle size={11} /> A key is currently active
              </p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Model name</label>
            <input
              type="text"
              value={model}
              onChange={e => { setModel(e.target.value); setTestStatus('idle'); }}
              placeholder="e.g. gemini-2.0-flash, gpt-4o, llama3"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono"
            />
            {preset.models.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preset.models.map(chip => (
                  <button
                    key={chip.model}
                    type="button"
                    onClick={() => { setModel(chip.model); setTestStatus('idle'); }}
                    title={chip.resolvesTo ? `Resolves to: ${chip.resolvesTo}` : chip.model}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono border transition-colors ${
                      model === chip.model
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {chip.label}
                    {chip.resolvesTo && (
                      <span className="text-slate-400 font-sans not-italic">→</span>
                    )}
                    {chip.tag && (
                      <span className={`px-1 rounded text-[10px] font-sans font-medium ${
                        chip.tag === 'free' || chip.tag === 'free·fast'
                          ? 'bg-emerald-100 text-emerald-700'
                          : chip.tag === 'default'
                          ? 'bg-blue-100 text-blue-600'
                          : chip.tag === 'fast'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}>{chip.tag}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Save as… inline form */}
          {showSaveAs ? (
            <form onSubmit={handleSaveAs} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <BookmarkPlus size={15} className="text-blue-500 shrink-0" />
              <input
                ref={saveAsRef}
                value={saveAsName}
                onChange={e => setSaveAsName(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setShowSaveAs(false)}
                placeholder="Name this provider…"
                className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={!saveAsName.trim() || !canSaveAs || savingProvider}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {savingProvider ? <Loader2 size={12} className="animate-spin" /> : null}
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveAs(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowSaveAs(true)}
              disabled={!canSaveAs}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <BookmarkPlus size={15} />
              Save current credentials for quick switching…
            </button>
          )}

          {/* Test result */}
          {testStatus !== 'idle' && (
            <div className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm ${
              testStatus === 'testing' ? 'bg-blue-50 text-blue-700' :
              testStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' :
              'bg-red-50 text-red-700'
            }`}>
              {testStatus === 'testing' && <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />}
              {testStatus === 'ok' && <CheckCircle size={16} className="mt-0.5 shrink-0" />}
              {testStatus === 'error' && <XCircle size={16} className="mt-0.5 shrink-0" />}
              <span>{testStatus === 'testing' ? 'Testing connection…' : testMessage}</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
              <XCircle size={16} className="shrink-0" />
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end border-t border-slate-100 pt-4 sticky bottom-0 bg-white">
          <button
            onClick={handleTest}
            disabled={!canTest || testStatus === 'testing'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            {testStatus === 'testing' ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Test connection
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Save & apply
          </button>
        </div>
      </div>
    </div>
  );
}
