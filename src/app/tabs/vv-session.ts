import { useLocalStorage } from '@vueuse/core'
import { noop } from 'es-toolkit/function'
import { watch } from 'vue'

import { vvFileHeaders, vvFileURL } from '@/app/document/io/vv'
import { openBrowserFileFromURL } from '@/app/shell/menu/files'
import { activeTab, getTabsSnapshot, switchTab } from '@/app/tabs'
import { IS_VV_DESIGN } from '@/constants'

const key = 'vv-design:open-files'

export function readVVSession(value: string | null): { files: string[]; active: string | null } {
  if (!value) return { files: [], active: null }
  const parsed: unknown = JSON.parse(value)
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('files' in parsed) ||
    !Array.isArray(parsed.files) ||
    !parsed.files.every((path: unknown) => typeof path === 'string' && vvFileURL(path))
  ) {
    throw new Error('Invalid saved Design session')
  }
  const files = [...new Set(parsed.files as string[])]
  const active =
    'active' in parsed && typeof parsed.active === 'string' && files.includes(parsed.active)
      ? parsed.active
      : null
  return { files, active }
}

/** Reopen saved files; unsaved edits still use the editor's existing recovery dialog. */
export async function restoreVVSession(): Promise<() => void> {
  if (!IS_VV_DESIGN) return noop
  const persisted = useLocalStorage(key, '', { writeDefaults: false })
  const session = readVVSession(persisted.value)
  for (const path of session.files) {
    await openBrowserFileFromURL(new URL(path), { headers: await vvFileHeaders() })
  }
  const selected = session.active
    ? getTabsSnapshot().find((tab) => tab.store.getDocumentFilePath() === session.active)
    : undefined
  if (selected) switchTab(selected.id)
  return watch(
    () => ({
      files: getTabsSnapshot().flatMap((tab) => {
        const path = tab.store.getDocumentFilePath()
        return path && vvFileURL(path) ? [path] : []
      }),
      active: activeTab.value?.store.getDocumentFilePath() ?? null
    }),
    (session) => {
      try {
        persisted.value = JSON.stringify(session)
      } catch (error) {
        console.warn('[Design] Could not remember open files:', error)
      }
    },
    { immediate: true }
  )
}
