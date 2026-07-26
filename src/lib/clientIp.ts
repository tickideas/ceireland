/**
 * Client IP resolution for rate limiting.
 *
 * `x-forwarded-for` is a client-supplied header that our reverse proxy appends
 * to. Anything to the LEFT of the entries our own proxies added is attacker
 * controlled, so reading the leftmost entry lets a caller rotate the header and
 * bypass IP-based limits entirely. We therefore count from the right, skipping
 * one entry per trusted proxy hop.
 *
 * Default is 1 hop (Traefik/Dokploy). Set TRUSTED_PROXY_HOPS=2 when running
 * behind an additional proxy such as Cloudflare.
 */

const DEFAULT_TRUSTED_PROXY_HOPS = 1

function trustedProxyHops(): number {
  const configured = Number(process.env.TRUSTED_PROXY_HOPS)
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_TRUSTED_PROXY_HOPS
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    const chain = forwardedFor
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)

    const candidate = chain[chain.length - trustedProxyHops()]
    if (candidate) {
      return candidate
    }

    // Fewer entries than configured hops means the chain was truncated or
    // misconfigured. Fall back to the leftmost real value rather than trusting
    // an out-of-range index.
    if (chain.length > 0) {
      return chain[0]
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) {
    return realIp
  }

  return 'unknown'
}
