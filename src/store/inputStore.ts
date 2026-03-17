import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { SizingInput } from '@/domain/schemas/input'

interface InputState {
  input: SizingInput
  setInput: (partial: Partial<SizingInput>) => void
}

const DEFAULT_INPUT: SizingInput = {
  totalServers: 48,
  serversPerRack: 16,
  connectivityType: '25G',
  cableType: 'DAC',
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
}

/**
 * Lazy localStorage adapter: accesses window.localStorage at call time rather than at module
 * load time. This ensures correct behavior in both browser and jsdom test environments where
 * localStorage may not yet be fully set up when the module is first imported.
 *
 * Implements PersistStorage<InputState> — handles JSON serialization/deserialization
 * in the same way createJSONStorage does, but accesses storage lazily.
 */
const lazyLocalStorage: PersistStorage<InputState> = {
  getItem: (name: string): StorageValue<InputState> | null => {
    try {
      const str = window.localStorage.getItem(name)
      if (str === null) return null
      return JSON.parse(str) as StorageValue<InputState>
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<InputState>): void => {
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

export const useInputStore = create<InputState>()(
  persist(
    (set) => ({
      input: DEFAULT_INPUT,
      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
    }),
    {
      name: 'netstack-input',
      storage: lazyLocalStorage,
    }
  )
)
