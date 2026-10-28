import { createI18n } from '@nanostores/i18n'
import { useStore } from '@nanostores/vue'

import { locale, type Locale } from '@open-pencil/vue/i18n'

const i18n = createI18n<Locale, 'en'>(locale, { baseLocale: 'en', get: async () => ({}) })
const messages = i18n('designMenu', {
  mainMenu: 'Main menu',
  menuHelp: 'Open commands with Enter or Space. Press Escape to close.',
  fileHelp: 'Open file actions with Enter or Space.',
  renameHelp: 'Enter saves the name. Escape cancels.',
  fileMenu: 'File actions',
  renameFile: 'Rename file',
  drafts: 'Drafts'
})

export function useDesignMenuMessages() {
  return useStore(messages)
}
