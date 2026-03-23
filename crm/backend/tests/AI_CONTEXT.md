# Tests AI Context

Purpose: verify endpoint behavior and regression-prone backend flows.

Patterns:
- isolate dependencies with Jest mocks
- favor fast unit and controller tests

Dependencies:
- Jest
- Supertest when integration coverage is needed

Conventions:
- one test file per domain capability
- keep fixtures minimal
