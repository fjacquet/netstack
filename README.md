[![Release](https://img.shields.io/github/v/release/fjacquet/netstack?sort=semver)](https://github.com/fjacquet/netstack/releases/latest)

<p align="center">
  <img src="public/android-chrome-192x192.png" alt="NetStack logo" width="96" height="96">
</p>

<h1 align="center">NetStack</h1>

<p align="center">
  Network sizing calculator for Dell SONiC Ethernet, Brocade FC SAN, and Converged deployments
</p>

<p align="center">
  <a href="https://github.com/fjacquet/netstack/actions/workflows/ci.yml">
    <img src="https://github.com/fjacquet/netstack/actions/workflows/ci.yml/badge.svg?branch=maincd" alt="CI">
  </a>
  <a href="https://github.com/fjacquet/netstack/actions/workflows/deploy.yml">
    <img src="https://github.com/fjacquet/netstack/actions/workflows/deploy.yml/badge.svg?branch=maincd" alt="Deploy">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/PWA-offline--ready-5a0fc8?logo=pwa" alt="PWA">
  <img src="https://img.shields.io/github/license/fjacquet/netstack" alt="License">
  <img src="https://img.shields.io/github/v/tag/fjacquet/netstack?label=version" alt="Version">
</p>

<p align="center">
  <a href="https://fjacquet.github.io/netstack/">Live Demo</a> &bull;
  <a href="docs/userguide.md">User Guide</a> &bull;
  <a href="docs/prd.md">PRD</a> &bull;
  <a href="docs/CHANGELOG.md">Changelog</a> &bull;
  <a href="docs/adr/">Architecture Decisions</a>
</p>

---

NetStack answers one question: **"How many switches and cables do I need to order?"**

Enter your server count and connectivity requirements, get an instant Bill of Materials for Dell SONiC Ethernet (Clos or Three-Tier), Brocade FC SAN (dual-fabric), or a combined Converged deployment. No backend, no accounts — everything runs in your browser, even offline.

## Quick Start

```bash
npm install
npm run dev      # development server
npm test         # run tests
npm run build    # production build
```

For offline / air-gapped use, download the pre-built archive from [GitHub Releases](https://github.com/fjacquet/netstack/releases) and serve it from any static HTTP server.

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](docs/userguide.md) | How to use NetStack — modes, inputs, export |
| [PRD](docs/prd.md) | Product requirements and acceptance criteria |
| [Changelog](docs/CHANGELOG.md) | Version history |
| [Architecture Decisions](docs/adr/) | ADR-0001 through ADR-0022 |
| [CLAUDE.md](CLAUDE.md) | Developer guide — build commands, architecture, conventions |

## Architecture

```
Domain (pure TS) → Store (Zustand) → Features (React)
```

See [CLAUDE.md](CLAUDE.md) for the full layer breakdown, hardware catalog, sizing formulas, and key conventions.

## License

[ISC](LICENSE)
