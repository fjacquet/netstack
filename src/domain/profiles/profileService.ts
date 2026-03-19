/**
 * Profile CRUD service -- pure functions backed by localStorage.
 * No React dependencies; testable in node/jsdom environment.
 *
 * CFG-01: Save/load named configuration profiles.
 * CFG-02: Persist profiles to localStorage key 'netstack-profiles'.
 * CFG-03: List all profiles sorted by date descending.
 * CFG-04: Delete profiles by id.
 *
 * All functions use try/catch for localStorage access (private browsing, quota exceeded).
 */

import type { Profile } from '../schemas/profile';
import { ProfileListSchema } from '../schemas/profile';

/** localStorage key for profile persistence */
const PROFILES_KEY = 'netstack-profiles';

/** Parameters for creating/updating a profile */
interface SaveProfileParams {
  name: string;
  mode: 'ethernet' | 'fc' | 'converged';
  topology?: 'leaf-spine' | 'three-tier';
  inputState: Record<string, unknown>;
}

/**
 * Compute total server count from inputState.racks array.
 * Returns 0 if racks is not present or not an array.
 */
function computeServerCount(inputState: Record<string, unknown>): number {
  const racks = inputState.racks;
  if (!Array.isArray(racks)) return 0;
  return racks.reduce((sum: number, rack: unknown) => {
    if (rack && typeof rack === 'object' && 'serverCount' in rack) {
      const sc = (rack as { serverCount: number }).serverCount;
      return sum + (typeof sc === 'number' ? sc : 0);
    }
    return sum;
  }, 0);
}

/**
 * Read all profiles from localStorage.
 * Returns validated array or empty array on any error.
 */
function readProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const result = ProfileListSchema.safeParse(parsed);
    if (result.success) return result.data;
    return [];
  } catch {
    return [];
  }
}

/**
 * Write profiles array to localStorage.
 * Silently ignores write errors (private browsing, quota exceeded).
 */
function writeProfiles(profiles: Profile[]): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore write errors
  }
}

/**
 * List all saved profiles, sorted by date descending (newest first).
 * Returns empty array when no profiles exist or on any error.
 */
export function listProfiles(): Profile[] {
  const profiles = readProfiles();
  return profiles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Save a new profile or update an existing one with the same name.
 * If a profile with the same name exists, it is replaced (same id is kept).
 *
 * @returns The saved Profile object.
 */
export function saveProfile(params: SaveProfileParams): Profile {
  const { name, mode, topology, inputState } = params;
  const profiles = readProfiles();

  const existingIndex = profiles.findIndex((p) => p.name === name);

  const profile: Profile = {
    id:
      existingIndex >= 0
        ? profiles[existingIndex].id
        : crypto.randomUUID(),
    name,
    mode,
    topology,
    date: new Date().toISOString(),
    version: 1,
    serverCount: computeServerCount(inputState),
    inputState,
  };

  if (existingIndex >= 0) {
    profiles[existingIndex] = profile;
  } else {
    profiles.push(profile);
  }

  writeProfiles(profiles);
  return profile;
}

/**
 * Load a specific profile by id.
 *
 * @returns The matching Profile, or null if not found.
 */
export function loadProfile(id: string): Profile | null {
  const profiles = readProfiles();
  return profiles.find((p) => p.id === id) ?? null;
}

/**
 * Delete a profile by id.
 * Silently does nothing if the id is not found.
 */
export function deleteProfile(id: string): void {
  const profiles = readProfiles();
  const filtered = profiles.filter((p) => p.id !== id);
  writeProfiles(filtered);
}
