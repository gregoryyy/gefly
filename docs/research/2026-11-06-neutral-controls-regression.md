# Published neutral-control regression

The user renewed the sensitivity/hands-off report on2026-11-06 and confirmed both effects in [the input record](../input/2026-11-06-handling-regression.md). This note supports a bounded startup-input repair under TODO2.0.153/R-INPUT-1/R-SIM-11; broader aircraft handling remains open.

## Confirmed merge regression

PR86 implementation e826d19 initialized external roll offset to zero. Merge b51bcc0 has zero in its first parent,−0.109375 in its second parent and−0.109375 in the result; mainc3d850a retains the latter. The slider HTML value is zero, while its readout exposes10.9%left and the app actually sends−0.109375 to the Worker/native aileron command. This is an application command, not an aircraft coefficient.

At the declared normal gain, small centered pointer commands±0.05 both become left commands(−0.159375/−0.059375); keyboard±0.45 becomes asymmetric−0.559375/+0.340625. The repair restores normal zero initialization and leaves explicit advanced experimental calibration available.

## Actual browser regression and adjacent checks

The durable app/tests/neutral-controls.browser.mjs uses the real app, Worker and current11a engine atSIM1. Only map/photo pixels are synthetic. The unmodified branch fails on the first actual aileron command−0.109375 with slider0/native command−0.109375. Old artifact output/flight/neutral-controls-browser-old.json SHA-25633dfa5be414893c0c67544b63978b679def573421107afd2319dd629d860a979.

After the repair, three groups pass: fresh all-axis zero/native zero/UIzero;15pxright produces+0.05 with independent rudder, while center/scene exit/key release return zero; explicit advanced+0.25 still reaches native andOff returnszero. Final artifact output/flight/neutral-controls-browser.json SHA-256276323f88dc4efff80fb55c6f40fa24c25cbc2ee39c7fe6e2953719e0df860f2.

Review-controls browser passes. Three adjacent legacy suites remain unsuccessful: centered-touchpad toggles an already-selected yoke off after map opening, smoke's map-heading click is intercepted by the topbar, and classic-smoke fails its changed pointer assertion while assuming a relative anchor under the current centered default. These broader fixture failures have no complete before/after baseline proof. Their logs are under output/flight/neutral-adjacent-browser; no full-browser-suite pass is claimed. Ordinary neutral expectations are updated; explicit Legacy-study/native/ground/landing offsets remain explicit. Independent [quality](../reviews/2026-11-06-neutral-controls-quality.md) and [validation](../reviews/2026-11-06-neutral-controls-validation.md) distinguish inspected evidence from tests run independently.

## Native comparison and remaining scope

Fresh64-case native output SHA-256a472e3f1c2581c86e8eb129240d6d1619cf2d1285f0f045e6b178d5674b3b67a exactly matches the recorded November5 diagnostic. Live5173 engine/glue/worker/loading bytes match disk, and all six prepared model files occur byte-for-byte in executing WASM. The stale build record remains unverified.

In the paired90kt-CAS diagnostic with normal loading and trim power, bank after7s is−36.132°with the hidden offset versus+4.225°with zero. This is an engineering fixture using the generic c172x model, not accepted C172S performance. Separate zero-command tests still show roughly14–19°bank after30s; actuator hysteresis and110kt initialization trim failure remain open. The workspace and currently served5173 already initialize zero, so this published-main repair does not fully explain a report from that workspace.

An isolated source-supported full-trim experiment has production-equivalent longitudinal results and can reduce neutral drift only when its derived lateral pilot commands are held explicitly. That is a possible simulator-assist/initial-condition research boundary, not real C172 in-flight aileron trim or an accepted product default. Its comparison artifact SHA-25626aa8f91f6f92ef8177e54072b930f67f6a19caa835a83b6be3d347e86112f44 is retained under the root ignored handling-regression-native/fulltrim output. No experimental engine, controls or coefficients are installed.
