# ADR-0002: Client-Side Only Architecture

## Status
Accepted

## Date
2026-03-17

## Context
The application needs to perform network sizing calculations and produce BOMs. This could be implemented as a server-side application, a client-server architecture, or a purely client-side app.

## Decision
We chose a **pure client-side architecture** (no backend) because:
- All calculations are deterministic and lightweight — no need for server compute
- No sensitive data that requires server-side protection
- Simplifies deployment (static hosting on GitHub Pages)
- Zero operational cost and no infrastructure to maintain
- Works offline once loaded

## Consequences
- No user accounts, no saved sessions on server (localStorage only)
- No server-side PDF generation — must use @react-pdf/renderer in-browser
- Hardware catalog updates require a code deployment (or JSON override via local file)
- No analytics or usage tracking without a third-party service
