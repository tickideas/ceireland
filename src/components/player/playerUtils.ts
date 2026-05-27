export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatCountdown(
  targetIso: string | null,
  now: Date = new Date(),
): { text: string; ended: boolean } {
  if (!targetIso) return { text: '', ended: false }

  const target = new Date(targetIso)
  const targetTime = target.getTime()

  if (Number.isNaN(targetTime)) return { text: '', ended: false }

  const diff = targetTime - now.getTime()

  if (diff <= 0) return { text: 'Starting now', ended: true }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (totalSeconds < 60) {
    return { text: `${seconds}s`, ended: false }
  }

  return { text: `${days}d ${hours}h ${minutes}m`, ended: false }
}

export function getPlayerPoster(
  posterUrl: string | null | undefined,
  fallbackPoster: string | undefined,
): string {
  return posterUrl && posterUrl.trim().length > 0 ? posterUrl : (fallbackPoster || '/poster.jpg')
}
