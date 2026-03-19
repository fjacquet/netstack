import { describe, it, expect } from 'vitest';
import { calculateConvergedBOM } from './converged-sizing';
import { ConvergedSizingInputSchema } from '../schemas/converged-input';
import type { ConvergedSizingInput } from '../schemas/converged-input';

function makeConvergedInput(overrides: Partial<ConvergedSizingInput> = {}): ConvergedSizingInput {
  return {
    topology: 'leaf-spine' as const,
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    rackSize: '42U',
    serverUHeight: '1U',
    // Ethernet fields
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
    // Brownfield toggles
    existingSpinesDeployed: false,
    existingCoreDeployed: false,
    // 3-tier fields (defaults, ignored when topology='leaf-spine')
    accessModel: 'S5248F-ON',
    aggregationModel: 'Z9264F-ON',
    activeUplinksPerAggregation: 4,
    coreModel: 'Z9332F-ON',
    // FC fields (default: FC enabled)
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 4,
    preferredGeneration: 'any',
    ...overrides,
  };
}

// CONV-03: Converged engine calls both engines and returns combined BOM
describe('CONV-03: Combined BOM', () => {
  it('returns ethernetBom with correct leaf/spine counts', () => {
    const result = calculateConvergedBOM(makeConvergedInput());
    expect(result.ethernetBom).not.toBeNull();
    expect(result.ethernetBom!.leafSwitches).toBe(6); // 3 racks * 2
    expect(result.ethernetBom!.spineSwitches).toBeGreaterThanOrEqual(2);
  });

  it('returns fcBom with fabric switches when hbaPortsPerServer > 0', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 2 }));
    expect(result.fcBom).not.toBeNull();
    expect(result.fcBom!.fabricASwitches).toBeGreaterThan(0);
    expect(result.fcBom!.fabricBSwitches).toBeGreaterThan(0);
  });

  it('ethernetBom.input matches the Ethernet portion of converged input', () => {
    const result = calculateConvergedBOM(makeConvergedInput());
    expect(result.ethernetBom!.input.racks).toEqual(result.input.racks);
    expect(result.ethernetBom!.input.leafModel).toBe('S5248F-ON');
  });

  it('fcBom.input matches the FC portion of converged input', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 2 }));
    expect(result.fcBom).not.toBeNull();
    expect(result.fcBom!.input.racks).toEqual(result.input.racks);
    expect(result.fcBom!.input.hbaPortsPerServer).toBe(2);
  });

  it('input is echoed back in result', () => {
    const input = makeConvergedInput();
    const result = calculateConvergedBOM(input);
    expect(result.input).toEqual(input);
  });
});

// CONV-04: FC portion optional
describe('CONV-04: FC optional (hbaPortsPerServer=0)', () => {
  it('fcBom is null when hbaPortsPerServer is 0', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 0 }));
    expect(result.fcBom).toBeNull();
  });

  it('ethernetBom is still computed when hbaPortsPerServer is 0', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 0 }));
    expect(result.ethernetBom).not.toBeNull();
    expect(result.ethernetBom!.leafSwitches).toBeGreaterThan(0);
  });

  it('no FC violations when hbaPortsPerServer is 0', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 0 }));
    const fcViolationCodes = ['FC_PORT_SATURATION', 'FC_OVERSUBSCRIPTION_EXCEEDED', 'FC_ISL_UNDERPROVISIONED'];
    const hasFcViolation = result.violations.some(v => fcViolationCodes.includes(v.code));
    expect(hasFcViolation).toBe(false);
  });
});

// CONV-05: Combined violations
describe('CONV-05: Combined violations', () => {
  it('violations array contains Ethernet violations', () => {
    // DAC + >8 racks triggers DAC_DISTANCE_ADVISORY
    const result = calculateConvergedBOM(makeConvergedInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'DAC',
      hbaPortsPerServer: 0,
    }));
    const dacAdvisory = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(dacAdvisory).toBeDefined();
  });

  it('violations array contains FC violations when FC is enabled', () => {
    // Many servers + few storage ports triggers FC_OVERSUBSCRIPTION_EXCEEDED
    const result = calculateConvergedBOM(makeConvergedInput({
      racks: [{ serverCount: 100 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'X7-4', // director -- large capacity
    }));
    const fcOversubViolation = result.violations.find(v => v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED');
    expect(fcOversubViolation).toBeDefined();
  });

  it('violations array combines both Ethernet and FC violations', () => {
    // DAC + many racks + few storage ports
    const result = calculateConvergedBOM(makeConvergedInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'DAC',
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'X7-4',
    }));
    const ethViolationCodes = ['OOB_PORT_SATURATION', 'SPINE_CAPACITY_EXCEEDED', 'DAC_DISTANCE_ADVISORY', 'RACK_CAPACITY_EXCEEDED'];
    const fcViolationCodes = ['FC_PORT_SATURATION', 'FC_OVERSUBSCRIPTION_EXCEEDED', 'FC_ISL_UNDERPROVISIONED'];
    const hasEth = result.violations.some(v => ethViolationCodes.includes(v.code));
    const hasFc = result.violations.some(v => fcViolationCodes.includes(v.code));
    expect(hasEth).toBe(true);
    expect(hasFc).toBe(true);
  });

  it('violations is always an array (never undefined)', () => {
    const result = calculateConvergedBOM(makeConvergedInput());
    expect(Array.isArray(result.violations)).toBe(true);
  });
});

// CONV-02: Input ranges
describe('CONV-02: Converged input ranges', () => {
  it('accepts portsPerServerFrontend=4', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ portsPerServerFrontend: 4 }));
    expect(result.ethernetBom).toBeDefined();
  });

  it('accepts hbaPortsPerServer=0 (FC disabled)', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 0 }));
    expect(result.fcBom).toBeNull();
  });

  it('accepts hbaPortsPerServer=2 (standard dual-fabric)', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ hbaPortsPerServer: 2 }));
    expect(result.fcBom).not.toBeNull();
  });
});

// TENG-01: Topology selector
describe('TENG-01: Topology selector', () => {
  // Test 1: topology='leaf-spine' (default) -> ethernetBom populated, threeTierBom null
  it('topology=leaf-spine -> ethernetBom populated, threeTierBom null', () => {
    const result = calculateConvergedBOM(makeConvergedInput({ topology: 'leaf-spine' }));
    expect(result.ethernetBom).not.toBeNull();
    expect(result.threeTierBom).toBeNull();
    expect(result.topology).toBe('leaf-spine');
  });

  // Test 2: topology='three-tier' -> threeTierBom populated, ethernetBom null
  it('topology=three-tier -> threeTierBom populated, ethernetBom null', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'three-tier',
      hbaPortsPerServer: 0,
    }));
    expect(result.threeTierBom).not.toBeNull();
    expect(result.ethernetBom).toBeNull();
    expect(result.topology).toBe('three-tier');
  });

  // Test 3: topology='three-tier' + hbaPortsPerServer > 0 -> both threeTierBom and fcBom populated
  it('topology=three-tier + FC enabled -> both threeTierBom and fcBom populated', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'three-tier',
      hbaPortsPerServer: 2,
    }));
    expect(result.threeTierBom).not.toBeNull();
    expect(result.fcBom).not.toBeNull();
    expect(result.ethernetBom).toBeNull();
  });

  // Test 4: topology='three-tier' + hbaPortsPerServer=0 -> threeTierBom populated, fcBom null
  it('topology=three-tier + FC disabled -> threeTierBom populated, fcBom null', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'three-tier',
      hbaPortsPerServer: 0,
    }));
    expect(result.threeTierBom).not.toBeNull();
    expect(result.fcBom).toBeNull();
  });

  // Test 5: topology defaults to 'leaf-spine' when omitted (backward compatibility)
  it('topology defaults to leaf-spine when not specified', () => {
    const input = makeConvergedInput();
    // topology is explicitly 'leaf-spine' in our helper; test the schema default
    const parsed = ConvergedSizingInputSchema.parse({
      ...input,
      topology: undefined,
    });
    expect(parsed.topology).toBe('leaf-spine');
  });

  // Test 6: topology='leaf-spine' violations contain only Ethernet+FC violations
  it('leaf-spine violations contain no 3-tier violations', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'leaf-spine',
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'DAC',
      hbaPortsPerServer: 0,
    }));
    const threeTierCodes = ['AGGREGATION_CAPACITY_EXCEEDED', 'CORE_CAPACITY_EXCEEDED'];
    const has3Tier = result.violations.some(v => threeTierCodes.includes(v.code));
    expect(has3Tier).toBe(false);
  });

  // Test 7: topology='three-tier' violations contain no Clos-specific violations
  it('three-tier violations contain no Clos-specific violations', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'three-tier',
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'DAC',
      hbaPortsPerServer: 0,
    }));
    const closCodes = ['SPINE_CAPACITY_EXCEEDED'];
    const hasClos = result.violations.some(v => closCodes.includes(v.code));
    expect(hasClos).toBe(false);
  });

  // Test: threeTierBom has access switches = 2 * racks when three-tier
  it('three-tier BOM has correct access switch count', () => {
    const result = calculateConvergedBOM(makeConvergedInput({
      topology: 'three-tier',
      hbaPortsPerServer: 0,
    }));
    expect(result.threeTierBom).not.toBeNull();
    expect(result.threeTierBom!.accessSwitches).toBe(6); // 3 racks * 2
  });
});

// Schema validation tests
describe('ConvergedSizingInputSchema validation', () => {
  it('parses valid input with hbaPortsPerServer=0 (min=0)', () => {
    const input = makeConvergedInput({ hbaPortsPerServer: 0 });
    const result = ConvergedSizingInputSchema.parse(input);
    expect(result.hbaPortsPerServer).toBe(0);
  });

  it('rejects portsPerServerFrontend=0 (min=1)', () => {
    const input = makeConvergedInput({ portsPerServerFrontend: 0 as never });
    expect(() => ConvergedSizingInputSchema.parse(input)).toThrow();
  });

  it('accepts portsPerServerFrontend=4 (max=4)', () => {
    const input = makeConvergedInput({ portsPerServerFrontend: 4 });
    const result = ConvergedSizingInputSchema.parse(input);
    expect(result.portsPerServerFrontend).toBe(4);
  });

  it('rejects portsPerServerFrontend=5 (above max=4)', () => {
    const input = makeConvergedInput({ portsPerServerFrontend: 5 as never });
    expect(() => ConvergedSizingInputSchema.parse(input)).toThrow();
  });
});
