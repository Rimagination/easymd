interface MarkdownStyleIconProps {
  className?: string
}

function MarkdownStyleIcon({ className }: MarkdownStyleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <path d="M6 5.5h8l4 4V20H6z" />
      <path d="M14 5.5V10h4" />
      <path d="M9 10.5h2.5" />
      <path d="M9 14h6" />
      <path d="M9 17h4" />
      <path d="M4 8.5v9" />
    </svg>
  )
}

export default MarkdownStyleIcon
