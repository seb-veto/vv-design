import { createI18n } from '@nanostores/i18n'
import { useStore } from '@nanostores/vue'

import { locale, type Locale } from '@open-pencil/vue/i18n'

const i18n = createI18n<Locale, 'en'>(locale, { baseLocale: 'en', get: async () => ({}) })
const messages = i18n('designMenu', {
  mainMenu: 'Main menu',
  tools: 'Tools',
  toolsTip: 'Browse design tools',
  toolsHelp: 'Show design tools. Enter or Space activates.',
  builtInTools: 'Built-in tools',
  searchTools: 'Search tools',
  codeTool: 'Code',
  codeToolDescription: 'Inspect and edit code for your selection.',
  codeToolHelp: 'Open selection code in the right sidebar. Enter or Space activates.',
  checkTool: 'Design check',
  checkToolDescription: 'Find and fix issues on this page.',
  checkToolHelp: 'Open page checks in the right sidebar. Enter or Space activates.',
  noMatchingTools: 'No matching tools',
  menuHelp: 'Open commands with Enter or Space. Press Escape to close.',
  fileHelp: 'Open file actions with Enter or Space.',
  renameHelp: 'Enter saves the name. Escape cancels.',
  fileMenu: 'File actions',
  renameFile: 'Rename file',
  renameFailed: 'Could not rename this design. The previous name was kept.',
  drafts: 'Drafts',
  recents: 'Recents',
  localFiles: 'Local files',
  searchFiles: 'Search files',
  refreshFiles: 'Refresh files',
  refreshHelp: 'Refresh saved designs. Enter or Space activates.',
  loadingFiles: 'Loading designs…',
  importHelp: 'Choose a design file. Enter or Space activates.',
  recentsHelp: 'Show recently opened designs. Enter or Space activates.',
  draftsHelp: 'Browse saved designs. Enter or Space activates.',
  browseDrafts: 'Browse drafts',
  openHelp: 'Open this design. Enter or Space activates.',
  newHelp: 'Create an editable design. Enter or Space activates.',
  noDrafts: 'No saved designs yet',
  noRecents: 'No recently opened designs',
  savedLocally: 'Saved on this device',
  loadFailed: 'Could not load saved designs.',
  openFailed: 'Could not open this design.'
})

export function useDesignMenuMessages() {
  return useStore(messages)
}
