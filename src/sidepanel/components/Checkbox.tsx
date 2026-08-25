/**
 * Labeled checkbox control for scan options and export selection.
 */
import type { InputHTMLAttributes, ReactNode } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  wide?: boolean
}

export function Checkbox({ label, wide, className, id, ...props }: Props) {
  const classes = ['ui-check', wide ? 'ui-check-wide' : '', className].filter(Boolean).join(' ')

  return (
    <label className={classes}>
      <input id={id} type="checkbox" className="ui-check-input" {...props} />
      <span className="ui-check-box" aria-hidden="true" />
      <span className="ui-check-label">{label}</span>
    </label>
  )
}
