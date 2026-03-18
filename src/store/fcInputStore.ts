import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

interface FCInputState {
  input: FCSizingInput
  setInput: (partial: Partial<FCSizingInput>) => void
  resetInput: () => void
}

const DEFAULT_FC_INPUT: FCSizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
  preferredGeneration: 'any',
}

/**
 * Lazy localStorage adapter: accesses window.localStorage at call time rather than at module
 * load time. This ensures correct behavior in both browser and jsdom test environments where
 * localStorage may not yet be fully set up when the module is first imported.
 *
 * Implements PersistStorage<FCInputState> — handles JSON serialization/deserialization
 * in the same way createJSONStorage does, but accesses storage lazily.
 */
const lazyLocalStorageFC: PersistStorage<FCInputState> = {
  getItem: (name: string): StorageValue<FCInputState> | null => {
    try {
      const str = window.localStorage.getItem(name)
      if (str === null) return null
      return JSON.parse(str) as StorageValue<FCInputState>
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<FCInputState>): void => {
    try {
      window.localStorage.setItem(name, JSON.stringify(value))
    } catch {
      // Ignore write errors (e.g. private browsing, storage quota)
    }
  },
  removeItem: (name: string): void => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Ignore errors
    }
  },
}

export const useFCInputStore = create<FCInputState>()(
  persist(
    (set) => ({
      input: DEFAULT_FC_INPUT,
      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
      resetInput: () => set({ input: DEFAULT_FC_INPUT }),
    }),
    {
      name: 'netstack-fc-input',
      version: 1,
      storage: lazyLocalStorageFC,
      /**
       * Merge persisted state with defaults.
       * Simple merge — no legacy migration needed (new key, no prior versions).
       */
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<FCInputState>
        const oldInput = persistedState?.input as Partial<FCSizingInput> | undefined
        return {
          ...current,
          input: { ...DEFAULT_FC_INPUT, ...(oldInput ?? {}) } as FCSizingInput,
        }
      },
    }
  )
)
