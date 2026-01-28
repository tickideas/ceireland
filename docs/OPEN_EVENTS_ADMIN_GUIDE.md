# Open Events - Admin User Guide

## What Are Open Events?

Open Events allow your church to temporarily open the online platform to guests and visitors **without requiring them to register or log in**. This is perfect for:
- Special services (Easter, Christmas)
- Outreach events
- Guest speaker services
- Community gatherings

During an active open event, anyone can access the live stream and content by simply visiting your church's website.

---

## Managing Open Events

### Accessing the Open Events Manager

1. Log in to your admin account
2. Navigate to: **Admin Dashboard → Open Events** tab (🎉 icon)

### Creating a New Open Event

1. Click **"Create New Event"** button
2. Fill in the form:
   - **Title:** Name of your event (e.g., "Easter Sunday 2024")
   - **Description:** Optional details about the event
   - **Start Date:** When the event begins (format: YYYY-MM-DD)
   - **End Date:** When the event ends (format: YYYY-MM-DD)
   - **Is Active:** Check to enable public access immediately
   - **Allow Public Access:** Keep checked (unchecking blocks guests even if active)
3. Click **"Create Event"**

**Note:** Overlapping event date ranges are not allowed. The system will reject creating or updating an event if it overlaps with another event's date range.

### Editing an Event

1. Find the event in the list
2. Click **"Edit"** in the Actions column
3. Modify any fields as needed
4. Click **"Update Event"**

**Tip:** To activate an upcoming event, edit it and check the "Is Active" box when you're ready.

### Deleting an Event

1. Find the event in the list
2. Click **"Delete"** in the Actions column
3. Confirm the deletion

⚠️ **Warning:** Deleting an event will also delete all attendance records for that event. This action cannot be undone.

### Testing Attendance Tracking

Active events display attendance statistics directly in the admin dashboard, including:
- Total attendance count per event
- Guest vs. member breakdown
- Day-by-day attendance for multi-day events

You can test attendance by visiting the platform during an active event period.

---

## Understanding Event Status

### Active vs. Inactive

- **Active (green badge):** Public access is enabled. Guests can visit without logging in.
- **Inactive (gray badge):** Event exists but public access is disabled. Normal authentication required.

### Allow Public Access

- **Yes (blue badge):** Guests are permitted
- **No (red badge):** Authentication required even if event is active

### Date Range

Events automatically become available during their date range. The system checks:
- Current date/time is between Start Date and End Date
- Event is marked as Active
- Allow Public Access is enabled

---

## How Guests Access Your Platform During Open Events

When an open event is active:

1. Guest visits your church website (e.g., `yourchurch.com`)
2. Homepage automatically detects the active event
3. Guest is redirected to `/dashboard` without login
4. Guest sees:
   - Live stream (if streaming)
   - Daily devotional content
   - Service schedule
   - Announcements
   - Welcome message: "Welcome, Guest" with event badge

4. Attendance is automatically recorded (silently, in the background)

---

## Viewing Attendance Data

The admin dashboard provides comprehensive attendance viewing capabilities:

### Summary View
- Total attendance count per event
- Guest vs. member breakdown
- Number of unique days with attendance

### Daily Breakdown
- Day-by-day attendance statistics
- Paginated list of individual attendance records
- Filter by date

### CSV Export
- Export all attendance records to CSV
- Includes check-in timestamps, user details, and session information
- Streamed export for large datasets

### Accessing Attendance Data

1. Go to **Admin Dashboard → Open Events** tab
2. Click on an event to view its details
3. Use the attendance summary, daily breakdown, or export options

---

## Best Practices

### Before Your Event

1. **Create the event 1-2 weeks in advance** (keep it inactive)
2. **Test the event** using the "Record Test Attendance" button
3. **Verify the date range** is correct (including time zones)
4. **Activate the event** 1-2 hours before it starts

### During Your Event

1. **Monitor that the event shows as Active** in the Open Events list
2. **Check the member dashboard** to confirm guests can access without login
3. **Watch the stream settings** to ensure the live stream is active

### After Your Event

1. **Deactivate the event** by editing it and unchecking "Is Active"
2. **Keep the event record** for future reference (don't delete unless necessary)
3. **(Future)** Export attendance data for records

---

## Troubleshooting

### Guests are being asked to log in

**Check:**
- Event is marked as "Active"
- "Allow Public Access" is checked
- Current date/time is within Start Date and End Date range
- No other conflicting authentication requirements

### Can't activate an event

**Possible causes:**
- Another event may be overlapping the same date range
- Start Date is after End Date (invalid)
- You may not have admin permissions

### Test attendance button does nothing

This feature has been replaced. The admin dashboard now shows attendance statistics directly for each event. To test, simply access the platform during an active event period.

### Event appears in list but guests can't access

**Verify:**
- Event is marked as "Active" (green badge)
- "Allow Public Access" shows "Yes" (blue badge)
- Current date is between start and end dates
- Try clearing your browser cache

---

## FAQ

**Q: Can I have multiple active events at once?**  
A: No. The system enforces that event date ranges cannot overlap, preventing multiple concurrent events. This ensures clear access control and accurate attendance tracking.

**Q: What happens if a member logs in during an open event?**  
A: They can log in normally and will see the full member dashboard. Their attendance is still tracked (linked to their user account instead of a guest session).

**Q: Can I schedule an event to automatically activate?**  
A: Not currently. You must manually activate events by checking the "Is Active" box. The date range only determines when the event is valid, not when it activates.

**Q: How long should I make the date range?**  
A: Make it match your actual event duration. Note that `endDate` must be strictly after `startDate` (same-day values are not allowed). For multi-day events, span the full date range.

**Q: Can I edit an active event?**  
A: Yes, but be careful. Changes take effect immediately. Avoid changing dates while the event is in progress.

**Q: Is there a limit to how many events I can create?**  
A: No limit, but keep your list manageable. Archive old events by deleting them if you don't need the attendance records.

**Q: Does this work on mobile devices?**  
A: Yes, open events work on all devices. Guests can access from smartphones, tablets, or computers.

---

## Developer Reference

### API Endpoints

- `GET /api/admin/open-events/:id/attendance/summary` — Aggregated statistics
- `GET /api/admin/open-events/:id/attendance/daily` — Daily breakdown with pagination
- `GET /api/admin/open-events/:id/attendance/export` — Streamed CSV export

### Key File Locations

- **Database Schema:** `prisma/schema.prisma`
- **Admin Component:** `src/components/admin/OpenEventManager.tsx`
- **Tracking Component:** `src/components/OpenEventAttendanceTracker.tsx`
- **Admin Auth Helper:** `src/lib/adminAuth.ts`
- **API Routes:**
  - Management: `src/app/api/open-events/[id]/route.ts`
  - Record Attendance: `src/app/api/open-events/attendance/route.ts`
  - Summary: `src/app/api/admin/open-events/[id]/attendance/summary/route.ts`
  - Daily: `src/app/api/admin/open-events/[id]/attendance/daily/route.ts`
  - Export: `src/app/api/admin/open-events/[id]/attendance/export/route.ts`

---

## Support

If you encounter issues with Open Events or have questions not covered in this guide, please contact your technical administrator or developer.

For feature requests or enhancements, please submit a ticket or request to your development team.
