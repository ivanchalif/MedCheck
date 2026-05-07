import React, { useMemo } from 'react';
import { Medication } from '../types';
import { AlertTriangle, Activity, ShieldAlert } from 'lucide-react';

interface SideEffectSummaryProps {
  medications: Medication[];
}

export const SideEffectSummary: React.FC<SideEffectSummaryProps> = ({ medications }) => {
  const aggregated = useMemo(() => {
    const map = new Map<string, Medication[]>();
    
    medications.forEach(med => {
      med.sideEffects.forEach(effect => {
        const normalized = effect.trim().toLowerCase();
        const display = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        let existingKey = Array.from(map.keys()).find(k => k.toLowerCase() === normalized);
        const keyToUse = existingKey || display;

        if (!map.has(keyToUse)) {
          map.set(keyToUse, []);
        }
        if (!map.get(keyToUse)!.some(m => m.id === med.id)) {
          map.get(keyToUse)!.push(med);
        }
      });
    });

    return Array.from(map.entries())
      .map(([effect, meds]) => ({ effect, meds }))
      .sort((a, b) => b.meds.length - a.meds.length || a.effect.localeCompare(b.effect));
  }, [medications]);

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed p-8">
        <Activity size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium text-slate-500">No Medications Added</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Side Effect Summary</h2>
        <p className="text-slate-500 text-sm">Aggregated list of potential side effects from your medications.</p>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 flex-1">
        {aggregated.map(({ effect, meds }) => {
          const isMultiple = meds.length > 1;
          return (
            <div key={effect} className={`p-4 rounded-xl border transition-colors ${isMultiple ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {isMultiple ? <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} /> : <Activity className="text-slate-400 mt-0.5 flex-shrink-0" size={20} />}
                  <div>
                    <h3 className={`font-semibold ${isMultiple ? 'text-amber-900' : 'text-slate-800'}`}>{effect}</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {meds.map(m => (
                        <span key={m.id} className={`px-2.5 py-1 rounded-md text-xs font-medium border ${isMultiple ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {isMultiple && <span className="px-2.5 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">{meds.length} meds</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
