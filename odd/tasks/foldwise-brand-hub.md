# Foldwise brand hub
Objective: local Spanish brand hub (manual + board + renders + e-commerce sample) to win the branding project. Branch: feature/foldwise-hub. Delivery: local only, no push. Runner: Vitest + Playwright.

## Specs
- S1: Full spec at docs/superpowers/specs/2026-11-06-foldwise-brand-hub-design.md (binding). Plan at docs/superpowers/plans/2026-11-06-foldwise-brand-hub.md.
- S2: "No montemos todo en español si ya el cliente lo pide, se cambia inglés pero todo en español."
- S3: "vamos con subagentes, asi vamos en paralelo"

## Tasks
| ID | Plan task | Route | Status | Commit |
|---|---|---|---|---|
| T1 | Scaffold | delegated | done | 2bfa103 |
| T2 | Data & pricing | delegated, wave 2 | done | caac976 |
| T3 | Logo & animation | delegated, wave 2 | done | 86865c3, 0dabe7a, 0d094f0 |
| T4 | IsoBox | delegated, wave 3 | done | cbee668, efbdac5 |
| T5 | Shop home | delegated, wave 4 | done | b6b0c85 |
| T6 | Board | delegated, wave 4 | done | b2bc66c, 84f4305 |
| T7 | Manual | delegated, wave 5 | done | 27e9c04 |
| T8 | Catalog + PDP | delegated, wave 5 | done | 4428f4b |
| T9 | Dielines + guides (incl. T11) | delegated, wave 6 | done | 8c441fe |
| T10 | Box renders | delegated, wave 4 | done | 66f381b |
| T11 | Shipping PDP + guides | merged into T9 (R17) | done | 8c441fe |
| T12 | Hub entry, globals, PDF, polish | delegated, wave 6 | done | 6327df1 |
| FIX | Final review fix wave | delegated | done | fb4752d, 59a29d4 |

Final evidence: vitest 38/38; `npm run build` 11 pages; `grep -ril ebiopacking dist` none; Playwright on built preview 86/86. Final whole-branch review: ready after fixes → fixes re-reviewed, all addressed.

## Rulings (controller decisions; cost if wrong)
- R1 Parallel waves (user request) despite skill default — risk of conflicts; none occurred.
- R2 In parallel waves implementers didn't commit/build; parent committed and ran seam checks.
- R3 Reference image folders stay untracked user assets.
- R4 Astro 6 (local Node 22.20 can't run Astro 7) — don't upgrade Astro without upgrading Node.
- R5 Wave 2 started during T1 review.
- R6 ODD doc committed separately.
- R7 Dev pages lived in src/pages/dev/ (underscore routes don't work); deleted in T12.
- R8 AnimatedLogo has optional variant prop (crema|ciruela).
- R9 Animated flat f keeps lime folds on ciruela; static ciruela isotype keeps ciruela folds — small inconsistency between static and animated mark.
- R10 Shop-home "Toda la familia" lineup added in T12.
- R11/R12 Photo/CREDITS ownership per task; no global CSS edits in parallel waves.
- R13 A broad `git add` swept an in-progress BoxLineup draft into the T4 fix commit (efbdac5) — harmless; history slightly mixed.
- R14 Board hero logo "dim" was a mid-animation screenshot; size fixed in T12.
- R15 PDP tests use each category's own price tiers (plan example numbers were illustrative).
- R16 Both featured PDPs built in T8.
- R17 T11 merged into T9.
- R18 "3 a 5 días" claim fixed in final wave (file was busy during T12).
- R19 Minimum order unified to 25 boxes for all categories — client may prefer advertising 10 (one data edit in categories.ts).
- R20 Invented claims reworded to the client's stated differentiators; dielines keep only real FEFCO 0201/0427 — copy choices for user to confirm.

## Log
- L1 (2026-11-06): User request: create brand from scratch for client's new US corrugated box brand; deliverables website, brand manual, tone, colors, catalog, dielines; premium interactive site with micro-interactions (full brainstorm in spec).
- L2: Execution via subagents in parallel waves.
- L3: Note — Bash heredoc appends to the SDD ledger silently failed in this environment; rulings R4–R20 were recovered here from the controller's record.
- L4: Pending for user before meeting: read "Direcciones exploradas" rationales (implementer-written) and "Próximos pasos" items (Simian scope proposals); confirm "Cartón reciclable … sin plásticos" and "Envíos en EE. UU." with the client; verify USPTO serial 99663592; dielines are simplified (presentation, not die-cutting).
