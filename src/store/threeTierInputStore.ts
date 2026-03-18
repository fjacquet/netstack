import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { ThreeTierSizingInput } from '@/domain/schemas/three-tier-input'

interface ThreeTierInputState {
  input: ThreeTierSizingInput
  setInput: (partial: Partial<ThreeTierSizingInput>) => void
  resetInput: () => void
}

/**
 * Default input: 3 racks x 16 servers = 48 servers total.
 * Same physical defaults as Ethernet, with three-tier-specific model selections.
 */
const DEFAULT_THREE_TIER_INPUT: ThreeTierSizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  connectivityType: '25G',
  cableType: 'DAC',
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
  serverUHeight: '1U',
  switchPositioning: 'ToR',
}

/**
 * Lazy localStorage adapter: accesses window.localStorage at call time rather than at module
 * load time. This ensures correct behavior in both browser and jsdom test environments where
 * localStorage may not yet be fully set up when the module is first imported.
 *
 * Implements PersistStorage<ThreeTierInputState> -- handles JSON serialization/deserialization
 * in the same way createJSONStorage does, but accesses storage lazily.
 */
const lazyLocalStorageThreeTier: PersistStorage<ThreeTierInputState> = {
  getItem: (name: string): StorageValue<ThreeTierInputState> | null => {
    try {
      const str = window.localStorage.getItem(name)
      if (str === null) return null
      return JSON.parse(str) as StorageValue<ThreeTierInputState>
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<ThreeTierInputState>): void => {
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

export const useThreeTierInputStore = create<ThreeTierInputState>()(
  persist(
    (set) => ({
      input: DEFAULT_THREE_TIER_INPUT,
      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
      resetInput: () => set({ input: DEFAULT_THREE_TIER_INPUT }),
    }),
    {
      name: 'netstack-three-tier-input',
      version: 1,
      storage: lazyLocalStorageThreeTier,
      /**
       * Merge persisted state with defaults.
       * Simple merge -- no legacy migration needed (new key, no prior versions).
       */
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ThreeTierInputState>
        const oldInput = persistedState?.input as Partial<ThreeTierSizingInput> | undefined
        return {
          ...current,
          input: { ...DEFAULT_THREE_TIER_INPUT, ...(oldInput ?? {}) } as ThreeTierSizingInput,
        }
      },
    }
  )
)
