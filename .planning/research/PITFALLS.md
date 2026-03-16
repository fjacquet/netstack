# Pitfalls Research

**Domain:** Network Sizing Calculator / Infrastructure BOM Tool (Dell Leaf-Spine + SONiC)
**Researched:** 2026-03-16
**Confidence:** HIGH (networking fundamentals verified against official Dell docs and Juniper white papers; frontend patterns verified against official library docs and community post-mortems)

---

## Critical Pitfalls

### Pitfall 1: Spine Count Hardcoded to 2 Instead of Scaling with Leaf Count

**What goes wrong:**
The most natural naive implementation uses a fixed 2-spine topology regardless of leaf count. This breaks at moderate scale: a S5232F-ON spine has 32x 100GbE ports, each leaf takes one port per spine. At 33+ leafs (66+ leaf switches), you exhaust a 2-spine pod entirely. The tool silently produces an incomplete BOM or an invalid topology.

**Why it happens:**
The phrase "redundant pair" is used correctly for leaf ToR switches (2 leafs per rack) and gets incorrectly applied to spines by analogy. Two spines provide path redundancy but not port capacity — these are orthogonal concerns. Engineers new to Clos fabric design conflate HA with capacity.

**How to avoid:**
Compute required spine count from a formula, not a constant:
- Uplinks per leaf = 4 (S5248F-ON has 4x 100GbE QSFP28 uplink ports)
- Minimum spines for non-blocking = 4 (one uplink to each spine)
- Maximum leafs per pod = spine_port_count / 1 per leaf connection
- For S5232F-ON spine (32 ports): max 32 leafs, so max 16 racks in a single pod (32 leafs / 2 per rack)
- Beyond 16 racks: alert user that a multi-pod or super-spine tier is required (out of scope for v1 but must error cleanly rather than silently)

The sizing engine MUST validate that `N_leafs <= spine_port_count` and surface a constraint violation if exceeded.

**Warning signs:**
- Engine returns a valid BOM for 40+ racks without flagging any capacity constraint
- Spine count is a hardcoded constant (`const SPINE_COUNT = 2`) anywhere in the codebase
- Tests only cover 1-10 rack scenarios

**Phase to address:** Phase 1 (Core Sizing Engine) — encode spine port capacity as a constraint validator at engine initialization, not as a UI afterthought.

---

### Pitfall 2: Oversubscription Ratio Never Surfaced to the User

**What goes wrong:**
The BOM engine produces physically correct port counts but never calculates or displays the actual oversubscription ratio. The tool becomes a port counter rather than a design validator. Engineers order hardware, deploy it, and discover the network is 6:1 oversubscribed for their workload — a problem invisible at purchase time.

**Why it happens:**
Oversubscription math is a derived calculation, not a primary input. Tool builders focus on "how many switches" and forget that the ratio between server-facing bandwidth and spine-facing bandwidth is the primary design quality metric.

**How to avoid:**
Compute and display oversubscription ratio as a first-class output:
```
oversubscription_ratio = (server_ports × server_speed) / (uplink_ports × uplink_speed)
```
For S5248F-ON: 48 × 25GbE = 1200Gbps downlink; 4 × 100GbE = 400Gbps uplink; ratio = 3:1.

Display this prominently in the BOM summary. Apply tiered warnings: green for ≤3:1, amber for 3:1-6:1, red for >6:1 (industry standard thresholds from Dell EMC L3 Leaf-Spine design guide).

**Warning signs:**
- BOM output has no "bandwidth efficiency" or "oversubscription" field
- No amber/red styling on any output metric
- Design review asks "what's the oversubscription?" and the tool has no answer

**Phase to address:** Phase 1 (Core Sizing Engine) — add `oversubscriptionRatio` as a required field on the `NetworkBillOfMaterial` type from day one.

---

### Pitfall 3: Cable Quantity Calculation Ignores That Each Cable Connects Two Endpoints (Off-by-Factor-of-2 for Bidirectional Links)

**What goes wrong:**
A leaf-to-spine connection is one cable, but a naive implementation might count "leaf uplink ports" AND "spine downlink ports" separately and sum them — producing double the actual cable count. Conversely, for inter-switch links, forgetting that a DAC/AOC cable occupies a port on BOTH ends leads to port budget errors.

**Why it happens:**
Ports and cables are fundamentally different units. Ports are per-device resources; cables are per-link resources. Code that iterates over `total_uplink_ports` to count cables is off by the topology structure. The cable count for leaf-to-spine links = `N_leafs × uplinks_per_leaf` — NOT `(N_leafs × uplinks_per_leaf) + (N_spines × N_leafs)`.

**How to avoid:**
Model cables as directed links (source port, destination port, cable type). The BOM cable count = number of unique links, not sum of endpoint ports. Write a test:
```typescript
// 2 leafs, 4 spines: each leaf has 4 uplinks → 8 cables total
expect(sizingEngine({ racks: 1 }).leafSpineCables).toBe(8); // 2 leafs × 4 spines
```

For OOB: each server/switch has one management port → 1 cable per managed device. Do not double-count the S3248T's own downlink port.

**Warning signs:**
- BOM cable count is exactly double or half of expected value
- No unit test that verifies cable count against a hand-calculated topology
- "Cables" field derived by summing port counts rather than link counts

**Phase to address:** Phase 1 (Core Sizing Engine) — establish link-based cable modeling before any port-count shortcuts are introduced.

---

### Pitfall 4: OOB Port Saturation Not Validated at Engine Level

**What goes wrong:**
The S3248T-ON has 48x 1GbE ports. In a large rack, each rack needs management connectivity for: servers (up to ~48 per rack), the 2 leaf switches, and the OOB switch itself. If `servers_per_rack = 48`, that is 48 server mgmt ports + 2 leaf mgmt ports = 50 management connections — exceeding the 48-port limit before the OOB switch is even counted. The tool silently produces an invalid BOM.

**Why it happens:**
OOB port saturation is a secondary constraint developers address last, after the data plane logic is working. The S3248T port limit is treated as a static cap rather than a validated constraint at compute time.

**How to avoid:**
The project spec already calls for saturation alerts (">48"). Implement this as a named Zod constraint violation, not a UI-level string check:
```typescript
const oobPortsRequired = servers_per_rack + 2; // +2 for ToR leaf pair
if (oobPortsRequired > OOB_SWITCH.downlinkPorts) {
  violations.push({ code: 'OOB_PORT_SATURATION', required: oobPortsRequired, available: OOB_SWITCH.downlinkPorts });
}
```
The alert must block or at minimum flag the BOM as infeasible. Surface this in the UI with a specific message, not just a generic "invalid configuration."

**Warning signs:**
- OOB alert only appears for unrealistic configurations (>100 servers/rack)
- `servers_per_rack = 48` produces no warning despite 50 management ports needed
- OOB alert is a UI-layer string, not a typed violation from the engine

**Phase to address:** Phase 1 (Core Sizing Engine) + Phase 2 (Form & Validation) — engine emits typed violations; UI renders them.

---

### Pitfall 5: Cable Type Distance Constraints Not Enforced

**What goes wrong:**
DAC cables have hard distance limits: 25GbE DAC ≤ 3m, 100GbE DAC ≤ 5m. If a user selects DAC for a large pod where leaf-to-spine distances exceed 5m, the tool generates a BOM with physically unworkable cables. Engineers order DAC, discover cables don't reach spines in a mid-row spine placement, and must reorder AOC at project delay cost.

**Why it happens:**
The tool captures cable type as a user selection but treats it as a pure label. Distance constraints are not modeled. The tool authors assume the engineer knows the distance rules — which is precisely what a sizing tool should not assume.

**How to avoid:**
Store distance constraints in the hardware catalog alongside each cable type. When the user selects DAC with a rack count that implies a large physical footprint, warn that DAC is only valid for same-rack or adjacent-rack topologies. For spine switches in a central row (not ToR), flag DAC as likely infeasible and recommend AOC or fiber.

At minimum: display cable type constraints in the BOM sidebar. Do not silently emit a DAC BOM for a 20-rack pod without a distance caveat.

**Warning signs:**
- Hardware catalog has cable types with no distance_limit_m field
- BOM exports DAC cables for spine switches without any distance note
- No test for "user selects DAC, tool warns about topology suitability"

**Phase to address:** Phase 1 (Hardware Catalog) — add `max_distance_m` to cable type constants. Phase 2 (Validation) — add distance advisory to Zod checks.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode S5248F/S5232F/S3248T port counts as magic numbers | Faster initial coding | Adding new Dell switch models requires code changes throughout | Never — centralize in hardware catalog constants from day 1 |
| Derive cable count from port sum rather than link model | Simpler loop logic | Off-by-factor-of-2 bugs, impossible to extend for multi-hop topologies | Never — model links explicitly |
| Skip oversubscription calculation in MVP | Faster to ship | Tool becomes port counter, not design validator; engineers make bad purchases | Never — add to core BOM type from day 1 |
| Use `any` type for switch specs in TypeScript | Removes initial typing friction | TypeScript stops catching hardware model mismatches | Never — project constitution forbids it |
| Serialize entire Zustand store directly to localStorage | Simple one-liner | Schema migration becomes impossible, stale configs cause silent corruption | Only if storage is marked as version 0 and is wiped on schema change |
| Generate PDF by screenshotting the React DOM via html2canvas | Works for demos | Font rendering differences, hidden overflow clips content, fails on large BOMs | Acceptable for MVP only; replace before release |
| Store topology layout (node x/y positions) inside the sizing state | Convenient co-location | Mixing domain logic with presentation state; sizing engine tests become coupled to layout | Never — separate domain state from visualization state |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Zustand persist middleware | Assume rehydrated state is always valid schema | Wrap in Zod parse on hydration; on failure, wipe and start fresh with a versioned migration path |
| Zustand v5 selectors | Return new object/array reference from selector (`state => ({ a: state.a, b: state.b })`) | Use `useShallow` from `zustand/shallow` or select primitive values; object selectors cause infinite render loops |
| @react-pdf/renderer | Use React DOM components inside PDF layout | PDF renderer uses its own component tree — `<View>`, `<Text>`, `<Page>` — not `<div>`, `<p>`, `<table>` |
| @react-pdf/renderer | Import PDF generation code in main bundle | Always lazy-load with `React.lazy` / dynamic import; the library is large and blocks initial render |
| React Flow (ReactFlow) | Subscribe to nodes/edges directly in component body | Subscribe to specific node fields with selectors; direct node array subscription re-renders on every drag/pan |
| React Flow layout | Let React Flow auto-layout a leaf-spine topology | Auto-layout produces random positions; compute deterministic positions from topology math (spines top row, leafs middle row, racks bottom row) |
| Zod on form inputs | Apply `.parse()` in onChange handler | Use `.safeParse()` in onChange; reserve `.parse()` for final submission; catching thrown errors on every keystroke is wasteful |
| Zod number ranges | Use `z.number()` without min/max for port counts | Use `z.number().int().min(1).max(MAX_PORTS)` — open-ended numbers will accept `Infinity`, negative values, non-integers from number inputs |
| localStorage JSON | Use `JSON.parse()` without try-catch | Always wrap in try-catch; malformed JSON (tab corruption, partial write) throws synchronously and crashes the app |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| React Flow re-renders on every Zustand state change | Topology diagram flickers or is unresponsive; Chrome profiler shows thousands of renders/sec | Store topology node positions in a separate Zustand slice from sizing inputs; use React.memo on custom node components | More than ~50 nodes (20 racks = ~42+ switches) |
| Generating PDF synchronously on main thread | UI freezes 1-3 seconds when export is clicked; React appears unresponsive | Lazy-load @react-pdf/renderer; consider a web worker for PDF generation | Any PDF over ~5 pages |
| Zod validation running on every keypress for complex schemas | Input lag on slow devices; validation debounce becomes necessary | Use `z.safeParse()` with 150ms debounce on `onChange`; run full parse only on blur/submit | Complex schemas with >10 fields and cross-field refinements |
| SVG topology diagram with hundreds of edges drawn individually | Diagram pans/zooms with visible lag | Batch edge rendering; use CSS class transitions instead of inline style animations per edge | >200 edges (~50 racks with full mesh uplinks) |
| localStorage read on every render | Noticeable lag on slow HDDs / private browsing mode | Read once at app init via Zustand persist middleware hydration; never call `localStorage.getItem` in render paths | Slow storage (HDD, quota-throttled browser) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Show BOM numbers with no context about what they mean | Engineers mis-order cables because "48 cables" is ambiguous without "leaf-to-spine 100GbE DAC" | Group BOM by category (Switches / Cables / Transceivers) with human-readable labels |
| No distinction between "0 results" and "invalid configuration" | Engineer can't tell if 0 spines means the tool didn't calculate yet or their input is wrong | Separate "not yet computed" (empty state) from "constraint violated" (error state with specific message) |
| Oversubscription ratio shown as a decimal (0.333) | Engineers think in ratios (3:1), not decimals | Format as "3:1", not "3.0" or "0.33" |
| Cable count in BOM doesn't specify length | Engineers order wrong-length DAC cables; no length guidance | BOM cable rows include a "recommended length" or at minimum a note "length selection required" |
| Form allows `servers_per_rack = 0` | Sizing engine divides by zero or returns NaN silently | Zod min(1) on servers_per_rack; UI shows immediate inline error before submission |
| Rack count silently capped in output without warning | Engineer inputs 50 servers per rack, tool caps at 48 due to OOB limit, user never notices | Show explicit "capped from X to Y: reason" in the output |
| PDF export looks different from screen view | Engineer shares PDF with procurement team; PDF has different layout, missing labels | Build PDF from the same data model as screen, not from a screenshot; test PDF output as part of CI |

---

## "Looks Done But Isn't" Checklist

- [ ] **Spine scaling:** Engine correctly increases spine count beyond 2 for >16 racks — verify with a 20-rack configuration
- [ ] **OOB saturation:** Tool warns when `servers_per_rack + 2 > 48` — verify with exactly 47, 48, and 49 servers per rack
- [ ] **Cable bidirectionality:** Leaf-spine cable count equals `N_leafs × uplinks_per_leaf` (not double) — verify with hand-calculated expected value
- [ ] **DAC distance advisory:** Selecting DAC with >8 racks displays a cable distance advisory — verify this warning appears
- [ ] **Oversubscription field present:** Exported JSON and CSV include oversubscription_ratio field — verify file contents
- [ ] **localStorage schema versioning:** Loading a config saved from a previous app version either migrates correctly or shows a clear "incompatible saved config" message — verify by manually modifying a localStorage entry
- [ ] **PDF font rendering:** PDF export includes all labels and headers without truncation — verify at 10-rack and 30-rack scale
- [ ] **S3248T scaling:** OOB switch count is `ceil(N_racks / max_ports_per_switch)` when saturation is handled by adding more OOB switches — verify the engine adds a second OOB switch at the right threshold
- [ ] **Zustand hydration failure:** Corrupt localStorage does not crash the app on load — verify by manually setting `localStorage['network-sizer'] = "CORRUPTED"` and refreshing

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded spine count discovered post-release | HIGH | Refactor engine constants, update all tests, re-validate topology math; impacts core type definitions |
| Cable count off-by-2 discovered after user reports wrong BOM | MEDIUM | Fix link model, add regression test, publish corrected BOM for affected configs |
| No oversubscription metric in BOM type | MEDIUM | Add field to NetworkBillOfMaterial type, update engine, update all UI consumers and export formats |
| localStorage schema incompatibility after feature addition | MEDIUM | Add version field + migration function; or wipe old configs with a warning notification |
| PDF generation blocks UI thread | LOW | Wrap in React.lazy + dynamic import; defer to phase boundary |
| Zustand selector infinite loop in production | HIGH | Requires hotfix; use useShallow or break selector into primitive subscriptions |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded spine count | Phase 1: Core Sizing Engine | Unit test: 20 racks produces 4 spines, not 2 |
| Oversubscription not surfaced | Phase 1: Core Sizing Engine | Type check: `NetworkBillOfMaterial` has `oversubscriptionRatio: number` field |
| Cable bidirectionality error | Phase 1: Core Sizing Engine | Unit test: 2 leafs + 4 spines = exactly 8 leaf-spine cables |
| OOB port saturation | Phase 1: Engine + Phase 2: Validation | Unit test: 47 servers/rack = no warning; 49 = typed violation emitted |
| Cable distance constraints | Phase 1: Hardware Catalog | Hardware catalog type includes `max_distance_m`; Zod schema validates selection |
| Zustand selector infinite loop | Phase 3: State Architecture | No selector in codebase returns new object/array reference without `useShallow` |
| Zustand persist schema corruption | Phase 3: State Architecture | E2E test: corrupted localStorage → app loads gracefully with empty state |
| React Flow performance | Phase 4: Visualization | Profiler test: dragging a 20-rack topology maintains >30fps |
| PDF generation blocking | Phase 5: Export | Lighthouse performance: PDF export click does not block main thread >50ms |
| Zod on `z.number()` without constraints | Phase 2: Form Validation | Schema review: no unconstrained `z.number()` in port/count fields |

---

## Sources

- [Dell EMC Networking L3 Leaf-Spine Design Guide (OS10)](https://dl.dell.com/manuals/all-products/esuprt_ser_stor_net/esuprt_networking/networking-s5296f-on_deployment-guide2_en-us.pdf) — HIGH confidence
- [Dell PowerScale Leaf-Spine Network Best Practices](https://infohub.delltechnologies.com/en-us/l/dell-powerscale-leaf-spine-network-best-practices/general-leaf-spine-switch-design-considerations/) — HIGH confidence
- [Juniper Design Considerations for Spine-and-Leaf IP Fabrics (white paper)](https://www.juniper.net/content/dam/www/assets/white-papers/us/en/design-considerations-for-spine-and-leaf-ip-fabrics.pdf) — HIGH confidence
- [How Many Spines Should a Leaf-and-Spine Fabric Have? — ipSpace.net](https://blog.ipspace.net/2023/02/number-spines-leaf-spine-fabric/) — HIGH confidence
- [Oversubscription in Networking — Noction](https://www.noction.com/blog/oversubscription-in-networking) — HIGH confidence
- [Dell PowerSwitch S5200-ON Series Spec Sheet](https://www.delltechnologies.com/asset/en-us/products/networking/technical-support/dell_emc_networking-s5200_on_spec_sheet.pdf) — HIGH confidence (official Dell)
- [Dell PowerSwitch S3248T-ON — Dell Blog](https://www.dell.com/en-us/blog/dell-powerswitch-s3248t-on-the-future-of-out-of-band-management/) — HIGH confidence (official Dell)
- [Zustand GitHub (pmndrs/zustand)](https://github.com/pmndrs/zustand) — HIGH confidence (official repo)
- [Mastering Zustand v4 and v5 Guide — DEV Community](https://dev.to/vishwark/mastering-zustand-the-modern-react-state-manager-v4-v5-guide-8mm) — MEDIUM confidence
- [React Flow Performance Guide](https://reactflow.dev/learn/advanced-use/performance) — HIGH confidence (official docs)
- [Ultimate Guide to Optimize React Flow Performance — Synergy Codes](https://www.synergycodes.com/blog/guide-to-optimize-react-flow-project-performance) — MEDIUM confidence
- [Generating PDFs in React with react-pdf — LogRocket](https://blog.logrocket.com/generating-pdfs-react/) — MEDIUM confidence
- [Zod Best Practices — Steve Kinney / Full Stack TypeScript](https://stevekinney.com/courses/full-stack-typescript/zod-best-practices) — MEDIUM confidence
- [DAC vs AOC Cable Distance Limits — Cables and Kits Learning Center](https://www.cablesandkits.com/learning-center/difference-between-dac-and-aoc-cables/) — MEDIUM confidence
- [localStorage Pitfalls — RxDB Comprehensive Guide](https://rxdb.info/articles/localstorage.html) — MEDIUM confidence
- [Stop Using localStorage Like This in React — Medium, Jan 2026](https://medium.com/@hardlight/stop-using-localstorage-like-this-in-react-beac6351f5f1) — MEDIUM confidence

---

*Pitfalls research for: NetStack — Dell Leaf-Spine Network Sizing Calculator*
*Researched: 2026-03-16*
