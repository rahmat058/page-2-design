interface Props {
  value: number | string
}

export function CountBadge({ value }: Props) {
  return <span className="count-badge">{value}</span>
}
