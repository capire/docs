import cds from '@sap/cds/eslint.config.mjs'
import vue from 'eslint-plugin-vue'
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
  ...vue.configs['flat/essential'],
  {
    files: ['*.vue', '**/*.vue', '**/*.js'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'vue/multi-word-component-names': 0,
      'vue/no-v-text-v-html-on-component': 0
    }
  }
]
