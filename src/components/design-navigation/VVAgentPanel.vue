<script setup lang="ts">
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
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
  const { x, y, width, height } = panel.value.getBoundingClientRect()
  window.parent.postMessage(
    {
      type: 'vv-design:agents',
      visible: width > 0 && height > 0,
      documentId,
      x,
      y,
      width,
      height,
      documentName: store.state.documentName
    },
    parentOrigin
  )
}
useResizeObserver(panel, publish)
useEventListener(window, 'resize', publish)
watch(() => [activeTab.value?.id, store.state.documentName], publish, { flush: 'post' })
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
