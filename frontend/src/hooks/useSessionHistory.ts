import { useState, useCallback } from 'react';
import { ChatMessage } from '../components/ChatPanel';

export interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function now(): string {
  return new Date().toISOString();
}

function getTitleFromMessages(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    const text = firstUserMsg.content;
    return text.length > 30 ? text.slice(0, 30) + '...' : text;
  }
  return '新しいセッション';
}

export function useSessionHistory(storageKey: string) {
  const storageId = `sessions_${storageKey}`;

  const loadSessions = (): Session[] => {
    try {
      const raw = localStorage.getItem(storageId);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const loaded = loadSessions();
    return loaded.length > 0 ? loaded[0].id : null;
  });

  const saveSessions = useCallback((updated: Session[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(storageId, JSON.stringify(updated));
    } catch {
      // storage full - silently ignore
    }
  }, [storageId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const createSession = useCallback((welcomeMessage?: string) => {
    const id = generateId();
    const timestamp = now();
    const newSession: Session = {
      id,
      title: '新しいセッション',
      messages: welcomeMessage
        ? [{ id: Date.now(), role: 'assistant' as const, content: welcomeMessage }]
        : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(id);
    return id;
  }, [sessions, saveSessions]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const updateSessionMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
    const updated = sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            messages,
            title: getTitleFromMessages(messages),
            updatedAt: now(),
          }
        : s
    );
    saveSessions(updated);
  }, [sessions, saveSessions]);

  const deleteSession = useCallback((id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  }, [sessions, saveSessions, activeSessionId]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    updateSessionMessages,
    deleteSession,
  };
}
