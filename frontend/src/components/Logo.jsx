export default function Logo({ size = 36, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      {/* Rounded square */}
      <rect width="120" height="120" rx="28" fill="#4A7049" />

      {/* Location pin silhouette */}
      <path
        d="M60 18C43.4 18 30 30.8 30 46.6C30 68 60 102 60 102C60 102 90 68 90 46.6C90 30.8 76.6 18 60 18Z"
        fill="#5C8A5C"
        opacity="0.3"
      />

      {/* Heartbeat pulse */}
      <path
        d="M28 58 L42 58 L47 48 L53 68 L59 38 L65 72 L71 45 L76 58 L92 58"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Compass dot */}
      <circle cx="60" cy="34" r="5" fill="white" opacity="0.9" />

      {/* Directional ticks */}
      <line x1="60" y1="26" x2="60" y2="28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="68" y1="34" x2="66" y2="34" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="52" y1="34" x2="54" y2="34" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
