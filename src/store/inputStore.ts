import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { SizingInput } from '@/domain/schemas/input'

interface InputState {
  input: SizingInput
  setInput: (partial: Partial<SizingInput>) => void
  resetInput: () => void
}

/**
 * Default input: 3 racks × 16 servers = 48 servers total.
 * Equivalent to the old scalar default of { totalServers: 48, serversPerRack: 16 }.
 */
const DEFAULT_INPUT: SizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  activeUplinksPerLeaf: 4,
  connectivityType: '25G',
  cableType: 'DAC',
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
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
      resetInput: () => set({ input: DEFAULT_INPUT }),
    }),
    {
      name: 'netstack-input',
      version: 6,
      storage: lazyLocalStorage,
      /**
       * Merge persisted state with defaults.
       * Handles migration from v2 (scalar totalServers/serversPerRack) to v3 (racks array),
       * v3 to v4 (adds portsPerServerFrontend, portsPerServerBackend, activeUplinksPerLeaf),
       * v4 to v5 (adds serverUHeight), and v5 to v6 (adds switchPositioning).
       * The { ...DEFAULT_INPUT, ...oldInput } spread fills in any missing new fields.
       */
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<InputState>;
        const oldInput = persistedState?.input as Record<string, unknown> | undefined;

        // Migrate v2 scalar format to v3 racks array
        let migratedInput: SizingInput = { ...DEFAULT_INPUT };
        if (oldInput) {
          if ('racks' in oldInput && Array.isArray(oldInput.racks)) {
            // Already v3 format — merge normally
            migratedInput = { ...DEFAULT_INPUT, ...oldInput } as SizingInput;
          } else if ('totalServers' in oldInput && 'serversPerRack' in oldInput) {
            // v2 format — convert to racks array
            const totalServers = oldInput.totalServers as number;
            const serversPerRack = oldInput.serversPerRack as number;
            const rackCount = Math.ceil(totalServers / serversPerRack);
            const racks = Array.from({ length: rackCount }, (_, i) => ({
              serverCount: i < rackCount - 1
                ? serversPerRack
                : totalServers - serversPerRack * (rackCount - 1),
            }));
            const { totalServers: _ts, serversPerRack: _spr, ...rest } = oldInput;
            migratedInput = { ...DEFAULT_INPUT, ...rest, racks } as SizingInput;
          }
        }

        return {
          ...current,
          input: migratedInput,
        };
      },
    }
  )
)
