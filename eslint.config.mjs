import cds from '@sap/cds/eslint.config.mjs'
import globals from 'globals'

export default [
  {
    ignores: [
      '**/.vitepress/dist/**',
      '**/.vitepress/cache/**',
      '**/.github/**'
    ],
  },
  ...cds.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      globals: {
        ...globals.browser
      }
    }
  }
]
