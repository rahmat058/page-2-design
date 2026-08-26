/**
 * Clipboard helpers for panel content actions.
 */
import { copyContentPlain, groupContentBySection, panelContentBlocks } from '../content-groups'
import { useScanStore } from '../store/useScanStore'
import { useToastStore } from '../toast'

export async function copyAllContent(): Promise<void> {
  const design = useScanStore.getState().design
  if (!design) return
  const groups = groupContentBySection(panelContentBlocks(design.content), design.sections)
  await navigator.clipboard.writeText(copyContentPlain(groups))
  useToastStore.getState().showToast('All content copied')
}
