import { describe, it, expect } from 'vitest';
import { FC_SWITCH_CATALOG, FC_OPTICS_CATALOG } from './brocade';

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — catalog shape
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — catalog shape', () => {
  it('contains exactly 9 models', () => {
    expect(Object.keys(FC_SWITCH_CATALOG)).toHaveLength(9);
  });

  it('contains all expected model keys', () => {
    const keys = Object.keys(FC_SWITCH_CATALOG);
    expect(keys).toContain('G710');
    expect(keys).toContain('G720');
    expect(keys).toContain('G730');
    expect(keys).toContain('X7-4');
    expect(keys).toContain('X7-8');
    expect(keys).toContain('7850');
    expect(keys).toContain('G820');
    expect(keys).toContain('X8-4');
    expect(keys).toContain('X8-8');
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — G710 (Gen7, 64G, fixed, edge)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — G710', () => {
  it('has correct port counts and POD licensing', () => {
    expect(FC_SWITCH_CATALOG['G710'].totalPorts).toBe(24);
    expect(FC_SWITCH_CATALOG['G710'].basePorts).toBe(8);
    expect(FC_SWITCH_CATALOG['G710'].podLicenseUnit).toBe(8);
  });

  it('has correct generation, speed, and role', () => {
    expect(FC_SWITCH_CATALOG['G710'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['G710'].speedGbps).toBe(64);
    expect(FC_SWITCH_CATALOG['G710'].role).toBe('edge');
    expect(FC_SWITCH_CATALOG['G710'].formFactor).toBe('fixed');
  });

  it('has correct physical specs', () => {
    expect(FC_SWITCH_CATALOG['G710'].uHeight).toBe(1);
    expect(FC_SWITCH_CATALOG['G710'].maxPowerW).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — G720 (Gen7, 64G, fixed, edge)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — G720', () => {
  it('has correct port counts and POD licensing', () => {
    expect(FC_SWITCH_CATALOG['G720'].totalPorts).toBe(64);
    expect(FC_SWITCH_CATALOG['G720'].basePorts).toBe(24);
    expect(FC_SWITCH_CATALOG['G720'].podLicenseUnit).toBe(8);
  });

  it('has basePorts < totalPorts (POD model assertion)', () => {
    expect(FC_SWITCH_CATALOG['G720'].basePorts).toBeLessThan(FC_SWITCH_CATALOG['G720'].totalPorts);
  });

  it('has correct generation, speed, and role', () => {
    expect(FC_SWITCH_CATALOG['G720'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['G720'].speedGbps).toBe(64);
    expect(FC_SWITCH_CATALOG['G720'].role).toBe('edge');
    expect(FC_SWITCH_CATALOG['G720'].formFactor).toBe('fixed');
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — G730 (Gen7, 64G, fixed, edge, 2U)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — G730', () => {
  it('has correct port counts', () => {
    expect(FC_SWITCH_CATALOG['G730'].totalPorts).toBe(128);
    expect(FC_SWITCH_CATALOG['G730'].basePorts).toBe(48);
  });

  it('has correct generation, speed, and physical specs', () => {
    expect(FC_SWITCH_CATALOG['G730'].speedGbps).toBe(64);
    expect(FC_SWITCH_CATALOG['G730'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['G730'].role).toBe('edge');
    expect(FC_SWITCH_CATALOG['G730'].formFactor).toBe('fixed');
    expect(FC_SWITCH_CATALOG['G730'].uHeight).toBe(2);
    expect(FC_SWITCH_CATALOG['G730'].maxPowerW).toBe(1100);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — X7-4 (Gen7, director, 4-slot)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — X7-4', () => {
  it('has correct port counts and no POD licensing', () => {
    expect(FC_SWITCH_CATALOG['X7-4'].totalPorts).toBe(256);
    expect(FC_SWITCH_CATALOG['X7-4'].basePorts).toBe(256);
    expect(FC_SWITCH_CATALOG['X7-4'].podLicenseUnit).toBe(0);
  });

  it('has correct generation and director form factor', () => {
    expect(FC_SWITCH_CATALOG['X7-4'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['X7-4'].role).toBe('director');
    expect(FC_SWITCH_CATALOG['X7-4'].formFactor).toBe('director');
  });

  it('has correct blade configuration', () => {
    expect(FC_SWITCH_CATALOG['X7-4'].bladeSlotsCount).toBe(4);
    expect(FC_SWITCH_CATALOG['X7-4'].portsPerBlade).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — X7-8 (Gen7, director, 8-slot)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — X7-8', () => {
  it('has correct port counts and no POD licensing', () => {
    expect(FC_SWITCH_CATALOG['X7-8'].totalPorts).toBe(512);
    expect(FC_SWITCH_CATALOG['X7-8'].basePorts).toBe(512);
    expect(FC_SWITCH_CATALOG['X7-8'].podLicenseUnit).toBe(0);
  });

  it('has correct generation and director form factor', () => {
    expect(FC_SWITCH_CATALOG['X7-8'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['X7-8'].role).toBe('director');
    expect(FC_SWITCH_CATALOG['X7-8'].formFactor).toBe('director');
    expect(FC_SWITCH_CATALOG['X7-8'].bladeSlotsCount).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — 7850 (Gen7, extension gateway)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — 7850', () => {
  it('has correct port counts (no POD licensing)', () => {
    expect(FC_SWITCH_CATALOG['7850'].totalPorts).toBe(24);
    expect(FC_SWITCH_CATALOG['7850'].basePorts).toBe(24);
    expect(FC_SWITCH_CATALOG['7850'].podLicenseUnit).toBe(0);
  });

  it('has extension role and correct ISL ports', () => {
    expect(FC_SWITCH_CATALOG['7850'].role).toBe('extension');
    expect(FC_SWITCH_CATALOG['7850'].formFactor).toBe('fixed');
    expect(FC_SWITCH_CATALOG['7850'].maxIslPorts).toBe(18);
  });

  it('has correct generation, speed, and form factor', () => {
    expect(FC_SWITCH_CATALOG['7850'].generation).toBe(7);
    expect(FC_SWITCH_CATALOG['7850'].speedGbps).toBe(64);
    expect(FC_SWITCH_CATALOG['7850'].uHeight).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — G820 (Gen8, 128G, fixed, edge)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — G820', () => {
  it('has correct port counts and POD licensing', () => {
    expect(FC_SWITCH_CATALOG['G820'].totalPorts).toBe(56);
    expect(FC_SWITCH_CATALOG['G820'].basePorts).toBe(24);
    expect(FC_SWITCH_CATALOG['G820'].podLicenseUnit).toBe(8);
  });

  it('has correct generation 8 and 128G speed', () => {
    expect(FC_SWITCH_CATALOG['G820'].generation).toBe(8);
    expect(FC_SWITCH_CATALOG['G820'].speedGbps).toBe(128);
    expect(FC_SWITCH_CATALOG['G820'].role).toBe('edge');
    expect(FC_SWITCH_CATALOG['G820'].formFactor).toBe('fixed');
  });

  it('has correct physical specs', () => {
    expect(FC_SWITCH_CATALOG['G820'].uHeight).toBe(1);
    expect(FC_SWITCH_CATALOG['G820'].maxPowerW).toBe(650);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — X8-4 (Gen8, director, 4-slot)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — X8-4', () => {
  it('has correct port counts and no POD licensing', () => {
    expect(FC_SWITCH_CATALOG['X8-4'].totalPorts).toBe(192);
    expect(FC_SWITCH_CATALOG['X8-4'].basePorts).toBe(192);
    expect(FC_SWITCH_CATALOG['X8-4'].podLicenseUnit).toBe(0);
  });

  it('has correct generation 8 and director form factor', () => {
    expect(FC_SWITCH_CATALOG['X8-4'].generation).toBe(8);
    expect(FC_SWITCH_CATALOG['X8-4'].role).toBe('director');
    expect(FC_SWITCH_CATALOG['X8-4'].formFactor).toBe('director');
  });

  it('has correct blade configuration', () => {
    expect(FC_SWITCH_CATALOG['X8-4'].bladeSlotsCount).toBe(4);
    expect(FC_SWITCH_CATALOG['X8-4'].portsPerBlade).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — X8-8 (Gen8, director, 8-slot)
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — X8-8', () => {
  it('has correct port counts and no POD licensing', () => {
    expect(FC_SWITCH_CATALOG['X8-8'].totalPorts).toBe(384);
    expect(FC_SWITCH_CATALOG['X8-8'].basePorts).toBe(384);
    expect(FC_SWITCH_CATALOG['X8-8'].podLicenseUnit).toBe(0);
  });

  it('has correct generation 8 and director form factor', () => {
    expect(FC_SWITCH_CATALOG['X8-8'].generation).toBe(8);
    expect(FC_SWITCH_CATALOG['X8-8'].role).toBe('director');
    expect(FC_SWITCH_CATALOG['X8-8'].formFactor).toBe('director');
  });

  it('has correct blade configuration', () => {
    expect(FC_SWITCH_CATALOG['X8-8'].bladeSlotsCount).toBe(8);
    expect(FC_SWITCH_CATALOG['X8-8'].portsPerBlade).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// FC_SWITCH_CATALOG — cross-model invariants
// ---------------------------------------------------------------------------

describe('FC_SWITCH_CATALOG — POD licensing invariants', () => {
  it('every fixed-port switch has basePorts < totalPorts', () => {
    const fixedSwitches = Object.values(FC_SWITCH_CATALOG).filter(
      (s) => s.formFactor === 'fixed' && s.role !== 'extension',
    );
    for (const sw of fixedSwitches) {
      expect(sw.basePorts).toBeLessThan(sw.totalPorts);
    }
  });

  it('every fixed-port switch has podLicenseUnit > 0', () => {
    const fixedSwitches = Object.values(FC_SWITCH_CATALOG).filter(
      (s) => s.formFactor === 'fixed' && s.role !== 'extension',
    );
    for (const sw of fixedSwitches) {
      expect(sw.podLicenseUnit).toBeGreaterThan(0);
    }
  });

  it('every director switch has podLicenseUnit === 0', () => {
    const directors = Object.values(FC_SWITCH_CATALOG).filter(
      (s) => s.formFactor === 'director',
    );
    for (const sw of directors) {
      expect(sw.podLicenseUnit).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// FC_OPTICS_CATALOG — catalog shape
// ---------------------------------------------------------------------------

describe('FC_OPTICS_CATALOG — catalog shape', () => {
  it('contains exactly 3 entries', () => {
    expect(Object.keys(FC_OPTICS_CATALOG)).toHaveLength(3);
  });

  it('all entries have protocol === fibre-channel', () => {
    for (const optic of Object.values(FC_OPTICS_CATALOG)) {
      expect(optic.protocol).toBe('fibre-channel');
    }
  });
});

describe('FC_OPTICS_CATALOG — FC-32G-SW-SFP28', () => {
  it('has correct speed and form factor', () => {
    expect(FC_OPTICS_CATALOG['FC-32G-SW-SFP28'].speedGbps).toBe(32);
    expect(FC_OPTICS_CATALOG['FC-32G-SW-SFP28'].formFactor).toBe('SFP28');
  });
});

describe('FC_OPTICS_CATALOG — FC-64G-SW-SFP+', () => {
  it('has correct speed and form factor', () => {
    expect(FC_OPTICS_CATALOG['FC-64G-SW-SFP+'].speedGbps).toBe(64);
    expect(FC_OPTICS_CATALOG['FC-64G-SW-SFP+'].formFactor).toBe('SFP+');
  });
});

describe('FC_OPTICS_CATALOG — FC-128G-SW-SFP+', () => {
  it('has correct speed and form factor', () => {
    expect(FC_OPTICS_CATALOG['FC-128G-SW-SFP+'].speedGbps).toBe(128);
    expect(FC_OPTICS_CATALOG['FC-128G-SW-SFP+'].formFactor).toBe('SFP+');
  });
});
