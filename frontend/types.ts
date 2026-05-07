export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  purpose: string;
  sideEffects: string[];
  contraindications: string[];
  addedAt?: number;
}

export interface Profile {
  id: string;
  name: string;
  medications: Medication[];
  createdAt: number;
}

export interface SideEffectAnalysis {
  matchingMeds: string[];
  generalMeds: string[];
  explanation: string;
}
