import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Node 25+ provides a built-in localStorage via --experimental-webstorage that overrides
// jsdom's proper Storage prototype, resulting in an object without getItem/setItem methods.
// This polyfill restores a standards-compliant in-memory Storage implementation whenever
// the environment's localStorage is missing its prototype methods.
beforeAll(() => {
  if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
    const storage: Record<string, string> = {}
    const mock: Storage = {
      getItem: (key: string) => key in storage ? storage[key] : null,
      setItem: (key: string, value: string) => { storage[key] = String(value) },
      removeItem: (key: string) => { delete storage[key] },
      clear: () => { for (const key of Object.keys(storage)) delete storage[key] },
      get length() { return Object.keys(storage).length },
      key: (index: number) => Object.keys(storage)[index] ?? null,
    }
    Object.defineProperty(window, 'localStorage', { value: mock, writable: true })
  }
})

afterEach(() => {
  cleanup()
})
