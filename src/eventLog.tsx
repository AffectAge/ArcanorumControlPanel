import { createContext, useContext } from 'react';
import type { EventCategory, EventLogEntry, EventLogState } from './types';

export type AddEventPayload = {
  category: EventCategory;
  message: string;
  title?: string;
  countryId?: string;
};

export type EventLogContextValue = {
  log: EventLogState;
  addEvent: (payload: AddEventPayload) => void;
  setFilters: (filters: EventLogState['filters']) => void;
  clearLog: () => void;
  trimOld: () => void;
  toggleCollapsed: () => void;
  collapsed: boolean;
};

export const EventLogContext = createContext<EventLogContextValue | null>(null);

export const useEventLog = () => {
  const ctx = useContext(EventLogContext);
  if (!ctx) {
    throw new Error('useEventLog must be used within EventLogContext.Provider');
  }
  return ctx;
};

export const createDefaultFilters = (): EventLogState['filters'] => ({
  system: true,
  colonization: true,
  politics: true,
  economy: true,
  military: true,
  diplomacy: true,
});

export const createDefaultLog = (): EventLogState => ({
  entries: [],
  filters: createDefaultFilters(),
});
