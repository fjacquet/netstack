# ADR-0008: react-i18next with Synchronous JSON Imports for 4-Locale Support

## Status
Accepted

## Date
2026-03-17

## Context
NetStack targets 4 locales: English (EN), French (FR), German (DE), and Italian (IT). The app is deployed as a static SPA on GitHub Pages — there is no backend and no HTTP server to serve translation files dynamically.

Three i18n approaches were evaluated:

| Approach | Loading | Notes |
|----------|---------|-------|
| i18next with `i18next-http-backend` | Async HTTP fetch | Requires a server; breaks on `file://` and GitHub Pages without config |
| react-intl (FormatJS) | Bundle-time | Complex API; no single `t()` hook equivalent |
| react-i18next with static JSON imports | Synchronous bundle | All locales bundled; simple `useTranslation()` hook; works offline |

The HTTP backend approach was rejected because GitHub Pages does not serve the translation JSON files with the correct MIME type and path when using Vite's base path configuration. It also introduces a loading state that complicates the initial render.

## Decision
Use **react-i18next** with **synchronous JSON imports** for all 4 locales.

Translation files live at `src/i18n/locales/{locale}/translation.json`. They are imported directly in `src/i18n/index.ts`:

```typescript
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import de from './locales/de/translation.json';
import it from './locales/it/translation.json';
```

All 4 translation bundles are included in the main JS bundle. At ~5 KB per locale, the total overhead is ~20 KB — negligible versus the @xyflow/react and @react-pdf/renderer dependencies.

i18next is configured with:
- `fallbackLng: 'en'` — missing keys fall back to English
- `interpolation.escapeValue: false` — React already escapes values
- `initImmediate: false` — synchronous initialization, no async init required

The language switcher stores the selected locale in localStorage via `i18next-browser-languagedetector` and restores it on next visit.

## Consequences
- All 4 locales are always bundled — translations cannot be loaded on demand
- Adding a new locale requires a new JSON file and a new static import in `src/i18n/index.ts`
- Translation keys are nested objects (`bom.heading`, `topology.fitView`) — flat key style is not used
- The `useTranslation()` hook must be called inside a component that is a child of `<I18nextProvider>` — the provider is placed at the root in `App.tsx`
- `AppContent` is split from `App` so that `useTranslation()` works inside the `ThemeProvider` wrapper
