---
name: i18n-checker
description: Scan for missing i18n translation keys across all 4 locales (EN/FR/DE/IT)
---

# i18n Checker

Verify that all `t('...')` calls in the codebase have corresponding keys in all 4 locale files.

## Process

1. Find all translation key usage in source files:
   ```
   grep -roh "t('[^']*')" src/ --include="*.tsx" --include="*.ts" | sort -u
   ```

2. Extract the key from each match (strip `t('` and `')`).

3. For each key, check it exists in all 4 locale JSON files:
   - `src/i18n/locales/en/translation.json`
   - `src/i18n/locales/fr/translation.json`
   - `src/i18n/locales/de/translation.json`
   - `src/i18n/locales/it/translation.json`

4. Report:
   - Missing keys per locale (key exists in code but not in locale file)
   - Orphaned keys per locale (key exists in locale file but not in code)
   - Key count summary

## Output Format

```
## i18n Audit

### Missing Keys
| Key | EN | FR | DE | IT |
|-----|----|----|----|----|
| mode.converged | OK | MISSING | OK | OK |

### Orphaned Keys (in locale but not in code)
| Key | Locales |
|-----|---------|
| old.removed.key | EN, FR, DE, IT |

### Summary
- Total keys in code: N
- EN: N keys (M missing)
- FR: N keys (M missing)
- DE: N keys (M missing)
- IT: N keys (M missing)
```
