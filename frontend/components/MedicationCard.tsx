import React from 'react';
import { Pill, Trash2, AlertCircle, Info } from 'lucide-react';
import { Medication } from '../types';

interface MedicationCardProps {
  medication: Medication;
  onRemove: (id: string) => void;
  onClick: (medication: Medication) => void;
  isSelected: boolean;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({ 
  medication, 
  onRemove, 
  onClick,
  isSelected 
}) => {
  return (
    <div 
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-sm' 
          : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
      onClick={() => onClick(medication)}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
            <Pill size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate">{medication.name}</h3>
            <p className="text-xs text-blue-600 font-medium line-clamp-1 mb-0.5">
              {medication.purpose || 'Purpose not specified'}
            </p>
            {medication.genericName && (
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                {medication.genericName}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(medication.id);
          }}
          className="text-slate-300 hover:text-red-500 transition-colors p-1 ml-2"
          title="Remove medication"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <AlertCircle size={12} className="text-amber-500" />
          <span>{medication.sideEffects.length} Side Effects</span>
        </div>
        <div className="flex items-center gap-1">
          <Info size={12} className="text-red-400" />
          <span>{medication.contraindications.length} Warnings</span>
        </div>
      </div>
    </div>
  );
};
