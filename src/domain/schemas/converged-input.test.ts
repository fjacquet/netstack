/**
 * Schema validation tests for ConvergedSizingInputSchema.
 * TDD RED phase: these tests specify the input contract for converged mode.
 */

import { describe, it, expect } from 'vitest';
import { ConvergedSizingInputSchema } from './converged-input';

function makeValidInput() {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }],
    rackSize: '42U' as const,
    serverUHeight: '1U' as const,
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    activeUplinksPerLeaf: 4,
    connectivityType: '25G' as const,
    cableType: 'DAC' as const,
    leafModel: 'S5248F-ON' as const,
    spineModel: 'S5232F-ON' as const,
    borderLeafModel: 'none' as const,
    borderLeafCount: 0,
    switchPositioning: 'ToR' as const,
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720' as const,
    islPortsPerSwitch: 4,
    preferredGeneration: 'any' as const,
  };
}

describe('ConvergedSizingInputSchema', () => {
  it('accepts hbaPortsPerServer=0 (FC disabled, CONV-04)', () => {
    const result = ConvergedSizingInputSchema.parse({
      ...makeValidInput(),
      hbaPortsPerServer: 0,
    });
    expect(result.hbaPortsPerServer).toBe(0);
  });

  it('rejects portsPerServerFrontend=0 (min=1, CONV-02)', () => {
    expect(() =>
      ConvergedSizingInputSchema.parse({
        ...makeValidInput(),
        portsPerServerFrontend: 0,
      }),
    ).toThrow();
  });

  it('accepts portsPerServerFrontend=4 (max=4, CONV-02)', () => {
    const result = ConvergedSizingInputSchema.parse({
      ...makeValidInput(),
      portsPerServerFrontend: 4,
    });
    expect(result.portsPerServerFrontend).toBe(4);
  });

  it('rejects portsPerServerFrontend=5 (above max=4)', () => {
    expect(() =>
      ConvergedSizingInputSchema.parse({
        ...makeValidInput(),
        portsPerServerFrontend: 5,
      }),
    ).toThrow();
  });

  it('accepts full valid input', () => {
    const result = ConvergedSizingInputSchema.parse(makeValidInput());
    expect(result.connectivityType).toBe('25G');
    expect(result.fcSwitchModel).toBe('G720');
  });
});
