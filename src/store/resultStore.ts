import { create } from 'zustand'
import { calculateBOM } from '@/domain/engine/sizing'
import { calculateThreeTierBOM } from '@/domain/engine/three-tier-sizing'
import type { NetworkBOM, ConstraintViolation } from '@/domain/schemas/bom'
import type { ThreeTierBOM, ThreeTierConstraintViolation } from '@/domain/schemas/three-tier-bom'
import type { ThreeTierSizingInput } from '@/domain/schemas/three-tier-input'
import type { SizingInput } from '@/domain/schemas/input'
import { useInputStore } from './inputStore'

interface ResultState {
  bom: NetworkBOM | null
  threeTierBom: ThreeTierBOM | null
  violations: ConstraintViolation[] | ThreeTierConstraintViolation[]
}

/**
 * Map unified SizingInput to ThreeTierSizingInput for the three-tier engine.
 * Extracts only the fields the three-tier engine expects.
 */
function toThreeTierInput(input: SizingInput): ThreeTierSizingInput {
  return {
    racks: input.racks,
    portsPerServerFrontend: input.portsPerServerFrontend,
    portsPerServerBackend: input.portsPerServerBackend,
    connectivityType: input.connectivityType,
    cableType: input.cableType,
    accessModel: input.accessModel,
    activeUplinksPerAccess: input.activeUplinksPerAccess,
    aggregationModel: input.aggregationModel,
    activeUplinksPerAggregation: input.activeUplinksPerAggregation,
    coreModel: input.coreModel,
    borderLeafModel: input.borderLeafModel,
    borderLeafCount: input.borderLeafCount,
    rackSize: input.rackSize,
    serverUHeight: input.serverUHeight,
    switchPositioning: input.switchPositioning,
    existingCoreDeployed: input.existingCoreDeployed,
  }
}

/**
 * Compute BOM based on topology and update result store.
 * Dispatches to calculateBOM (Clos) or calculateThreeTierBOM (three-tier).
 */
function computeAndUpdateBOM(input: SizingInput): void {
  if (input.topology === 'three-tier') {
    const ttInput = toThreeTierInput(input)
    const ttBom = calculateThreeTierBOM(ttInput)
    // Post-processing: zero out core switches for brownfield deployments
    // Cables and oversubscription remain unchanged (calculated against full fabric)
    if (input.existingCoreDeployed) {
      ttBom.coreSwitches = 0
    }
    useResultStore.setState({ bom: null, threeTierBom: ttBom, violations: ttBom.violations })
  } else {
    const bom = calculateBOM(input)
    // Post-processing: zero out spine switches for brownfield deployments
    // Cables and oversubscription remain unchanged (calculated against full fabric)
    if (input.existingSpinesDeployed) {
      bom.spineSwitches = 0
    }
    useResultStore.setState({ bom, threeTierBom: null, violations: bom.violations })
  }
}

export const useResultStore = create<ResultState>()(() => ({
  bom: null,
  threeTierBom: null,
  violations: [],
}))

// Module-level subscription: recompute BOM whenever inputStore changes.
// This runs OUTSIDE the React lifecycle — no component mount needed.
// The store is NEVER persisted — it is always derived.
useInputStore.subscribe((state) => {
  try {
    computeAndUpdateBOM(state.input)
  } catch {
    // If engine throws (invalid input), keep previous state
    // This handles edge cases during partial form updates
  }
})

// Initial computation — populate resultStore immediately
const initialInput = useInputStore.getState().input
try {
  computeAndUpdateBOM(initialInput)
} catch {
  // Keep null if initial input is invalid
}
