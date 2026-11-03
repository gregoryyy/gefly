# Fixed 1982 C172P CAS airspeed references

## Source and applicability

The active JSBSim v1.3.3 [c172x model header](https://github.com/JSBSim-Team/jsbsim/blob/v1.3.3/aircraft/c172x/c172x.xml)
identifies a 1982 C172P. The manufacturer-authored [1982 Model 172P POH scan](https://www.glasscockpitaviation.com/wp-content/uploads/2022/07/cessna-n54829-poh.pdf)
has a 12 May 1981 title-page date. Local PDF SHA-256:
`5c63c4b45c2527ce1ed300c3340e78993f01605fc1366c2e403ea7547c72306c`.
Title page and the complete relevant tables were rendered and inspected. The
hosting site is a third-party copy; completeness, aircraft-specific amendments
and the handwritten serial applicability are not established. No PDF or page
image is redistributed. These are extracted numerical facts and source links.

## Verified values

Figure 2-1, printed page 2-4 (PDF page 19), gives separate KCAS/KIAS columns:

| Limit | KCAS used here | KIAS, not used on the CAS dial |
| --- | ---: | ---: |
| VFE, 10 degrees | 108 | 110 |
| VFE, 10-30 degrees | 84 | 85 |
| VNO | 123 | 127 |
| VNE | 152 | 158 |

Figure 5-3, printed page 5-12 (PDF page 80), gives power-off, 2400 lb,
zero-bank stall values: full-flap VS0 is 46 KCAS; clean VS1 at most-forward CG
is 52 KCAS. Clean most-rearward CG is 51 KCAS, so that value must not replace
the declared forward-CG reference. These are fixed conditions, not instantaneous
stall thresholds for the loaded research model.

Figure 2-2, printed page 2-5 (PDF page 20), specifies installed **KIAS** markings:
white 33-85, green 44-127, yellow 127-158, red 158. Those numbers are unsuitable
for direct placement on the application's ideal **CAS** dial. This page also
carries Revision 2, 1 October 1994.

## Presentation boundary

The application therefore draws explicitly labeled **172P CAS-reference teaching
arcs**: white 46-84, green 52-123, yellow 123-152, with a red 152 line. This is a
presentation derived from the separate KCAS limits and stall rows, not a claim
that the manufacturer installed these arcs. VS0/VS1/VFE/VNO/VNE values appear
on the face. A separate V10 108 label and tick show the 10-degree flap limit;
the accessible legend names it VFE10 explicitly.
The TAS fallback omits all CAS references. Nothing here applies selected-172S
values, validates JSBSim performance, establishes a dynamic stall warning or
changes flight physics.

## Rights basis addendum (2026-11-03 07:40 Europe/Berlin)

Added by Claude Code housekeeping after Claude peer review F34 (high) and F32 ([report](../reviews/2026-11-03-codex-prs-39-50-peer.md)). It records the current rights position. It is not a legal opinion.

**POH values: rights basis unresolved.** The values listed above ship as individual numbers in `app/src/aircraft-handbook-data.ts` and `app/src/airspeed-markings.ts`. They come from a Cessna-authored, copyrighted 1982 Model 172P handbook, read from a third-party-hosted scan of one airframe's POH (`cessna-n54829-poh.pdf`). They are shipped in the `facts_only` form of [CONTRACTS §10.5](../design/CONTRACTS.md): cited values with page references, and no copied text, tables, figures or page images.

The recorded user allowances do not cover this document:
- GAPS Q7 (2026-11-01 13:59) allows POH values to be extracted as cited facts.
- GAPS Q5 (2026-11-02 07:36) accepts whole lists from the selected 172S POH (S17).

Both decisions concern the selected 172S handbook. No recorded decision, publisher permission or rights analysis (factual-data copyright, EU database right) extends them to this C172P POH. Public hosting is not permission (R-DATA-1). Until the user decides, the values are labelled **rights unresolved**. A GAPS entry is proposed to the orchestrator.
