# Source manifests and reference data

No aircraft coefficients, manuals, maps or navigation databases have been added.
Before ingestion record publisher, URL, exact variant/configuration, revision,
section/page, original units, extraction/derivation method, uncertainty, access
time, license/permission and checksums in an assigned source manifest.

Distinguish sourced, derived, estimated and unknown values. Link authorized
documents instead of redistributing them without rights. See [SBOM](../docs/SBOM.md)
and [research](../docs/research/README.md). Independent validation fixtures must
remain distinct from calibration data. Directory ownership is assigned per task.

Aircraft manifests: [172S classic panel](aircraft/c172s-classic/README.md), schema in
`schema/aircraft-manifest.schema.json`, validated by `utils/validate_manifest.py`.
