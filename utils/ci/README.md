# Repository-tool CI

[run.py](run.py) runs the shared offline gate from its own checkout, independently
of the caller's directory. It runs the scaffold checker, recursively discovered
Python tool tests, study checks, synthetic renderer checks, assurance tests and
integrity checks, a separate assessment airspeed training test suite, and
tracked-content whitespace checks. Failures and timeouts
fail the gate; skipped study checks remain explicitly reported as skipped.
Python 3.11 or newer, Git and Node 24.2 or newer are required for the full gate.

From the repository root:

```sh
just ci
just check
just test-training
python3 -m unittest discover -s utils -p 'test_*.py'
```

The equivalent direct entry points also work from another directory:

```sh
python3 /path/to/checkout/utils/ci/run.py
python3 /path/to/checkout/utils/ci/check.py
```

[check.py](check.py) performs the lower-level file, local-link and agent-config
checks without Node. [assurance-reporter.mjs](assurance-reporter.mjs) supplies
per-file Node test summaries for both assurance and training tests; its legacy
filename does not imply training results are assurance results. Each suite is
reported separately, and empty or skipped suites cannot count as passing
coverage. Training core and tests use Node's native TypeScript support without a
package installer, new dependencies or a whole-workspace build. `__init__.py` keeps the CI tests discoverable beneath
`utils`; standalone peer and aircraft-validator tools and tests remain alongside
this directory.

The gate does not install dependencies, invoke live providers, fetch manuals or
data, launch browsers, build PDFs or launch an interactive simulator. Existing
JSBSim study tests use a locally installed engine when available and otherwise
report their skips. Tests use offline fixtures and temporary repositories;
timeouts terminate their child process
groups on supported POSIX systems. These tool checks establish no aircraft
fidelity, training effectiveness or regulatory approval.
