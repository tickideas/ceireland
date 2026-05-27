/**
 * Open Event intake module — the single deep seam owning every read and
 * write of `OpenEvent` and `OpenEventAttendance`. All seven Open Event
 * routes and the SSR dashboard go through this module; Prisma never
 * appears in a caller again.
 *
 * Domain rules live here (see CONTEXT.md):
 *   - Liveness: `isActive && allowPublic && now ∈ [startDate, endDate]`.
 *   - Date-range invariant: `startDate < endDate`.
 *   - Overlap: no two Open Events may share a calendar window. Enforced
 *     inside a SERIALIZABLE transaction with bounded retry on P2034.
 *   - Idempotent check-in: relies on the `@@unique` constraints (P2002)
 *     instead of a check-then-act read. Anonymous guests are restricted
 *     to live windows; members may record attendance outside the window.
 *
 * Errors thrown by this module are AppError subclasses, so they flow
 * through `errorResponse()` in callers without further translation.
 */
export {
  // Queries
  getCurrentLive,
  listLive,
  list,
  getByIdWithAttendance,

  // Commands
  create,
  update,
  remove,
  checkIn,

  // Reports
  summary,
  daily,
  exportCsvStream,

  // Types
  type OpenEvent,
  type OpenEventWithAttendance,
  type CreateInput,
  type UpdateInput,
  type CheckInInput,
  type CheckInResult,
  type AttendanceSummary,
  type DailyAttendance,
  type AttendanceRecord,
} from './openEvents'
