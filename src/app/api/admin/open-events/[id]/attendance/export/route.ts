import { z } from 'zod'
import { adminRoute } from '@/lib/adminRoute'
import * as openEvents from '@/lib/openEvents'

const idParams = z.object({ id: z.string().min(1) })

export const GET = adminRoute({ params: idParams }, async ({ params: { id } }) => {
  // Resolve the event title up front so the filename is set before streaming begins.
  const summary = await openEvents.summary(id)
  const eventSlug = summary.event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `attendance_${eventSlug}_${dateStr}.csv`

  const encoder = new TextEncoder()
  const iter = openEvents.exportCsvStream(id)
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of iter) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Transfer-Encoding': 'chunked',
    },
  })
})
