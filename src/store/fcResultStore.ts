import { create } from 'zustand'
import { calculateFCBOM } from '@/domain/engine/fc-sizing'
import type { FCNetworkBOM, FCConstraintViolation } from '@/domain/schemas/fc-bom'
import { useFCInputStore } from './fcInputStore'

interface FCResultState {
  bom: FCNetworkBOM | null
  violations: FCConstraintViolation[]
}

export const useFCResultStore = create<FCResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription: recompute FC BOM whenever fcInputStore changes.
// This runs OUTSIDE the React lifecycle — no component mount needed.
// The store is NEVER persisted — it is always derived from fcInputStore.
useFCInputStore.subscribe((state) => {
  try {
    const bom = calculateFCBOM(state.input)
    useFCResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // If calculateFCBOM throws (invalid input), keep previous state
    // This handles edge cases during partial form updates
  }
})

// Initial computation — populate fcResultStore immediately on module load
const initialInput = useFCInputStore.getState().input
try {
  const initialBom = calculateFCBOM(initialInput)
  useFCResultStore.setState({ bom: initialBom, violations: initialBom.violations })
} catch {
  // Keep null if initial input is invalid
}
