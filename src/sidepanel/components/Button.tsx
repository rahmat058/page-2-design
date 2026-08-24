import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: LucideIcon
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  const classes = ['ui-btn', `ui-btn-${variant}`, size === 'sm' ? 'ui-btn-sm' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {Icon ? <Icon className="ui-btn-icon" size={size === 'sm' ? 16 : 18} strokeWidth={2} aria-hidden="true" /> : null}
      <span className="ui-btn-label">{children}</span>
    </button>
  )
}
