/**
 * Clipboard copy control for token / text rows.
 */
interface Props {
  value: string
  label: string
}

export function CopyButton({ value, label }: Props) {
  return (
    <button type="button" className="copy" onClick={() => void navigator.clipboard.writeText(value)}>
      {label}
    </button>
  )
}
