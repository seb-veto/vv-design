<script setup lang="ts">
import { useActiveElement, useElementSize, useObjectUrl } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import {
  prototypeActiveInteractions,
  prototypeConnection,
  prototypeHotspots,
  prototypeStart,
  prototypeFrames,
  type PrototypeHotspot
} from '@open-pencil/core'
import { computeContentBounds } from '@open-pencil/core/io/formats/raster'

import { useEditorStore } from '@/app/editor/active-store'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppDialog from '@/components/ui/dialog/AppDialog.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

const emit = defineEmits<{ close: [] }>()
const returnFocus = useActiveElement<HTMLElement>().value
const store = useEditorStore()
const messages = useDesignMenuMessages()
const start = prototypeStart(store.graph, store.state.currentPageId)?.id ?? null
const currentId = ref(start)
const history = ref<string[]>([])
const stage = ref<HTMLElement>()
const { width, height } = useElementSize(stage)
const blob = shallowRef<Blob | null>(null)
const url = useObjectUrl(blob)
const loading = ref(false)
const failed = ref(false)
const current = computed(() => (currentId.value ? store.graph.getNode(currentId.value) : null))
const bounds = computed(() => {
  void store.state.sceneVersion
  return currentId.value ? computeContentBounds(store.graph, [currentId.value]) : null
})
const dimensions = computed(() => ({
  width: bounds.value ? bounds.value.maxX - bounds.value.minX : 0,
  height: bounds.value ? bounds.value.maxY - bounds.value.minY : 0
}))
const size = computed(() => {
  const scale = Math.min(
    width.value / dimensions.value.width,
    height.value / dimensions.value.height
  )
  return {
    width: `${dimensions.value.width * scale}px`,
    height: `${dimensions.value.height * scale}px`
  }
})
const hotspots = computed(() => {
  void store.state.sceneVersion
  return currentId.value ? prototypeHotspots(store.graph, currentId.value) : []
})
const unsupported = computed(() => {
  void store.state.sceneVersion
  const destinations = new Set(
    prototypeFrames(store.graph, store.state.currentPageId).map((frame) => frame.id)
  )
  const visit = (id: string): boolean => {
    const node = store.graph.getNode(id)
    return (
      !!node &&
      (prototypeActiveInteractions(node).some((entry) => {
        const connection = prototypeConnection(entry)
        return !connection || !destinations.has(connection.destinationId)
      }) ||
        store.graph.getChildren(id).some((child) => visit(child.id)))
    )
  }
  return !!currentId.value && visit(currentId.value)
})
function hotspotStyle(hotspot: PrototypeHotspot) {
  const box = bounds.value
  if (!box) return {}
  const points = hotspot.polygon.map(
    (point) =>
      `${(100 * (point.x - box.minX)) / dimensions.value.width}% ${(100 * (point.y - box.minY)) / dimensions.value.height}%`
  )
  return { clipPath: `polygon(${points.join(',')})` }
}
function navigate(id: string) {
  if (!currentId.value || !store.graph.getNode(id)) return
  history.value.push(currentId.value)
  currentId.value = id
}
function back() {
  const previous = history.value.pop()
  if (previous) currentId.value = previous
}
function restart() {
  history.value = []
  currentId.value = start
}
let rendering = 0
async function render() {
  const version = ++rendering
  blob.value = null
  failed.value = false
  const id = currentId.value
  const { width: w, height: h } = dimensions.value
  if (!id) return
  if (![w, h].every((value) => Number.isFinite(value) && value > 0)) {
    failed.value = true
    return
  }
  loading.value = true
  try {
    // shortcut: previews cap at 1600px; use zoom-aware rendering for larger presentation views.
    const bytes = await store.renderExportImage([id], Math.min(4, 1600 / Math.max(w, h)), 'PNG')
    if (version !== rendering) return
    if (!bytes) throw new Error('Frame could not be rendered')
    blob.value = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
  } catch {
    if (version === rendering) failed.value = true
  } finally {
    if (version === rendering) loading.value = false
  }
}
watch([currentId, () => store.state.sceneVersion], () => void render(), { immediate: true })
watch(() => store.state.play?.revision, restart)
onBeforeUnmount(() => {
  rendering++
  void nextTick(() => {
    if (returnFocus?.isConnected) returnFocus.focus()
  })
})
</script>

<template>
  <AppDialog
    :open="true"
    @close-auto-focus.prevent
    size="screen"
    height="screen"
    :heading="messages.prototype"
    :description="messages.previewHelp"
    :close-label="messages.closePreview"
    :ui="{ body: 'flex flex-col gap-2 bg-canvas' }"
    @update:open="!$event && emit('close')"
  >
    <p role="status" class="text-center text-xs text-muted">
      {{ current?.name ?? messages.addFrames }}
    </p>
    <p v-if="unsupported" class="text-center text-xs text-muted">
      {{ messages.unsupportedPreview }}
    </p>
    <p v-if="loading" role="status" class="text-center text-xs">{{ messages.loadingPreview }}</p>
    <p v-if="failed" role="alert" class="text-center text-xs text-error">
      {{ messages.previewFailed }}
    </p>
    <div ref="stage" class="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <div v-if="url && bounds" class="relative shrink-0" :style="size">
        <img :src="url" :alt="current?.name" class="block size-full" />
        <Tip
          v-for="hotspot in hotspots"
          :key="hotspot.nodeId"
          :label="messages.hotspotTip"
          as-child
        >
          <button
            type="button"
            class="absolute inset-0 size-full cursor-pointer border-none bg-transparent outline-none focus-visible:bg-primary/20"
            :style="hotspotStyle(hotspot)"
            :aria-label="`${hotspot.name} → ${store.graph.getNode(hotspot.destinationId)?.name}`"
            :aria-description="messages.hotspotHelp"
            @click="navigate(hotspot.destinationId)"
          />
        </Tip>
      </div>
    </div>
    <template #footer>
      <Tip :label="messages.prototypeBack" as-child>
        <AppButton
          variant="outline"
          :disabled="!history.length"
          :aria-description="messages.backHelp"
          @click="back"
          >{{ messages.prototypeBack }}</AppButton
        >
      </Tip>
      <Tip :label="messages.restart" as-child>
        <AppButton
          variant="outline"
          :disabled="!start"
          :aria-description="messages.restartHelp"
          @click="restart"
          >{{ messages.restart }}</AppButton
        >
      </Tip>
    </template>
  </AppDialog>
</template>
