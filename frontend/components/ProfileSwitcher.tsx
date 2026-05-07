import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Profile } from '../types';

interface Props {
  profiles: Record<string, Profile>;
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProfileSwitcher({ profiles, activeId, onSwitch, onCreate, onDelete, onRename }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const activeProfile = profiles[activeId];
  const profileList = Object.values(profiles).sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (creating && newNameRef.current) newNameRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  function handleRename(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (renameValue.trim()) onRename(id, renameValue.trim());
    setRenamingId(null);
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function handleDelete(id: string) {
    const profile = profiles[id];
    const medCount = profile?.medications?.length ?? 0;
    const msg = medCount > 0
      ? `Delete "${profile.name}"? This will remove ${medCount} medication${medCount !== 1 ? 's' : ''}.`
      : `Delete "${profile.name}"?`;
    if (window.confirm(msg)) {
      onDelete(id);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setCreating(false); setRenamingId(null); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors border border-slate-200"
      >
        <User size={16} className="text-blue-500 shrink-0" />
        <span className="max-w-[120px] truncate">{activeProfile?.name ?? 'Profile'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-3 pt-3 pb-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">Profiles</p>
          </div>

          <ul className="max-h-60 overflow-y-auto px-2 pb-2">
            {profileList.map(profile => (
              <li key={profile.id}>
                {renamingId === profile.id ? (
                  <form onSubmit={e => handleRename(e, profile.id)} className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => e.key === 'Escape' && setRenamingId(null)}
                      className="flex-1 min-w-0 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="p-1 text-blue-600 hover:text-blue-800">
                      <Check size={15} />
                    </button>
                  </form>
                ) : (
                  <div className={`flex items-center gap-1 px-2 py-2 rounded-xl group ${profile.id === activeId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <button
                      className="flex-1 flex items-center gap-2 text-left min-w-0"
                      onClick={() => { onSwitch(profile.id); setOpen(false); }}
                    >
                      {profile.id === activeId
                        ? <Check size={14} className="text-blue-500 shrink-0" />
                        : <span className="w-3.5 shrink-0" />
                      }
                      <span className={`text-sm truncate ${profile.id === activeId ? 'font-semibold text-blue-700' : 'text-slate-700'}`}>
                        {profile.name}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 shrink-0">
                        {profile.medications.length} med{profile.medications.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    <button
                      onClick={() => startRename(profile.id, profile.name)}
                      className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Rename"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete profile"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-slate-100 px-2 py-2">
            {creating ? (
              <form onSubmit={handleCreate} className="flex items-center gap-2 px-2 py-1">
                <input
                  ref={newNameRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setCreating(false)}
                  placeholder="Profile name..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Plus size={15} className="text-blue-500" />
                New profile
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
