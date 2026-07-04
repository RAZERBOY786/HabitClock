import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTheme, Theme } from '@/constants/theme';

export interface Task {
  id: string; title: string; done: boolean;
  category?: string; priority?: 'low' | 'medium' | 'high';
  dueDate?: string; createdAt: string;
}

export interface Alarm {
  id: string; hour: number; minute: number; label: string; active: boolean;
  repeat?: 'daily' | 'weekdays' | 'none';
  sound?: string; volume?: number;
}

export interface RoutineItem {
  id: string; time: string; label: string; icon: string; done: boolean;
}

export interface TimerSession {
  id: string; duration: number; completedAt: string;
}

export interface LapTime {
  id: string; time: number; lapNumber: number;
}

export interface FitnessDay {
  date: string;        // "YYYY-MM-DD"
  steps: number;
  water: number;
}

interface AppState {
  use24h: boolean;
  tasks: Task[];
  archivedTasks: Task[];
  alarms: Alarm[];
  routine: RoutineItem[];
  steps: number; water: number;
  fitnessHistory: FitnessDay[];
  timerHistory: TimerSession[];
  bestLap: number | null;
  streak: number;
  lastActiveDate: string | null;
  settings: {
    darkMode: boolean; notifications: boolean; vibration: boolean; sound: boolean;
    focusDuration: number; breakDuration: number; dailyGoal: number;
    profileName: string; profileEmail: string;
  };
}

interface AppContextType extends AppState {
  theme: Theme;
  toggle24h: () => void;
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  archiveCompleted: () => void;
  addAlarm: (a: Omit<Alarm, 'id'>) => void;
  toggleAlarm: (id: string) => void;
  deleteAlarm: (id: string) => void;
  updateAlarm: (id: string, data: Partial<Alarm>) => void;
  addRoutineItem: (r: Omit<RoutineItem, 'id'>) => void;
  removeRoutineItem: (id: string) => void;
  toggleRoutineItem: (id: string) => void;
  reorderRoutine: (items: RoutineItem[]) => void;
  adjustSteps: (n: number) => void;
  adjustWater: (n: number) => void;
  resetFitness: () => void;
  addTimerSession: (d: number) => void;
  setBestLap: (t: number) => void;
  updateSettings: (s: Partial<AppState['settings']>) => void;
  getActiveTasks: () => Task[];
  getCompletedTodayCount: () => number;
  getFitnessHistory: () => FitnessDay[];
}

const STORAGE_KEY = 'habitclock_data';

const defaultState: AppState = {
  use24h: false,
  tasks: [
    { id: '1', title: 'Design System Review', done: false, category: 'Work', priority: 'high', createdAt: new Date().toISOString() },
    { id: '2', title: 'Team Sync: LifeSync Q4', done: false, category: 'Meeting', priority: 'medium', createdAt: new Date().toISOString() },
    { id: '3', title: 'Client Feedback Implementation', done: false, category: 'Work', priority: 'high', createdAt: new Date().toISOString() },
  ],
  archivedTasks: [],
  alarms: [
    { id: '1', hour: 7, minute: 30, label: 'Morning', active: true, repeat: 'daily', sound: 'classic', volume: 0.8 },
    { id: '2', hour: 22, minute: 0, label: 'Night', active: false, repeat: 'daily', sound: 'gentle', volume: 0.5 },
  ],
  routine: [
    { id: 'r1', time: '06:00', label: 'Wake up', icon: 'bedtime', done: false },
    { id: 'r2', time: '07:00', label: 'Exercise', icon: 'fitness-center', done: false },
    { id: 'r3', time: '09:00', label: 'Work', icon: 'work', done: false },
    { id: 'r4', time: '12:00', label: 'Lunch Break', icon: 'restaurant', done: false },
    { id: 'r5', time: '15:00', label: 'Focus Session', icon: 'timer', done: false },
    { id: 'r6', time: '18:00', label: 'Wind Down', icon: 'nightlight', done: false },
    { id: 'r7', time: '22:00', label: 'Sleep', icon: 'bed', done: false },
  ],
  steps: 7420, water: 1.2,
  fitnessHistory: [
    { date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), steps: 5200, water: 1.0 },
    { date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), steps: 8100, water: 1.8 },
    { date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), steps: 3400, water: 0.7 },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), steps: 9200, water: 2.0 },
    { date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), steps: 6700, water: 1.5 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), steps: 11000, water: 2.2 },
  ],
  timerHistory: [],
  bestLap: null,
  streak: 0,
  lastActiveDate: null,
  settings: {
    darkMode: true, notifications: true, vibration: true, sound: true,
    focusDuration: 25, breakDuration: 5, dailyGoal: 8,
    profileName: 'Alex', profileEmail: 'alex@habitclock.app',
  },
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(json => {
      if (json) {
        const saved = JSON.parse(json);
        setState(prev => ({ ...prev, ...saved }));
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (loaded.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Helper to get today's YYYY-MM-DD
  const todayStr = () => new Date().toISOString().slice(0, 10);

  // Push current day to fitness history, keep last 7, reset current
  const archiveFitnessDay = useCallback(() => {
    setState(prev => {
      const date = todayStr();
      const existing = prev.fitnessHistory.find(d => d.date === date);
      if (existing) {
        // merge with any data already collected today
        const merged = { ...existing, steps: Math.max(existing.steps, prev.steps), water: Math.max(existing.water, prev.water) };
        const rest = prev.fitnessHistory.filter(d => d.date !== date);
        return { ...prev, fitnessHistory: [...rest, merged].sort((a, b) => a.date.localeCompare(b.date)).slice(-7), steps: 0, water: 0 };
      }
      const entry: FitnessDay = { date, steps: prev.steps, water: prev.water };
      return { ...prev, fitnessHistory: [...prev.fitnessHistory, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-7), steps: 0, water: 0 };
    });
  }, []);

  // Daily streak & reset logic
  useEffect(() => {
    const today = new Date().toDateString();
    if (state.lastActiveDate && state.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      archiveFitnessDay();
      if (state.lastActiveDate === yesterday) {
        setState(prev => ({ ...prev, streak: prev.streak + 1, lastActiveDate: today }));
      } else {
        setState(prev => ({ ...prev, streak: 0, lastActiveDate: today }));
      }
    } else if (!state.lastActiveDate) {
      setState(prev => ({ ...prev, lastActiveDate: today }));
    }
  }, []);

  const toggle24h = useCallback(() => {
    setState(prev => ({ ...prev, use24h: !prev.use24h }));
  }, []);

  const addTask = useCallback((t: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = { ...t, id: Date.now().toString(), createdAt: new Date().toISOString() };
    setState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, []);

  const archiveCompleted = useCallback(() => {
    setState(prev => ({
      ...prev,
      archivedTasks: [...prev.archivedTasks, ...prev.tasks.filter(t => t.done)],
      tasks: prev.tasks.filter(t => !t.done),
    }));
  }, []);

  const addAlarm = useCallback((a: Omit<Alarm, 'id'>) => {
    const alarm: Alarm = { ...a, id: Date.now().toString() };
    setState(prev => {
      const alarms = [...prev.alarms, alarm];
      alarms.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
      return { ...prev, alarms };
    });
  }, []);

  const toggleAlarm = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      alarms: prev.alarms.map(a => a.id === id ? { ...a, active: !a.active } : a),
    }));
  }, []);

  const deleteAlarm = useCallback((id: string) => {
    setState(prev => ({ ...prev, alarms: prev.alarms.filter(a => a.id !== id) }));
  }, []);

  const updateAlarm = useCallback((id: string, data: Partial<Alarm>) => {
    setState(prev => ({
      ...prev,
      alarms: prev.alarms.map(a => a.id === id ? { ...a, ...data } : a),
    }));
  }, []);

  const addRoutineItem = useCallback((r: Omit<RoutineItem, 'id'>) => {
    const item: RoutineItem = { ...r, id: Date.now().toString() };
    setState(prev => {
      const items = [...prev.routine, item];
      items.sort((a, b) => a.time.localeCompare(b.time));
      return { ...prev, routine: items };
    });
  }, []);

  const removeRoutineItem = useCallback((id: string) => {
    setState(prev => ({ ...prev, routine: prev.routine.filter(r => r.id !== id) }));
  }, []);

  const toggleRoutineItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      routine: prev.routine.map(r => r.id === id ? { ...r, done: !r.done } : r),
    }));
  }, []);

  const reorderRoutine = useCallback((items: RoutineItem[]) => {
    setState(prev => ({ ...prev, routine: items }));
  }, []);

  // Sync current day into fitnessHistory whenever steps/water change
  const syncFitnessDay = useCallback((prev: AppState): AppState => {
    const date = todayStr();
    const rest = prev.fitnessHistory.filter(d => d.date !== date);
    const entry: FitnessDay = { date, steps: prev.steps, water: prev.water };
    return { ...prev, fitnessHistory: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-7) };
  }, []);

  const adjustSteps = useCallback((n: number) => {
    setState(prev => syncFitnessDay({ ...prev, steps: Math.max(0, Math.min(100000, prev.steps + n)) }));
  }, [syncFitnessDay]);

  const adjustWater = useCallback((n: number) => {
    setState(prev => syncFitnessDay({ ...prev, water: Math.max(0, Math.min(10, +(prev.water + n).toFixed(1))) }));
  }, [syncFitnessDay]);

  const resetFitness = useCallback(() => {
    setState(prev => syncFitnessDay({ ...prev, steps: 0, water: 0 }));
  }, [syncFitnessDay]);

  const addTimerSession = useCallback((duration: number) => {
    const session: TimerSession = {
      id: Date.now().toString(), duration,
      completedAt: new Date().toISOString(),
    };
    setState(prev => ({ ...prev, timerHistory: [session, ...prev.timerHistory].slice(0, 50) }));
  }, []);

  const setBestLap = useCallback((t: number) => {
    setState(prev => ({ ...prev, bestLap: prev.bestLap ? Math.min(prev.bestLap, t) : t }));
  }, []);

  const updateSettings = useCallback((s: Partial<AppState['settings']>) => {
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...s } }));
  }, []);

  const getActiveTasks = useCallback(() => state.tasks.filter(t => !t.done), [state.tasks]);
  const getCompletedTodayCount = useCallback(() => {
    const today = new Date().toDateString();
    return state.tasks.filter(t => t.done && new Date(t.createdAt).toDateString() === today).length;
  }, [state.tasks]);
  const getFitnessHistory = useCallback(() => state.fitnessHistory, [state.fitnessHistory]);

  const theme = useMemo(() => getTheme(state.settings.darkMode), [state.settings.darkMode]);

  return (
    <AppContext.Provider value={{
      ...state,
      theme,
      toggle24h, addTask, toggleTask, deleteTask, archiveCompleted,
      addAlarm, toggleAlarm, deleteAlarm, updateAlarm,
      addRoutineItem, removeRoutineItem, toggleRoutineItem, reorderRoutine,
      adjustSteps, adjustWater, resetFitness,
      addTimerSession, setBestLap, updateSettings,
      getActiveTasks, getCompletedTodayCount, getFitnessHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
