/**
 * Small numeric badge shown next to page headings and collection titles.
 */

interface Props {
  value: number | string
}

export function CountBadge({ value }: Props) {
  return <span className="count-badge">{value}</span>
}
