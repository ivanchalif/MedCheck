import React from 'react';
import { Medication } from '../types';
import { AlertTriangle, Activity, X, Info } from 'lucide-react';

interface MedicationDetailsProps {
  medication: Medication | null;
  onClose: () => void;
}

export const MedicationDetails: React.FC<MedicationDetailsProps> = ({ medication, onClose }) => {
  if (!medication) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">{medication.name}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <p className="text-blue-600 font-semibold text-lg">{medication.purpose}</p>
            {medication.genericName && (
              <span className="text-slate-400 text-sm bg-slate-200/50 px-2 py-0.5 rounded">
                Generic: {medication.genericName}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-amber-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Common Side Effects</h3>
          </div>
          {medication.sideEffects.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {medication.sideEffects.map((effect, idx) => (
                <li key={idx} className="flex items-start gap-2 text-slate-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
                  <span className="text-sm">{effect}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic text-sm">No common side effects listed.</p>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-slate-800">Contraindications & Warnings</h3>
          </div>
          {medication.contraindications.length > 0 ? (
            <ul className="space-y-2">
              {medication.contraindications.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{warning}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic text-sm">No major contraindications listed.</p>
          )}
        </section>
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-2">
        <Info size={12} />
        <span>Information provided by AI. Always verify with a healthcare professional.</span>
      </div>
    </div>
  );
};
