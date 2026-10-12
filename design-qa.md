# Landing redesign QA — 2026-10-12

final result: passed

Scope: adaptation of the supplied composition to Althera, explicitly replacing the source palette, copy, brands and illustrations. This is not an exact replica or a legal compliance certification.

## Visual evidence

- `docs/landing-qa/comparison.jpg`: original reference beside final composition.
- Desktop 1440×900, tablet 768×1024 and mobile 390×844 CSS viewports checked. No horizontal overflow; mobile menu, stacked mockups and contact fields remain usable.
- Original reference preserved at 1080×2160. Browser screenshot at matching CSS viewport was emitted as 1075×2149; `render-normalized.png` explicitly rescales that screenshot to 1080×2160 for diagnostic comparison. Original screenshot preserved separately.
- Diagnostic RGB similarity: 0.77793, below the default 0.98 exact-replica target. This is expected from the user-requested palette, assets, copy and spacing adaptation; no claim of 98% fidelity is made. Visual review confirms the split hero, 3D visual, full-width brand strip, alternating image/text and six-service grid.
- Gold/dark palette, original Althera/Bites logos, locally hosted fonts, generated optimized WebP hero/mockups. Conceptual work is labelled; the InstaRemoveAI presentation uses the actual product screenshot.

## Functional checks

- TypeScript lint, production build, encoding check and git diff whitespace check passed. Existing print CSS selector/chunk-size build warnings remain.
- `scripts/test-landing-preferences.ts` passes: country mapping, explicit path/manual overrides, fallback, consent parsing/expiry, no tracking before opt-in, header on consented tracking and ID removal after rejection/expiry.
- Country endpoint with local host headers MX and AE returns expected countries.
- Browser ES/EN selector, preserved legal route on language switch, privacy/cookies/terms pages, mobile menu, section anchors and Bites contact selection checked.
- Contact required fields and unchecked privacy consent block empty submission; no test enquiry sent to production. Success/error paths preserve existing inquiry insert behavior.
- Cookie reject/accept/customize/reopen/revoke checked. Analytics and language choices expire after 180 days. Fonts self-hosted to avoid Google Fonts requests before consent.
- Fade and parallax implemented with reduced-motion bypass. OS reduced-motion emulation was not performed.

## Legal boundaries

Business identity taken from the supplied licence, with no shareholder/passport data published. Privacy, cookies, company notice and service terms cover the implemented public site. Official sources and applicability limits are recorded in `docs/landing-qa/legal-sources.md`. Operational retention, processor arrangements and international-transfer safeguards still require business/legal validation; these pages do not establish that every UAE obligation has been fulfilled.
