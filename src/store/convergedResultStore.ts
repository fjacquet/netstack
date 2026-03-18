import { create } from 'zustand'
import { calculateConvergedBOM } from '@/domain/engine/converged-sizing'
import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import type { ConstraintViolation } from '@/domain/schemas/bom'
import type { FCConstraintViolation } from '@/domain/schemas/fc-bom'
import { useConvergedInputStore } from './convergedInputStore'

interface ConvergedResultState {
  bom: ConvergedBOM | null
  violations: (ConstraintViolation | FCConstraintViolation)[]
}

export const useConvergedResultStore = create<ConvergedResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription: recompute converged BOM whenever convergedInputStore changes.
// This runs OUTSIDE the React lifecycle -- no component mount needed.
// The store is NEVER persisted -- it is always derived from convergedInputStore.
useConvergedInputStore.subscribe((state) => {
  try {
    const bom = calculateConvergedBOM(state.input)
    useConvergedResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // If calculateConvergedBOM throws (invalid input), keep previous state
    // This handles edge cases during partial form updates
  }
})

// Initial computation -- populate convergedResultStore immediately on module load
const initialInput = useConvergedInputStore.getState().input
try {
  const initialBom = calculateConvergedBOM(initialInput)
  useConvergedResultStore.setState({ bom: initialBom, violations: initialBom.violations })
} catch {
  // Keep null if initial input is invalid
}
