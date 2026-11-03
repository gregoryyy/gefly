# Expanded roadmap: independent documentation review

Reviewer: Codex subagent `road_vision_validate`, 2026-11-03, Europe/Berlin.
Base: `40e3819a90f05eeea0e7d13567d7b45773804860`; reviewed the integrated
`docs/expanded-product-roadmap` working tree. The reviewer did not author ROAD,
IDEA, SPEC, GAPS, the input record or task changes. This is a documentation-only
review; cross-provider peer remains pending under the existing cadence.

## Quality outcome

**No blocking findings.** The roadmap preserves the user's requested directions
and existing phase/licence gates while distinguishing planned extensions from
prototype functionality. Currentness wording now recognizes bounded regional
terrain/maps, historical real navigation and KAP 140-style logic without claiming
a completed 172S model, accepted full region or installed-aircraft fidelity.

The financing clarification preserves GPL-3.0-or-later and a permanently free,
useful baseline. Optional separately licensed commercial data/service access is
only a candidate direction. It neither approves proprietary bundled assets nor
selects a provider, pricing arrangement, partner or closed-source variant. The
Q5 answer retains earlier history and identifies the actual new user phrases;
interpretation and future rights checks are explicit. No contract or external
provider's legal/API terms are asserted as verified.

The first classic-panel 172S/EASA PPL circuit at EDFE remains first. The roadmap
keeps EDDF/100 NM as a reference/acceptance region, current Hessen/surrounding
prototype bounds distinct from wider map coverage, open DACH as the next world
focus and later regions conditional on usable sources. Sailplane/ultralight
qualification boundaries and the unselected order relative to CPL remain intact.

## Validation against the supplied ROAD note

**Pass for documentation capture and consistency**, not for implementation of
these capabilities. The raw input preserves all ten supplied sections, decoding
escaped spaces without changing their substance.

| User direction | Inspected roadmap coverage | Outcome |
| --- | --- | --- |
| Realism with minimal browser prerequisites; just-fly through licence exercises; instruments/procedures and professional material | Product vision and experience levels; professional-reference paragraph; existing licence-specific tracks | Pass |
| Real-time community flying; aircraft/world/model contributions; suggestions/forum | Planned community/contributions track and open-release phase | Pass |
| Open ecosystem partnerships; map providers/publishers, ATC/manufacturers, flight schools | Partnerships table separates content, awareness/expertise and usage/feedback; no recruited partners claimed | Pass |
| Free remains free; potential commercial-map/subscription premium, Navigraph example, AI token-cost support and more partners | Financing section, IDEA summary, SPEC R-OPEN-1 and Q5 clarification | Pass |
| AI/real weather and reporting, cloud cover, rain, fog, temperature | Weather/reporting track separates generated, historical and live conditions and coherent simulated effects | Pass |
| AI/community traffic, NOTAM, restricted/no-fly zones and busy international airport scenario | Traffic/operational-constraints track, including sequencing, clearance and occupied-runway scenario consequences | Pass |
| Controlled/restricted maps; select navaids; GPS markers; fix lookup and flight plans/glide slope; terrain-projected towns/landmarks/roads/rivers/air fixes; VOR/DME/ILS geometry | Navigation/flight-planning track includes each item and distinguishes user markers, published fixes, plans and procedures | Pass |
| AI airport COM1/COM2 interaction; COM station discovery comparable to NAV1/NAV2 | Communications track; station directory and modeled service remain separate | Pass |
| HUD, transparent no-panel main instruments, paired iPhone/Android orientation, magnetic north and checklist lookup/execution | Instruments/controls/procedures track; classic-first and phone-source/permission/calibration gates preserved | Pass |
| Hessen/surrounding states; open DACH; OurAirports/OpenFlightMaps/potential Navigraph/Eurocontrol-EAD/later FAA; Google Earth discussion; procedural/semantic/geotypical reconstruction | World realism/source strategy includes every candidate and reconstruction method, explicitly as evaluation/discussion rather than adoption | Pass |

TODO 0.22 records this documentary reconciliation. Closing that task after review
and integration checks must not close any future simulator capability or milestone.
The existing exercise scope and text-radio phase remain unchanged; the proposed
sequence does not invent a provider, schedule or order for later licence tracks.

## Independently executed checks and limits

- `just check`: passed for 232 Markdown files before this report and 233 including it. It checks local
  document/link targets and input-index completeness; it does not verify external
  URLs, heading anchors, provider terms or simulator behavior.
- `git diff --check`: passed, with no whitespace findings.
- Inspected the raw input and current ROAD in full, and the IDEA/SPEC/GAPS/TODO/
  input-index diff against the stated base. Changes are documentation only; no
  application code, services, provider accounts, dependencies or project licence
  file are changed by this task.

No runtime, aircraft, multiplayer, live weather/NOTAM, source-rights, partnership,
commercial-provider integration or training acceptance was performed or implied.
Shared CI, assurance, timestamped DONE closure and publication are orchestrator
integration evidence, not commands claimed as executed by this reviewer.
