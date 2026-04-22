'use client'

interface FluxoLogoProps {
  size?: number
  className?: string
  showText?: boolean
}

export function FluxoLogo({ size = 32, className = '', showText = false }: FluxoLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <rect x="8" y="8" width="240" height="240" rx="48" fill="#ffffff" />
        <line x1="96" y1="48" x2="96" y2="208" stroke="#0F5C4D" strokeWidth="10" strokeLinecap="round" />
        <path d="M96 88 Q150 70 180 88" fill="none" stroke="#2FA37C" strokeWidth="10" strokeLinecap="round" />
        <path d="M96 140 Q150 122 180 140" fill="none" stroke="#2FA37C" strokeWidth="10" strokeLinecap="round" />
      </svg>
      {showText && (
        <span className="font-semibold text-gray-900" style={{ fontSize: size * 0.55 }}>
          Fluxo
        </span>
      )}
    </div>
  )
}
