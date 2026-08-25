import { type UserConfig } from '@commitlint/types'

/** Trailing space after each emoji keeps the commitizen type list aligned in VS Code. */
const TYPE_ENUM = {
  feat: {
    description: 'A new feature',
    title: 'Features',
    emoji: '✨ ',
  },
  fix: {
    description: 'A bug fix',
    title: 'Bug Fixes',
    emoji: '🐛 ',
  },
  docs: {
    description: 'Documentation only (README, architecture, license, contributing, changelog, code of conduct)',
    title: 'Documentation',
    emoji: '📚 ',
  },
  style: {
    description: 'Formatting only (no logic change)',
    title: 'Styles',
    emoji: '💎 ',
  },
  refactor: {
    description: 'A change that neither fixes a bug nor adds a feature',
    title: 'Code Refactoring',
    emoji: '📦 ',
  },
  perf: {
    description: 'A performance improvement',
    title: 'Performance Improvements',
    emoji: '🚀 ',
  },
  test: {
    description: 'Adding or correcting tests',
    title: 'Tests',
    emoji: '🚨 ',
  },
  build: {
    description: 'Build system or dependency change',
    emoji: '🛠️ ',
    title: 'Builds',
  },
  ci: {
    description: 'CI, Husky, lint-staged, or Commitlint',
    emoji: '⚙️ ',
    title: 'Continuous Integrations',
  },
  chore: {
    description: 'Other maintenance',
    emoji: '♻️ ',
    title: 'Chores',
  },
  revert: {
    description: 'Revert a previous commit',
    emoji: '🗑️ ',
    title: 'Reverts',
  },
} as const

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const emojiRegexPart = Object.values(TYPE_ENUM)
  .map((item) => escapeRegex(item.emoji.trim()))
  .join('|')

/** Must be a plain object (not a Promise) or @commitlint/config-conventional overwrites it. */
const parserOpts = {
  headerPattern: new RegExp(`^(?:${emojiRegexPart})?\\s*(\\w*)(?:\\((.*)\\))?!?: (.*)$`, 'u'),
  breakingHeaderPattern: new RegExp(`^(?:${emojiRegexPart})?\\s*(\\w*)(?:\\((.*)\\))?!: (.*)$`, 'u'),
  headerCorrespondence: ['type', 'scope', 'subject'],
  noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
  revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
  revertCorrespondence: ['header', 'hash'],
  issuePrefixes: ['#'],
}

const config = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    name: 'conventional-changelog-conventionalcommits',
    parserOpts,
  },
  prompt: {
    settings: {
      useExclamationMark: true,
    },
    questions: {
      type: {
        description: 'Select the type of change that you are committing',
        emojiInHeader: true,
        enum: TYPE_ENUM,
      },
      scope: {
        description: 'What is the scope of this change (e.g. sidepanel, scan, export)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Describe the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Describe the commit itself',
      },
      issues: {
        description: 'Add issue references (for example "fix #123", "re #123")',
      },
    },
  },
} satisfies UserConfig

export default config
