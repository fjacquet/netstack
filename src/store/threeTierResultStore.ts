import { create } from 'zustand'
import { calculateThreeTierBOM } from '@/domain/engine/three-tier-sizing'
import type { ThreeTierBOM, ThreeTierConstraintViolation } from '@/domain/schemas/three-tier-bom'
import { useThreeTierInputStore } from './threeTierInputStore'

interface ThreeTierResultState {
  bom: ThreeTierBOM | null
  violations: ThreeTierConstraintViolation[]
}

export const useThreeTierResultStore = create<ThreeTierResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription: recompute BOM whenever threeTierInputStore changes.
// This runs OUTSIDE the React lifecycle -- no component mount needed.
// The store is NEVER persisted -- it is always derived.
useThreeTierInputStore.subscribe((state) => {
  try {
    const bom = calculateThreeTierBOM(state.input)
    useThreeTierResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // If calculateThreeTierBOM throws (invalid input), keep previous state
    // This handles edge cases during partial form updates
  }
})

// Initial computation -- populate resultStore immediately
const initialInput = useThreeTierInputStore.getState().input
try {
  const initialBom = calculateThreeTierBOM(initialInput)
  useThreeTierResultStore.setState({ bom: initialBom, violations: initialBom.violations })
} catch {
  // Keep null if initial input is invalid
}
