import { prompter as commitlintPrompter } from '@commitlint/cz-commitlint'
import load from '@commitlint/load'

/**
 * @commitlint/cz-commitlint shows type emojis in the list but does not prefix the header.
 * When `emojiInHeader` is set, prepend the type emoji so git log matches ✨ feat: …
 */
export function prompter(cz, commit) {
  return commitlintPrompter(cz, async (message) => {
    const { prompt } = await load()
    const typeQuestion = prompt?.questions?.type
    const typeKey = message.split('\n')[0]?.match(/^(\w+)/)?.[1]
    const emoji = typeKey ? typeQuestion?.enum?.[typeKey]?.emoji : undefined
    const withEmoji = typeQuestion?.emojiInHeader && emoji ? `${emoji}${message}` : message
    commit(withEmoji)
  })
}
