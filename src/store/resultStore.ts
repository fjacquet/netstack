import { create } from 'zustand'
import { calculateBOM } from '@/domain/engine/sizing'
import type { NetworkBOM, ConstraintViolation } from '@/domain/schemas/bom'
import { useInputStore } from './inputStore'

interface ResultState {
  bom: NetworkBOM | null
  violations: ConstraintViolation[]
}

export const useResultStore = create<ResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription: recompute BOM whenever inputStore changes.
// This runs OUTSIDE the React lifecycle — no component mount needed.
// The store is NEVER persisted — it is always derived.
useInputStore.subscribe((state) => {
  try {
    const bom = calculateBOM(state.input)
    useResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // If calculateBOM throws (invalid input), keep previous state
    // This handles edge cases during partial form updates
  }
})

// Initial computation — populate resultStore immediately
const initialInput = useInputStore.getState().input
try {
  const initialBom = calculateBOM(initialInput)
  useResultStore.setState({ bom: initialBom, violations: initialBom.violations })
} catch {
  // Keep null if initial input is invalid
}
