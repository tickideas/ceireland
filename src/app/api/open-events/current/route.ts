import { NextResponse } from 'next/server'
import * as openEvents from '@/lib/openEvents'

export async function GET() {
  try {
    const activeEvent = await openEvents.getCurrentLive()
    return NextResponse.json({
      hasActiveEvent: !!activeEvent,
      activeEvent,
    })
  } catch (error) {
    console.error('Check open event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
