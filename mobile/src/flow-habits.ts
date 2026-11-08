import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  addToRoutine,
  autoRest,
  completed as recordCompletion,
  createRoutine,
  deleteRoutine,
  emptyFlowHabits,
  localDate,
  mergeFlowHabits,
  parseFlowHabits,
  removeFromRoutine,
  renameRoutine,
  seedStages,
  setFlowStage,
  type DaySlot,
  type FlowHabitState,
  type FlowStage,
} from '../../shared/flow-habits';
import { usePaneState } from './pane-state';

/**
 * Which flows this account opened, where they left the deck, which part of the day
 * each one belongs to, and whether it is Active, Up next, or Resting.
 * Remembered on this device per account.
 */
export function useFlowHabits(userId: string | undefined) {
  const key = `qram.flowHabits.${userId ?? 'guest'}`.replace(/[^\w.-]/g, '_');
  const [habits, setHabits] = usePaneState<FlowHabitState | undefined>(
    'flowHabits',
    undefined,
    'account',
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancel = false;
    setReady(false);
    void SecureStore.getItemAsync(key)
      .then(value => {
        if (cancel) return;
        let stored = emptyFlowHabits();
        if (value) {
          try {
            stored = parseFlowHabits(JSON.parse(value));
          } catch {
            stored = emptyFlowHabits();
          }
        }
        setHabits(current => (current ? mergeFlowHabits(stored, current) : stored));
        setReady(true);
      })
      .catch(() => {
        if (cancel) return;
        setHabits(current => current ?? emptyFlowHabits());
        setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [key, setHabits]);
  const persist = useCallback(
    (recipe: (current: FlowHabitState) => FlowHabitState) => {
      setHabits(current => {
        const base = current ?? emptyFlowHabits();
        const complete: FlowHabitState = {
          ...emptyFlowHabits(),
          ...base,
          uses: base.uses ?? {},
          routines: Array.isArray(base.routines) ? base.routines : [],
        };
        const next = recipe(complete);
        if (next === complete) return current === undefined ? complete : current;
        void SecureStore.setItemAsync(key, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [key, setHabits],
  );
  const opened = useCallback(
    (flowId: string, cardIndex?: number) => {
      persist(current => {
        const now = Date.now();
        const iso = new Date(now).toISOString();
        return {
          ...current,
          lastOpened: { ...current.lastOpened, [flowId]: iso },
          position:
            typeof cardIndex === 'number' && Number.isInteger(cardIndex) && cardIndex >= 0
              ? { ...current.position, [flowId]: cardIndex }
              : current.position,
        };
      });
    },
    [persist],
  );
  const completed = useCallback(
    (flowId: string) => {
      persist(current => recordCompletion(current, flowId, new Date().toISOString(), Date.now()));
    },
    [persist],
  );
  const setSlot = useCallback(
    (flowId: string, slot: DaySlot | null) => {
      persist(current => {
        const slots = { ...current.slots };
        if (slot) slots[flowId] = slot;
        else delete slots[flowId];
        return { ...current, slots };
      });
    },
    [persist],
  );
  const setStage = useCallback(
    (id: string, stage: FlowStage, slot?: DaySlot | null) => {
      persist(current => {
        let next = setFlowStage(current, id, stage, new Date().toISOString());
        if (slot !== undefined) {
          const slots = { ...next.slots };
          if (slot) slots[id] = slot;
          else delete slots[id];
          next = { ...next, slots };
        }
        if (stage === 'active') next = { ...next, rested: next.rested.filter(item => item !== id) };
        return next;
      });
    },
    [persist],
  );
  const tryToday = useCallback(
    (id: string) => {
      const today = localDate(new Date());
      persist(current => ({ ...current, tryToday: { ...current.tryToday, [id]: today } }));
    },
    [persist],
  );
  const dismissRested = useCallback(() => {
    persist(current => (current.rested.length ? { ...current, rested: [] } : current));
  }, [persist]);
  const restoreRested = useCallback(() => {
    persist(current => {
      if (!current.rested.length) return current;
      const nowIso = new Date().toISOString();
      let next = current;
      for (const id of current.rested) next = setFlowStage(next, id, 'active', nowIso);
      return { ...next, rested: [] };
    });
  }, [persist]);
  const sync = useCallback(
    (ids: readonly string[]) => {
      persist(current => {
        const seeded = seedStages(current, ids, new Date().toISOString());
        return autoRest(seeded, ids, Date.now()).state;
      });
    },
    [persist],
  );
  const makeRoutine = useCallback(
    (name: string, flowIds: readonly string[], slot: DaySlot | null) => {
      persist(current => createRoutine(current, name, flowIds, slot));
    },
    [persist],
  );
  const addFlowToRoutine = useCallback(
    (routineId: string, flowId: string) => {
      persist(current => addToRoutine(current, routineId, flowId));
    },
    [persist],
  );
  const removeFlowFromRoutine = useCallback(
    (routineId: string, flowId: string) => {
      persist(current => removeFromRoutine(current, routineId, flowId));
    },
    [persist],
  );
  const rename = useCallback(
    (routineId: string, name: string) => {
      persist(current => renameRoutine(current, routineId, name));
    },
    [persist],
  );
  const removeRoutine = useCallback(
    (routineId: string) => {
      persist(current => deleteRoutine(current, routineId));
    },
    [persist],
  );
  return {
    habits: habits ?? emptyFlowHabits(),
    ready,
    opened,
    completed,
    setSlot,
    setStage,
    tryToday,
    dismissRested,
    restoreRested,
    sync,
    createRoutine: makeRoutine,
    addToRoutine: addFlowToRoutine,
    removeFromRoutine: removeFlowFromRoutine,
    renameRoutine: rename,
    deleteRoutine: removeRoutine,
  };
}
