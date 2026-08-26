/**
 * Scan phases that should disable primary actions (scan / export affordances).
 */
export const BUSY_PHASES = ['preparing', 'lazy-loading', 'scanning', 'normalizing', 'validating', 'exporting'] as const

export function isBusyPhase(phase: string): boolean {
  return (BUSY_PHASES as readonly string[]).includes(phase)
}
