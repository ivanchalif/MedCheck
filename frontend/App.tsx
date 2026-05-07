import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Loader2, ShieldAlert, Activity, BookOpen, Settings, AlertTriangle, Lock, ArrowDownAZ, ArrowUpAZ, Clock, ShieldX, Zap } from 'lucide-react';
import { getMedicationDetails, getConfig, getAuthStatus, login, AppConfig } from './services/geminiService';
import { MedicationCard } from './components/MedicationCard';
import { MedicationDetails } from './components/MedicationDetails';
import { SideEffectAnalyzer } from './components/SideEffectAnalyzer';
import { SideEffectSummary } from './components/SideEffectSummary';
import { SettingsModal } from './components/SettingsModal';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { useProfiles } from './hooks/useProfiles';
import { Medication } from './types';

type SortOrder = 'recent' | 'az' | 'za' | 'warnings' | 'effects';

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await login(password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Lock size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">MedCheck</h1>
            <p className="text-xs text-slate-500">Password required</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter access password"
            autoFocus
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            disabled={loading}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const {
    profiles,
    activeId,
    activeProfile,
    updateMedications,
    createProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
  } = useProfiles();

  const medications = activeProfile?.medications ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'analyzer' | 'summary'>('catalog');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    getAuthStatus().then(status => {
      setAuthRequired(status.required);
      setAuthenticated(status.authenticated);
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      setAuthenticated(false);
    };
    window.addEventListener('auth:required', handler);
    return () => window.removeEventListener('auth:required', handler);
  }, []);

  // Clear selection when switching profiles
  useEffect(() => {
    setSelectedMedication(null);
    setSearchError(null);
    setSearchQuery('');
    setActiveTab('catalog');
  }, [activeId]);

  const refreshConfig = useCallback(async () => {
    const cfg = await getConfig();
    setAppConfig(cfg);
  }, []);

  useEffect(() => {
    if (authenticated) refreshConfig();
  }, [refreshConfig, authenticated]);

  const handleLogin = async () => {
    setAuthenticated(true);
    await refreshConfig();
  };

  if (authRequired && !authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (appConfig && !appConfig.configured) {
      setSearchError('AI provider is not configured. Open Settings to set up your API key.');
      return;
    }

    const names = searchQuery.split(',').map(s => s.trim()).filter(Boolean);
    setIsSearching(true);
    setSearchError(null);

    if (names.length === 1) {
      try {
        const details = await getMedicationDetails(names[0]);
        if (!details) {
          setSearchError(`Could not find medical information for "${names[0]}".`);
          return;
        }
        if (medications.some(m => m.name.toLowerCase() === details.name.toLowerCase())) {
          setSearchError(`"${details.name}" is already in your list.`);
          return;
        }
        updateMedications([...medications, { ...details, addedAt: Date.now() }]);
        setSearchQuery('');
        setSelectedMedication(details);
        setActiveTab('catalog');
      } catch (err: any) {
        setSearchError(err.message || 'Failed to add medication.');
      } finally {
        setIsSearching(false);
      }
    } else {
      const errors: string[] = [];
      let lastAdded: Medication | null = null;
      let current = [...medications];

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        setBatchProgress({ current: i + 1, total: names.length, name });
        try {
          const details = await getMedicationDetails(name);
          if (!details) {
            errors.push(`"${name}": not found`);
            continue;
          }
          if (current.some(m => m.name.toLowerCase() === details.name.toLowerCase())) {
            errors.push(`"${details.name}": already in list`);
            continue;
          }
          current = [...current, { ...details, addedAt: Date.now() }];
          lastAdded = details;
        } catch (err: any) {
          errors.push(`"${name}": ${err.message || 'failed'}`);
        }
      }

      updateMedications(current);
      setSearchQuery('');
      setBatchProgress(null);
      setIsSearching(false);
      const added = current.length - medications.length;
      if (errors.length > 0) {
        setSearchError(
          `Added ${added} of ${names.length}.${errors.length ? ' Issues: ' + errors.join('; ') : ''}`
        );
      }
      if (lastAdded) {
        setSelectedMedication(lastAdded);
        setActiveTab('catalog');
      }
    }
  };

  const handleRemoveMedication = (id: string) => {
    updateMedications(medications.filter(m => m.id !== id));
    if (selectedMedication?.id === id) setSelectedMedication(null);
  };

  const sortedMedications = useMemo(() => {
    const meds = [...medications];
    switch (sortOrder) {
      case 'az':       return meds.sort((a, b) => a.name.localeCompare(b.name));
      case 'za':       return meds.sort((a, b) => b.name.localeCompare(a.name));
      case 'warnings': return meds.sort((a, b) => b.contraindications.length - a.contraindications.length);
      case 'effects':  return meds.sort((a, b) => b.sideEffects.length - a.sideEffects.length);
      default:         return meds.reverse(); // recent = newest first
    }
  }, [medications, sortOrder]);

  const notConfigured = appConfig !== null && !appConfig.configured;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 text-blue-600 mr-auto">
            <ShieldAlert size={28} strokeWidth={2.5} />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">MedCheck</h1>
          </div>

          {/* Profile switcher */}
          <ProfileSwitcher
            profiles={profiles}
            activeId={activeId}
            onSwitch={switchProfile}
            onCreate={createProfile}
            onDelete={deleteProfile}
            onRename={renameProfile}
          />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              notConfigured
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="AI provider settings"
          >
            <Settings size={18} className={notConfigured ? 'text-amber-500' : ''} />
            <span className="hidden sm:inline">{notConfigured ? 'Setup required' : 'Settings'}</span>
          </button>
        </div>
      </header>

      {/* Setup banner */}
      {notConfigured && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span>
                <strong>AI provider not configured.</strong> Add your API key to start looking up medications.
              </span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="shrink-0 px-4 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Configure now
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-500" />
              {activeProfile?.name ?? 'My'} Medications
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {medications.length} medication{medications.length !== 1 ? 's' : ''} in this profile
            </p>
            <form onSubmit={handleAddMedication} className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Add medication… or aspirin, ibuprofen, …"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                disabled={isSearching}
              />
              <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <button type="submit" disabled={!searchQuery.trim() || isSearching} className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </form>
            <p className="text-[11px] text-slate-400 mb-3 px-1">Separate multiple names with commas</p>

            {batchProgress && (
              <div className="flex items-center gap-2 mb-3 px-2 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Loader2 size={12} className="animate-spin shrink-0" />
                <span>Adding {batchProgress.current} / {batchProgress.total}: <strong>{batchProgress.name}</strong></span>
              </div>
            )}
            {searchError && <p className="text-sm text-red-500 mb-3 px-2">{searchError}</p>}

            {medications.length > 1 && (
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {(
                  [
                    { key: 'recent',   icon: <Clock size={11} />,      label: 'Recent' },
                    { key: 'az',       icon: <ArrowDownAZ size={11} />, label: 'A→Z' },
                    { key: 'za',       icon: <ArrowUpAZ size={11} />,   label: 'Z→A' },
                    { key: 'warnings', icon: <ShieldX size={11} />,     label: 'Warnings' },
                    { key: 'effects',  icon: <Zap size={11} />,         label: 'Side effects' },
                  ] as { key: SortOrder; icon: React.ReactNode; label: string }[]
                ).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortOrder(key)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                      sortOrder === key
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-2">
              {medications.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <Activity className="text-slate-400 mx-auto mb-3" size={24} />
                  <p className="text-slate-500 text-sm">No medications in this profile.</p>
                </div>
              ) : (
                sortedMedications.map(med => (
                  <MedicationCard key={med.id} medication={med} onRemove={handleRemoveMedication} onClick={setSelectedMedication} isSelected={selectedMedication?.id === med.id} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="flex bg-slate-200/50 p-1 rounded-xl mb-6 lg:hidden">
            <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Details</button>
            <button onClick={() => setActiveTab('analyzer')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'analyzer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Checker</button>
            <button onClick={() => setActiveTab('summary')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Summary</button>
          </div>

          <div className="hidden lg:flex gap-4 mb-6 border-b border-slate-200 pb-px">
            <button onClick={() => setActiveTab('catalog')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'catalog' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Medication Details</button>
            <button onClick={() => setActiveTab('analyzer')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'analyzer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Symptom Checker</button>
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Side Effect Summary</button>
          </div>

          <div className="flex-1 relative min-h-[500px]">
            {activeTab === 'catalog' ? (
              selectedMedication ? <MedicationDetails medication={selectedMedication} onClose={() => setSelectedMedication(null)} /> :
              <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed"><BookOpen size={48} className="mb-4 opacity-20" /><p>No Medication Selected</p></div>
            ) : activeTab === 'analyzer' ? <SideEffectAnalyzer currentMedications={medications} /> : <SideEffectSummary medications={medications} />}
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsModal
          currentConfig={appConfig}
          onClose={() => setShowSettings(false)}
          onSaved={refreshConfig}
        />
      )}
    </div>
  );
}
