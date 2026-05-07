import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Medication, SideEffectAnalysis } from '../types';
import { analyzeSideEffect } from '../services/geminiService';

interface SideEffectAnalyzerProps {
  currentMedications: Medication[];
}

export const SideEffectAnalyzer: React.FC<SideEffectAnalyzerProps> = ({ currentMedications }) => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SideEffectAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeSideEffect(query, currentMedications);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Symptom Checker</h2>
        <p className="text-slate-500 text-sm">
          Experiencing a side effect? Search to see if it might be related to your medications.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Dizziness, Nausea, Dry mouth..."
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={isAnalyzing}
        />
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
        <button
          type="submit"
          disabled={!query.trim() || isAnalyzing}
          className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : 'Check'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 mb-6">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {currentMedications.length > 0 && (
            <div className={`p-5 rounded-xl border ${result.matchingMeds.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-start gap-3">
                {result.matchingMeds.length > 0 ? (
                  <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
                ) : (
                  <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={24} />
                )}
                <div>
                  <h3 className={`font-semibold text-lg mb-2 ${result.matchingMeds.length > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                    {result.matchingMeds.length > 0 ? 'Potential Match Found' : 'No Direct Matches in Your List'}
                  </h3>
                  {result.matchingMeds.length > 0 ? (
                    <p className="text-amber-800 text-sm mb-3">
                      The following medications in your list are known to potentially cause <strong>"{query}"</strong>:
                    </p>
                  ) : (
                    <p className="text-green-800 text-sm mb-3">
                      None of your currently listed medications are commonly known to cause <strong>"{query}"</strong>.
                    </p>
                  )}
                  
                  {result.matchingMeds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {result.matchingMeds.map((med, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-200/50 text-amber-900 rounded-full text-sm font-medium border border-amber-300/50">
                          {med}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result.generalMeds.length > 0 && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Info className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Other Common Causes</h3>
                  <p className="text-slate-600 text-sm mb-3">
                    Medications generally known to cause this symptom include:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.generalMeds.map((med, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white text-slate-700 rounded-full text-sm border border-slate-200 shadow-sm">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>AI Analysis:</strong> {result.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
