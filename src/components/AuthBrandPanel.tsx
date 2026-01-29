'use client'

interface AuthBrandPanelProps {
  bgUrl?: string | null
  logoUrl?: string | null
  appName: string
  welcomeHeading: string
  tagline: string
  footerText: string
  heroPrefix?: string
}

export function AuthBrandPanel({
  bgUrl,
  logoUrl,
  appName,
  welcomeHeading,
  tagline,
  footerText,
  heroPrefix = 'Welcome to',
}: AuthBrandPanelProps) {
  return (
    <div
      className="hidden lg:flex lg:w-[52%] relative overflow-hidden"
      style={{
        background: bgUrl
          ? `url(${bgUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, var(--auth-navy) 0%, var(--auth-blue) 50%, var(--auth-navy-light) 100%)`,
      }}
    >
      {bgUrl && <div className="absolute inset-0 bg-[var(--auth-navy)]/80" />}

      {/* Abstract decorative elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Large glowing orb top-right */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full auth-animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
          }}
        />
        {/* Small glowing orb bottom-left */}
        <div
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full auth-animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(30,58,95,0.4) 0%, transparent 70%)',
            animationDelay: '3s',
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Diagonal gold accent line */}
        <div
          className="absolute top-0 right-[40%] w-px h-full opacity-10"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--auth-gold), transparent)',
            transform: 'rotate(15deg)',
            transformOrigin: 'top center',
          }}
        />
      </div>

      {/* Brand content */}
      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
        {/* Top: Logo area */}
        <div className="auth-animate-fade-up auth-stagger-1">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--auth-gold), var(--auth-gold-light))' }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L12 22" />
                  <path d="M5 8L19 8" />
                </svg>
              </div>
            )}
            <span className="text-white/80 text-sm font-medium tracking-wide uppercase">{appName}</span>
          </div>
        </div>

        {/* Center: Hero text */}
        <div className="space-y-6">
          <div className="auth-animate-fade-up auth-stagger-2">
            <div className="auth-shimmer h-0.5 w-16 rounded-full mb-8" />
            <h1 className="text-4xl xl:text-5xl leading-tight text-white font-[var(--font-dm-serif)]">
              {heroPrefix}
              <br />
              <span style={{ color: 'var(--auth-gold)' }}>{welcomeHeading}</span>
            </h1>
          </div>
          <p className="text-white/50 text-lg max-w-md leading-relaxed auth-animate-fade-up auth-stagger-3">
            {tagline}
          </p>
        </div>

        {/* Bottom: Decorative footer */}
        <div className="auth-animate-fade-up auth-stagger-4">
          <div className="flex items-center gap-4 text-white/30 text-sm">
            <div className="h-px flex-1 bg-white/10" />
            <span className="tracking-widest uppercase text-xs">{footerText}</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
