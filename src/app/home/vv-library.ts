import { useEventListener, useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'
import { computed, watch } from 'vue'

import { extractFigThumbnailFromReader } from '@open-pencil/fig'
import { imageHeader } from '@open-pencil/scene-graph/images'
import { useDocumentWorkspace } from '@open-pencil/vue/document/workspace'

import { MAX_REMOTE_DOCUMENT_BYTES, readBoundedBody } from '@/app/document/io/browser'
import { vvDocumentPath, vvDocumentURL, vvFileHeaders } from '@/app/document/io/vv'
import { openBrowserFileFromURL } from '@/app/shell/menu/files'
import { activeTab, getTabsSnapshot, switchTab } from '@/app/tabs'

const documentSchema = v.object({
  id: v.pipe(
    v.string(),
    v.minLength(1),
    v.check(
      (id) =>
        !id.startsWith('/') &&
        !id.includes('\0') &&
        id.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
    )
  ),
  path: v.pipe(v.string(), v.minLength(1)),
  name: v.string(),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
  size: v.pipe(v.number(), v.minValue(0), v.finite())
})
export type VVDocument = v.InferOutput<typeof documentSchema>

export function useVVLibrary() {
  const viewed = useLocalStorage<Record<string, number>>('vv-design:viewed-files', {})
  let catalog: VVDocument[] = []
  const workspace = useDocumentWorkspace<VVDocument>({
    previewConcurrency: 2,
    source: {
      async refresh() {
        const controller = new AbortController()
        const response = await fetch('/__vv-design/files', {
          headers: await vvFileHeaders(),
          signal: controller.signal,
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('Could not load saved designs')
        const bytes = await readBoundedBody(response, 8 * 1024 * 1024, {
          onExceeded: () => controller.abort()
        })
        catalog = v.parse(
          v.pipe(v.array(documentSchema), v.maxLength(10000)),
          JSON.parse(new TextDecoder().decode(bytes))
        )
        return catalog
      },
      async loadPreview(id) {
        const document = catalog.find((item) => item.id === id)
        if (!document || document.size > MAX_REMOTE_DOCUMENT_BYTES) return null
        const controller = new AbortController()
        const response = await fetch(vvDocumentURL(document.id), {
          headers: await vvFileHeaders(),
          signal: controller.signal,
          cache: 'no-store'
        })
        if (!response.ok) throw new Error('Preview unavailable')
        const bytes = await readBoundedBody(response, MAX_REMOTE_DOCUMENT_BYTES, {
          onExceeded: () => controller.abort()
        })
        const png = await extractFigThumbnailFromReader({
          size: bytes.byteLength,
          read: async (start, end) => bytes.subarray(start, end)
        })
        const header = png ? imageHeader(png) : null
        // Preview decoding has a separate pixel budget from the document file size.
        return header && header.width <= 4096 && header.height <= 4096 ? png : null
      }
    }
  })
  watch(
    () => activeTab.value?.store.getDocumentFilePath(),
    (url) => {
      const path = vvDocumentPath(url ?? null)
      if (path) viewed.value = { ...viewed.value, [path]: Date.now() }
    },
    { immediate: true }
  )
  watch(
    () => activeTab.value?.kind,
    (kind) => {
      if (kind === 'home') void workspace.invalidate()
    }
  )
  useEventListener(window, 'vv-design:file-saved', () => {
    if (activeTab.value?.kind === 'home') void workspace.invalidate()
  })
  const openedAt = (document: VVDocument) =>
    Math.max(viewed.value?.[document.id] ?? 0, viewed.value?.[document.path] ?? 0)
  const recents = computed(() =>
    workspace.documents.value
      .filter((document) => openedAt(document) > 0)
      .sort((a, b) => openedAt(b) - openedAt(a))
  )

  async function open(document: VVDocument) {
    const existing = getTabsSnapshot().find((tab) => {
      const path = vvDocumentPath(tab.store.getDocumentFilePath())
      return path === document.id || path === document.path
    })
    if (existing && switchTab(existing.id)) return
    await openBrowserFileFromURL(vvDocumentURL(document.id), { headers: await vvFileHeaders() })
  }
  return { workspace, recents, open }
}
