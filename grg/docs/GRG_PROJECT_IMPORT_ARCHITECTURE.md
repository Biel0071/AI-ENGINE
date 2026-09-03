# GRG Project Import Architecture

Import sources are local project, ZIP or repository connector. The intended flow is `import -> ingest/clone -> scan -> detect stack -> analyze structure -> graph/memory -> profile -> optional mission`.

Project Mirror and repo-intel already implement local inspection, repository metadata and grounded analysis. External code is never copied automatically; adaptation must be explicit, policy-checked and provenance-recorded.

Next implementation: finish one canonical import job that produces a persisted Project Profile and source-cited Codebase Graph for both local and GitHub inputs.
