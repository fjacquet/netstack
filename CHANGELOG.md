# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Per-rack server count configuration (issue #2) — planned

## [0.1.0] - 2026-03-17

### Added

- Domain engine with Dell leaf-spine sizing logic (`calculateBOM`)
- Hardware catalog: S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON
- Zod v4 schemas as single source of truth for types
- Zustand stores with localStorage persistence
- Input form with server count and connectivity parameters
- BOM results panel with per-model breakdown
- Topology diagram using @xyflow/react
- Rack elevation visualization
- PDF export via @react-pdf/renderer
- CSV export
- i18n support (FR, EN, DE, IT)
- Light/dark theme with system preference detection
- Category icons for Sizing, Topology, Rack, Export tabs
- Logo, favicon, iOS touch icon, and web manifest
- GitHub Pages deployment via GitHub Actions
