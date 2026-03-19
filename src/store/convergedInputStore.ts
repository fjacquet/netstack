import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { ConvergedSizingInput } from '@/domain/schemas/converged-input'

interface ConvergedInputState {
  input: ConvergedSizingInput
  setInput: (partial: Partial<ConvergedSizingInput>) => void
  resetInput: () => void
}

const DEFAULT_CONVERGED_INPUT: ConvergedSizingInput = {
  topology: 'leaf-spine',
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  rackSize: '42U',
  serverUHeight: '1U',
  // Ethernet
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  activeUplinksPerLeaf: 4,
  connectivityType: '25G',
  cableType: 'DAC',
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  switchPositioning: 'ToR',
  // 3-tier fields (used when topology='three-tier'; ignored for 'leaf-spine')
  accessModel: 'S5248F-ON',
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  // Brownfield toggles
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
  // FC (disabled by default)
  hbaPortsPerServer: 0,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  preferredGeneration: 'any',
}

/**
 * Lazy localStorage adapter: accesses window.localStorage at call time rather than at module
 * load time. This ensures correct behavior in both browser and jsdom test environments where
 * localStorage may not yet be fully set up when the module is first imported.
 *
 * Implements PersistStorage<ConvergedInputState> -- handles JSON serialization/deserialization
 * in the same way createJSONStorage does, but accesses storage lazily.
 */
const lazyLocalStorageConverged: PersistStorage<ConvergedInputState> = {
  getItem: (name: string): StorageValue<ConvergedInputState> | null => {
    try {
      const str = window.localStorage.getItem(name)
      if (str === null) return null
      return JSON.parse(str) as StorageValue<ConvergedInputState>
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<ConvergedInputState>): void => {
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

export const useConvergedInputStore = create<ConvergedInputState>()(
  persist(
    (set) => ({
      input: DEFAULT_CONVERGED_INPUT,
      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
      resetInput: () => set({ input: DEFAULT_CONVERGED_INPUT }),
    }),
    {
      name: 'netstack-converged-input',
      version: 1,
      storage: lazyLocalStorageConverged,
      /**
       * Merge persisted state with defaults.
       * Simple merge -- no legacy migration needed (new key, no prior versions).
       */
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ConvergedInputState>
        const oldInput = persistedState?.input as Partial<ConvergedSizingInput> | undefined
        return {
          ...current,
          input: { ...DEFAULT_CONVERGED_INPUT, ...(oldInput ?? {}) } as ConvergedSizingInput,
        }
      },
    }
  )
)
