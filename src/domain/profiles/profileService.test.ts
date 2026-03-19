// @vitest-environment jsdom
/**
 * Unit tests for profile CRUD service.
 * Tests all 7 behaviors for save, list, load, delete operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProfile,
  loadProfile,
  listProfiles,
  deleteProfile,
  normalizeEthInputState,
  normalizeFCInputState,
  normalizeConvergedInputState,
} from './profileService';
import type { Profile } from '../schemas/profile';

const PROFILES_KEY = 'netstack-profiles';

/** Realistic Ethernet inputState fixture */
const ethernetInput = {
  topology: 'leaf-spine' as const,
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  connectivityType: '25G',
  cableType: 'DAC',
  activeUplinksPerLeaf: 4,
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
  serverUHeight: '1U',
  switchPositioning: 'ToR',
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
};

/** Realistic FC inputState fixture */
const fcInput = {
  racks: [{ serverCount: 20 }, { serverCount: 20 }],
  hbaPortsPerServer: 2,
  storageTargetPorts: 8,
  storageArrayCount: 2,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
  preferredGeneration: 'gen7',
};

/** Realistic Converged inputState fixture */
const convergedInput = {
  topology: 'leaf-spine' as const,
  racks: [{ serverCount: 24 }],
  rackSize: '42U',
  serverUHeight: '1U',
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
  accessModel: 'S5248F-ON',
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  preferredGeneration: 'any',
};

describe('profileService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Test 1: saveProfile creates a profile with all required fields stored in localStorage', () => {
    const profile = saveProfile({
      name: 'DC-North 200',
      mode: 'ethernet',
      topology: 'leaf-spine',
      inputState: ethernetInput as unknown as Record<string, unknown>,
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe('DC-North 200');
    expect(profile.mode).toBe('ethernet');
    expect(profile.topology).toBe('leaf-spine');
    expect(profile.date).toBeDefined();
    expect(profile.version).toBe(1);
    expect(profile.serverCount).toBe(48); // 3 racks * 16
    expect(profile.inputState).toEqual(ethernetInput);

    // Verify stored in localStorage
    const stored = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(profile.id);
  });

  it('Test 2: listProfiles returns all saved profiles sorted by date descending', () => {
    // Save two profiles with a slight time gap
    const first = saveProfile({
      name: 'First',
      mode: 'ethernet',
      topology: 'leaf-spine',
      inputState: ethernetInput as unknown as Record<string, unknown>,
    });

    // Manually adjust date to ensure ordering
    const stored = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]');
    stored[0].date = '2025-01-01T00:00:00.000Z';
    localStorage.setItem(PROFILES_KEY, JSON.stringify(stored));

    const second = saveProfile({
      name: 'Second',
      mode: 'fc',
      inputState: fcInput as unknown as Record<string, unknown>,
    });

    const profiles = listProfiles();
    expect(profiles).toHaveLength(2);
    // Newest first
    expect(profiles[0].name).toBe('Second');
    expect(profiles[1].name).toBe('First');
  });

  it('Test 3: loadProfile(id) returns the matching profile or null if not found', () => {
    const saved = saveProfile({
      name: 'Load Test',
      mode: 'ethernet',
      topology: 'leaf-spine',
      inputState: ethernetInput as unknown as Record<string, unknown>,
    });

    const found = loadProfile(saved.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(saved.id);
    expect(found!.name).toBe('Load Test');
    expect(found!.inputState).toEqual(ethernetInput);

    const notFound = loadProfile('non-existent-id');
    expect(notFound).toBeNull();
  });

  it('Test 4: deleteProfile(id) removes the profile; listProfiles no longer includes it', () => {
    const profile = saveProfile({
      name: 'Delete Me',
      mode: 'fc',
      inputState: fcInput as unknown as Record<string, unknown>,
    });

    expect(listProfiles()).toHaveLength(1);

    deleteProfile(profile.id);

    expect(listProfiles()).toHaveLength(0);
    expect(loadProfile(profile.id)).toBeNull();
  });

  it('Test 5: saveProfile with duplicate name overwrites the existing profile', () => {
    const first = saveProfile({
      name: 'Duplicate Name',
      mode: 'ethernet',
      topology: 'leaf-spine',
      inputState: ethernetInput as unknown as Record<string, unknown>,
    });

    const second = saveProfile({
      name: 'Duplicate Name',
      mode: 'fc',
      inputState: fcInput as unknown as Record<string, unknown>,
    });

    // Should still have only 1 profile
    expect(listProfiles()).toHaveLength(1);
    // Same id is kept
    expect(second.id).toBe(first.id);
    // But content is updated
    expect(second.mode).toBe('fc');
  });

  it('Test 6: listProfiles returns empty array when no profiles exist', () => {
    const profiles = listProfiles();
    expect(profiles).toEqual([]);
  });

  it('Test 7: Profile inputState captures correct type for each mode', () => {
    const ethProfile = saveProfile({
      name: 'Ethernet Config',
      mode: 'ethernet',
      topology: 'leaf-spine',
      inputState: ethernetInput as unknown as Record<string, unknown>,
    });
    expect(ethProfile.mode).toBe('ethernet');
    expect(ethProfile.inputState).toHaveProperty('leafModel');
    expect(ethProfile.inputState).toHaveProperty('spineModel');

    const fcProfile = saveProfile({
      name: 'FC Config',
      mode: 'fc',
      inputState: fcInput as unknown as Record<string, unknown>,
    });
    expect(fcProfile.mode).toBe('fc');
    expect(fcProfile.inputState).toHaveProperty('fcSwitchModel');
    expect(fcProfile.inputState).toHaveProperty('hbaPortsPerServer');

    const convProfile = saveProfile({
      name: 'Converged Config',
      mode: 'converged',
      inputState: convergedInput as unknown as Record<string, unknown>,
    });
    expect(convProfile.mode).toBe('converged');
    expect(convProfile.inputState).toHaveProperty('leafModel');
    expect(convProfile.inputState).toHaveProperty('fcSwitchModel');
  });
});

describe('normalizeEthInputState — fills missing fields with defaults', () => {
  it('adds geometry fields when missing from old profile', () => {
    const oldProfile = {
      topology: 'leaf-spine',
      racks: [{ serverCount: 10 }],
      connectivityType: '25G',
      cableType: 'DAC',
    };
    const result = normalizeEthInputState(oldProfile);
    expect(result.rackPitchMm).toBe(600);
    expect(result.racksAdjacent).toBe(true);
    expect(result.patchPanelDistanceM).toBe(1);
  });

  it('preserves existing geometry fields from v9 profile', () => {
    const v9Profile = {
      topology: 'leaf-spine',
      racks: [{ serverCount: 10 }],
      rackPitchMm: 800,
      racksAdjacent: false,
      patchPanelDistanceM: 5,
    };
    const result = normalizeEthInputState(v9Profile);
    expect(result.rackPitchMm).toBe(800);
    expect(result.racksAdjacent).toBe(false);
    expect(result.patchPanelDistanceM).toBe(5);
  });

  it('fills all defaults for empty object', () => {
    const result = normalizeEthInputState({});
    expect(result.topology).toBe('leaf-spine');
    expect(result.rackPitchMm).toBe(600);
  });

  it('does not mutate the input object', () => {
    const input = { topology: 'leaf-spine' };
    const frozen = { ...input };
    normalizeEthInputState(input);
    expect(input).toEqual(frozen);
  });
});

describe('normalizeConvergedInputState — fills missing fields', () => {
  it('adds geometry fields when missing', () => {
    const old = { racks: [{ serverCount: 10 }] };
    const result = normalizeConvergedInputState(old);
    expect(result.rackPitchMm).toBe(600);
    expect(result.racksAdjacent).toBe(true);
  });
});

describe('normalizeFCInputState — pass-through', () => {
  it('returns object with FC defaults filled', () => {
    const old = { hbaPortsPerServer: 2 };
    const result = normalizeFCInputState(old);
    expect(result.hbaPortsPerServer).toBe(2);
  });
});
