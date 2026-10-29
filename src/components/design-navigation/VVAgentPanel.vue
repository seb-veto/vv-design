<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { usePanelOcclusion } from '@/app/shell/panel-occlusion'
import { activeTab, getTabForStore } from '@/app/tabs'

const store = useEditorStore()
const documentId = getTabForStore(store)?.id
const panel = ref<HTMLElement>()
let parentOrigin: string | null = null
const failure = ref(false)

function publish() {
  if (!parentOrigin || !panel.value) return
  // Hidden document tabs may resize too; only the active document owns the host pane.
  if (!documentId) return
  if (activeTab.value?.store !== store) {
    window.parent.postMessage(
      { type: 'vv-design:agents', visible: false, documentId },
      parentOrigin
    )
    return
  }
  const bounds = panel.value.getBoundingClientRect()
  const { x, y, width, height } = bounds
  const obscured = panelOccluded(bounds)
  window.parent.postMessage(
    {
      type: 'vv-design:agents',
      visible: width > 0 && height > 0,
      documentId,
      x,
      y,
      width,
      height,
      obscured,
      documentName: store.state.documentName.slice(0, 512),
      pageId: store.state.currentPageId,
      pageName: (store.graph.getNode(store.state.currentPageId)?.name ?? '').slice(0, 512)
    },
    parentOrigin
  )
}
const panelOccluded = usePanelOcclusion(publish)
useResizeObserver(panel, publish)
useEventListener(window, 'resize', publish)

watch(
  () => [
    activeTab.value?.id,
    store.state.documentName,
    store.state.currentPageId,
    store.state.sceneVersion
  ],
  publish,
  { flush: 'post' }
)
onMounted(async () => {
  try {
    const response = await fetch('/__vv-design/runtime', { cache: 'no-store' })
    if (!response.ok) throw new Error('VV is unavailable')
    const session: unknown = await response.json()
    if (
      !session ||
      typeof session !== 'object' ||
      !('parentOrigin' in session) ||
      typeof session.parentOrigin !== 'string'
    )
      throw new Error('Invalid VV host')
    const origin = new URL(session.parentOrigin)
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Invalid VV host')
    parentOrigin = origin.origin
    publish()
  } catch (error) {
    failure.value = true
    console.error('[Design] Could not attach BB agents:', error)
  }
})
onUnmounted(() => {
  if (parentOrigin && documentId) {
    window.parent.postMessage(
      { type: 'vv-design:agents', visible: false, documentId },
      parentOrigin
    )
  }
})
</script>

<template>
  <div ref="panel" class="min-h-0 flex-1" aria-label="BB agents connection">
    <p v-if="failure" role="alert" class="p-4 text-xs text-muted">
      Could not connect to BB agents.
    </p>
  </div>
</template>
