/**
 * Toast host that renders the current message from useToastStore.
 */
import { useToastStore } from '../toast'

export function Toast() {
  const message = useToastStore((s) => s.message)
  const token = useToastStore((s) => s.token)
  if (!message) return null
  return (
    <div key={token} className="toast" role="status">
      {message}
    </div>
  )
}
