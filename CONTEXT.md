# Project Context

Living glossary of domain concepts used in this codebase. Terms are added when a
concept gets a name in code — keep this lean. If a term isn't carrying its weight
across multiple modules, it doesn't belong here.

## Open Event

A time-bounded event during which members and guests can record attendance.
Modelled by `prisma.OpenEvent` and accessed exclusively through
`src/lib/openEvents/` (the **Open Event intake module**).

Invariants:

- An Open Event occupies a closed date range `[startDate, endDate]` with
  `startDate < endDate`.
- At most one Open Event is permitted in any given calendar window — no two
  Open Events may have overlapping date ranges. Enforced inside a serializable
  transaction in the intake module's `create` and `update` commands.
- An Open Event is **live** when `isActive && allowPublic` and the current
  instant falls inside its date range. Liveness is a single concept owned by the
  intake module (`getCurrentLive`, `listLive`) — callers do not assemble the
  `where` clause themselves.

## Open Event Check-in

A single attendance record against an Open Event, modelled by
`prisma.OpenEventAttendance`. A check-in is identified by either a `userId`
(authenticated member) or a `sessionId` (anonymous guest).

Invariants:

- A given `(userId, openEventId)` pair has at most one check-in. Same for
  `(sessionId, openEventId)`. Enforced by Prisma `@@unique` constraints; the
  intake module relies on the constraint catch (`P2002`) rather than a
  check-then-act read.
- Anonymous guests may only check in to **live** Open Events. Authenticated
  members may check in outside the window (e.g. for late attendance recording).
