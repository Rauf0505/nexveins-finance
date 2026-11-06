# ADR-0001: Backend stack is TypeScript/Next.js, not Python/FastAPI

**Status:** Accepted
**Date:** 2026-11-06
**Supersedes:** Requirements spec section 4 ("Technology Stack") — Backend subsection

## Context

The original requirements brief specifies the backend as Python with FastAPI,
Pydantic, SQLAlchemy 2.x, Alembic, and `uv`. Section 4 permits a different stack
where "a documented technical constraint justifies a change."

The implementation delivered against that brief (`/legacy`) is entirely
TypeScript: an Express API, a class-based `AccountingEngine`, and a React SPA.
It reached roughly the middle of the spec's Phase 3 and did not implement
Phase 1 (authentication, tenancy enforcement) at all.

## Decision

Rebuild on **Next.js (App Router) + TypeScript + Prisma + PostgreSQL + Better Auth**.

| Concern | Choice |
| --- | --- |
| Framework | Next.js App Router, server rendering and server actions |
| Database | PostgreSQL 17 via Docker Compose |
| Data access + migrations | Prisma ORM and `prisma migrate` |
| Auth | Better Auth, self-hosted, tables in the application Postgres |
| Money arithmetic | `NUMERIC` in Postgres, `Decimal` in application code |
| Monorepo shape | Modular monolith, one deployable |

## Justification

1. **The existing ledger logic and UI are TypeScript.** Porting the accounting
   engine, report definitions, and thirteen views is a translation; rewriting
   them in Python is a reimplementation of code that is already correct.
2. **One language across the boundary** keeps the typed API contract between
   ledger and UI in a single type system, which is where the legacy codebase
   leaked most often (`src/types.ts` duplicated server response shapes by hand).
3. **Better Auth satisfies Phase 1 directly** — sessions, organization
   membership, and RBAC in the same Postgres as the books, with no separate
   identity service or vendor lock-in.
4. **Deploying one process instead of two** matches the brief's own instruction
   not to introduce microservices without demonstrated need.

## What still binds from section 4

The deviation is limited to the implementation language and its tooling. The
following non-negotiables from the brief are unaffected and remain in force:

- PostgreSQL `NUMERIC` for stored amounts. **No binary floating-point
  arithmetic on financial values** — this is why the legacy `CAST(l.debit AS
  NUMERIC)` aggregation over `TEXT` columns is removed rather than ported.
- Explicit currency precision and rounding policy.
- Modular monolith with clear domain boundaries and API contracts.
- No Kubernetes, no multiple databases, no service extraction without evidence.
- Docker Compose for local development, CI for lint/test/migration checks.
- Row-level security and database constraints as defence in depth for tenancy.

## Consequences

- Section 4's Python-specific deliverables (`uv`, Alembic, Pytest, Pydantic)
  are replaced by npm scripts, Prisma Migrate, Vitest/Playwright, and Zod.
- Anything later requiring the Python ecosystem, such as the reporting or
  forecasting models the brief mentions as optional, becomes a separate
  service rather than part of the core.
