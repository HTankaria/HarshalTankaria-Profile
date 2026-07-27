import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Part } from '../types/part';

const STORAGE_KEY = 'parts-db-helper:parts';

function loadParts(): Part[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Part[]) : [];
  } catch {
    return [];
  }
}

interface Ctx {
  parts: Part[];
  addPart: (part: Part) => void;
  updatePart: (id: string, updates: Partial<Part>) => void;
  removePart: (id: string) => void;
  clearAll: () => void;
}

const PartsCtx = createContext<Ctx | null>(null);

export function PartsStoreProvider({ children }: { children: React.ReactNode }) {
  const [parts, setParts] = useState<Part[]>(loadParts);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parts));
  }, [parts]);

  const addPart = useCallback((part: Part) => {
    setParts(prev => [...prev, part]);
  }, []);

  const updatePart = useCallback((id: string, updates: Partial<Part>) => {
    setParts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const removePart = useCallback((id: string) => {
    setParts(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearAll = useCallback(() => setParts([]), []);

  return (
    <PartsCtx.Provider value={{ parts, addPart, updatePart, removePart, clearAll }}>
      {children}
    </PartsCtx.Provider>
  );
}

export function useParts(): Ctx {
  const ctx = useContext(PartsCtx);
  if (!ctx) throw new Error('useParts must be inside PartsStoreProvider');
  return ctx;
}
