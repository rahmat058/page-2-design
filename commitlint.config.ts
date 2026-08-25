import { type UserConfig } from '@commitlint/types'

export default {
  // Use the conventional commit rules as a base.
  extends: ['@commitlint/config-conventional'],
  rules: {
    'references-empty': [2, 'never'],
  },
  parserPreset: {
    parserOpts: {
      issuePrefixes: ['PROJ-'],
    },
  },
  prompt: {
    questions: {
      type: {
        description: 'Select the type of change',
        enum: {
          feat: {
            description: 'A new feature',
            emoji: '✨ ',
          },
          fix: {
            description: 'A bug fix',
            emoji: '🐛 ',
          },
          docs: {
            description: 'Documentation only (README, architecture, license, contributing, changelog, code of conduct)',
            emoji: '📚 ',
          },
          style: {
            description: 'Formatting only (no logic change)',
            emoji: '💎 ',
          },
          refactor: {
            description: 'A change that neither fixes a bug nor adds a feature',
            emoji: '📦 ',
          },
          perf: {
            description: 'A performance improvement',
            emoji: '🚀 ',
          },
          test: {
            description: 'Adding or correcting tests',
            emoji: '🚨 ',
          },
          build: {
            description: 'Build system or dependency change',
            emoji: '🛠️ ',
          },
          ci: {
            description: 'CI, Husky, lint-staged, or Commitlint',
            emoji: '⚙️ ',
          },
          chore: {
            description: 'Other maintenance',
            emoji: '♻️ ',
          },
          revert: {
            description: 'Revert a previous commit',
            emoji: '🗑️ ',
          },
        },
      },
    },
  },
} satisfies UserConfig
