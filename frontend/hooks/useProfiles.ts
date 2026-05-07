import { useState, useEffect, useCallback } from 'react';
import { Medication, Profile } from '../types';

const PROFILES_KEY = 'medcheck_profiles';
const ACTIVE_KEY = 'medcheck_active_profile';
const LEGACY_KEY = 'medcheck_medications';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
}

function loadProfiles(): Record<string, Profile> {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Migrate from legacy single-list storage
  const defaultId = generateId();
  let medications: Medication[] = [];
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) medications = JSON.parse(legacy);
  } catch {}

  const profiles: Record<string, Profile> = {
    [defaultId]: { id: defaultId, name: 'Default', medications, createdAt: Date.now() },
  };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  localStorage.setItem(ACTIVE_KEY, defaultId);
  if (medications.length) localStorage.removeItem(LEGACY_KEY);
  return profiles;
}

function loadActiveId(profiles: Record<string, Profile>): string {
  const stored = localStorage.getItem(ACTIVE_KEY);
  if (stored && profiles[stored]) return stored;
  return Object.keys(profiles)[0];
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>(() => loadProfiles());
  const [activeId, setActiveId] = useState<string>(() => loadActiveId(loadProfiles()));

  const activeProfile = profiles[activeId] ?? Object.values(profiles)[0];

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const updateMedications = useCallback((medications: Medication[]) => {
    setProfiles(prev => ({
      ...prev,
      [activeId]: { ...prev[activeId], medications },
    }));
  }, [activeId]);

  const createProfile = useCallback((name: string): string => {
    const id = generateId();
    const profile: Profile = { id, name: name.trim() || 'New Profile', medications: [], createdAt: Date.now() };
    setProfiles(prev => ({ ...prev, [id]: profile }));
    setActiveId(id);
    return id;
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => {
      const next = { ...prev };
      delete next[id];
      // Ensure at least one profile always exists
      if (Object.keys(next).length === 0) {
        const newId = generateId();
        next[newId] = { id: newId, name: 'Default', medications: [], createdAt: Date.now() };
        setActiveId(newId);
      } else if (activeId === id) {
        setActiveId(Object.keys(next)[0]);
      }
      return next;
    });
  }, [activeId]);

  const renameProfile = useCallback((id: string, name: string) => {
    setProfiles(prev => ({
      ...prev,
      [id]: { ...prev[id], name: name.trim() || prev[id].name },
    }));
  }, []);

  const switchProfile = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  return {
    profiles,
    activeId,
    activeProfile,
    updateMedications,
    createProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
  };
}
