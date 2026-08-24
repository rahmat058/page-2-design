import type { ReactNode } from 'react'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  id?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, id, disabled }: Props) {
  return (
    <label className={disabled ? 'ui-switch is-disabled' : 'ui-switch'}>
      {label ? <span className="ui-switch-label">{label}</span> : null}
      <input
        id={id}
        type="checkbox"
        className="ui-switch-input"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="ui-switch-track" aria-hidden="true">
        <span className="ui-switch-thumb" />
      </span>
    </label>
  )
}
