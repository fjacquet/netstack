import { describe, it, expect } from 'vitest'
import { getSaturationLevel, getSaturationBorderClass } from './saturation'

describe('getSaturationLevel', () => {
  it('returns healthy when pct < 80%', () => {
    expect(getSaturationLevel(10, 48)).toBe('healthy')
  })
  it('returns warning when pct >= 80% and < 100%', () => {
    expect(getSaturationLevel(40, 48)).toBe('warning')  // 83%
  })
  it('returns saturated when pct >= 100%', () => {
    expect(getSaturationLevel(48, 48)).toBe('saturated')
    expect(getSaturationLevel(50, 48)).toBe('saturated')
  })
  it('handles zero totalPorts without crashing', () => {
    expect(getSaturationLevel(0, 0)).toBe('healthy')
  })
})

describe('getSaturationBorderClass', () => {
  it('returns green border for healthy', () => {
    expect(getSaturationBorderClass(10, 48)).toContain('hsl(142')
  })
  it('returns amber border for warning', () => {
    expect(getSaturationBorderClass(40, 48)).toContain('hsl(38')
  })
  it('returns destructive border for saturated', () => {
    expect(getSaturationBorderClass(48, 48)).toContain('destructive')
  })
})
