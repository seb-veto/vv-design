<script setup lang="ts">
/* eslint-disable open-pencil/no-raw-svg-in-app-vue-templates -- Procedural canvas connections are editable geometry, not icons. */
import { PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

import {
  getNodeEditCapability,
  canAddPrototypeConnection,
  prototypeActiveInteractions,
  prototypeConnection,
  prototypeFrame,
  prototypeFrames,
  prototypeHotspots
} from '@open-pencil/core'
import { createSceneGeometry, type ViewportTransform } from '@open-pencil/core/geometry'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { useEditorStore } from '@/app/editor/active-store'
import {
  prototypeAnchor,
  prototypeCurve,
  prototypeDestinationAt,
  prototypeLayerVisible,
  prototypeLinkGeometry
} from '@/app/editor/prototype/connections'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import { toast } from '@/app/shell/ui'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import Tip from '@/components/ui/overlay/Tip.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const {
  canvas,
  view,
  drawn = null
} = defineProps<{
  canvas: HTMLCanvasElement | null
  view: ViewportTransform & { currentPageId: string }
  drawn?: ViewportTransform | null
}>()
const store = useEditorStore()
const messages = useDesignMenuMessages()
const placement = computed(() => drawn ?? view)
const marker = useId()
const handle = ref<HTMLButtonElement>()
const pickerOpen = ref(false)
const popup = usePopoverUI({ content: 'w-56 p-3' })
interface ConnectionDrag {
  sourceId: string
  connectionId?: string
  pointerId: number
  start: Vector
  at: Vector
  moved: boolean
}
const drag = ref<ConnectionDrag | null>(null)
let dropped = false
const selected = computed(() => {
  void store.state.sceneVersion
  const ids = [...store.state.selectedIds]
  const node = ids.length === 1 ? store.graph.getNode(ids[0]) : null
  return node && prototypeFrame(store.graph, node.id) && prototypeLayerVisible(store.graph, node)
    ? node
    : null
})
const connection = computed(() => {
  void store.state.sceneVersion
  return selected.value
    ? prototypeActiveInteractions(selected.value)
        .map(prototypeConnection)
        .find((entry) => entry !== null)
    : null
})
const editable = computed(() => {
  void store.state.sceneVersion
  return (
    !!selected.value &&
    !store.state.readOnly &&
    getNodeEditCapability(store.graph, selected.value.id).editable &&
    (canAddPrototypeConnection(selected.value) || !!connection.value)
  )
})
const anchor = computed(() => {
  void store.state.sceneVersion
  return selected.value
    ? prototypeAnchor(store.graph, selected.value, placement.value, store.state.rotationPreview)
    : null
})
const frames = computed(() => {
  void store.state.sceneVersion
  return prototypeFrames(store.graph, view.currentPageId).filter((frame) =>
    prototypeLayerVisible(store.graph, frame)
  )
})
const links = computed(() => {
  void store.state.sceneVersion
  return frames.value
    .flatMap((frame) => prototypeHotspots(store.graph, frame.id))
    .flatMap((hotspot) => {
      const source = store.graph.getNode(hotspot.nodeId)
      const target = store.graph.getNode(hotspot.destinationId)
      if (!source || !target || !prototypeLayerVisible(store.graph, source)) return []
      return [
        {
          ...hotspot,
          destinationName: target.name,
          ...prototypeLinkGeometry(
            store.graph,
            source,
            target,
            placement.value,
            store.state.rotationPreview
          )
        }
      ]
    })
})
const destination = computed(() =>
  drag.value
    ? prototypeDestinationAt(
        store.graph,
        view.currentPageId,
        drag.value.at,
        placement.value,
        store.state.rotationPreview
      )
    : null
)
const preview = computed(() => {
  if (!drag.value?.moved || !selected.value || !anchor.value) return null
  return destination.value
    ? prototypeLinkGeometry(
        store.graph,
        selected.value,
        destination.value,
        placement.value,
        store.state.rotationPreview
      ).path
    : prototypeCurve(anchor.value.point, drag.value.at, anchor.value.direction)
})
const targetOutline = computed(() => {
  const target = destination.value
  if (!target || !drag.value?.moved) return undefined
  const geometry = createSceneGeometry(store.graph, store.state.rotationPreview)
  return [
    { x: 0, y: 0 },
    { x: target.width, y: 0 },
    { x: target.width, y: target.height },
    { x: 0, y: target.height }
  ]
    .map((point) => geometry.toScreen(target, point, placement.value))
    .map((point) => `${point.x},${point.y}`)
    .join(' ')
})
const reference = computed(() =>
  handle.value
    ? { getBoundingClientRect: () => handle.value?.getBoundingClientRect() ?? new DOMRect() }
    : null
)
function focusHandle() {
  if (handle.value?.isConnected) handle.value.focus()
}
function cancel() {
  const current = drag.value
  drag.value = null
  if (current && handle.value?.hasPointerCapture(current.pointerId))
    handle.value.releasePointerCapture(current.pointerId)
}
function local(event: PointerEvent): Vector | null {
  const box = canvas?.getBoundingClientRect()
  return box ? { x: event.clientX - box.left, y: event.clientY - box.top } : null
}
function start(event: PointerEvent) {
  const at = local(event)
  if (event.button !== 0 || !selected.value || !editable.value || !at) return
  event.preventDefault()
  focusHandle()
  handle.value?.setPointerCapture(event.pointerId)
  dropped = false
  drag.value = {
    sourceId: selected.value.id,
    connectionId: connection.value?.id,
    pointerId: event.pointerId,
    start: at,
    at,
    moved: false
  }
}
function move(event: PointerEvent) {
  const current = drag.value
  const at = local(event)
  if (!current || !at) return
  if (!current.moved && Math.hypot(at.x - current.start.x, at.y - current.start.y) < 3) return
  current.moved = true
  current.at = at
}
function commit(id: string, sourceId = selected.value?.id, connectionId = connection.value?.id) {
  if (!sourceId) return
  try {
    store.setPrototypeConnection(sourceId, id, connectionId)
  } catch {
    toast.error(messages.value.prototypeFailed)
  }
  pickerOpen.value = false
}
function end(event: PointerEvent) {
  move(event)
  const current = drag.value
  const target = destination.value
  cancel()
  if (!current?.moved) return
  dropped = true
  if (target) commit(target.id, current.sourceId, current.connectionId)
}
function click(event: MouseEvent) {
  if (dropped && event.detail > 0) {
    dropped = false
    return
  }
  focusHandle()
  pickerOpen.value = true
}
function edit(id: string) {
  store.select([id])
  void nextTick(() => {
    focusHandle()
    if (editable.value) pickerOpen.value = true
  })
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    dropped = !!drag.value
    event.preventDefault()
    cancel()
    pickerOpen.value = false
  } else if (event.key.startsWith('Arrow')) event.preventDefault()
  else if (
    (event.key === 'Delete' || event.key === 'Backspace') &&
    connection.value &&
    selected.value &&
    editable.value
  ) {
    event.preventDefault()
    try {
      store.removePrototypeConnection(selected.value.id, connection.value.id)
    } catch {
      toast.error(messages.value.prototypeFailed)
    }
  }
}
watch(
  () => [...store.state.selectedIds].join(','),
  () => {
    cancel()
    pickerOpen.value = false
  },
  { flush: 'sync' }
)
watch(
  () => view.currentPageId,
  () => {
    cancel()
    pickerOpen.value = false
  }
)
watch(editable, (enabled) => {
  if (!enabled) {
    cancel()
    pickerOpen.value = false
  }
})
onBeforeUnmount(cancel)
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    data-slot="prototype-connections"
    data-picker-content
    role="group"
    :aria-label="messages.canvasConnections"
    @keydown="keydown"
  >
    <svg class="absolute inset-0 size-full overflow-visible text-primary" aria-hidden="true">
      <defs>
        <marker
          :id="marker"
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 1 1 L 7 4 L 1 7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </marker>
      </defs>
      <polygon
        v-if="targetOutline"
        :points="targetOutline"
        fill="currentColor"
        fill-opacity="0.06"
        stroke="currentColor"
        stroke-width="2"
      />
      <g v-for="link in links" :key="link.nodeId">
        <path
          :d="link.path"
          fill="none"
          stroke="transparent"
          stroke-width="14"
          pointer-events="stroke"
          class="cursor-pointer"
          @pointerdown.stop
          @click.stop="edit(link.nodeId)"
        />
        <path
          :d="link.path"
          fill="none"
          stroke="currentColor"
          :stroke-width="selected?.id === link.nodeId ? 2 : 1.5"
          :opacity="selected?.id === link.nodeId ? 1 : 0.5"
          :marker-end="`url(#${marker})`"
        />
      </g>
      <path
        v-if="preview"
        :d="preview"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        :marker-end="`url(#${marker})`"
      />
    </svg>
    <Tip
      v-for="link in links.filter((item) => item.nodeId !== selected?.id || !editable)"
      :key="link.nodeId"
      :label="messages.editConnection"
      as-child
    >
      <button
        type="button"
        class="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :style="{ left: `${link.from.x}px`, top: `${link.from.y}px` }"
        :aria-label="
          messages.connectionLabel({ source: link.name, destination: link.destinationName })
        "
        :aria-description="messages.editConnectionHelp"
        @pointerdown.stop
        @click="edit(link.nodeId)"
      >
        <span class="size-2 rounded-full border-2 border-primary bg-panel" />
      </button>
    </Tip>
    <PopoverRoot v-model:open="pickerOpen">
      <Tip
        v-if="anchor && editable"
        :label="connection ? messages.reconnectTip : messages.connectTip"
        as-child
      >
        <button
          ref="handle"
          type="button"
          class="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :style="{ left: `${anchor.point.x}px`, top: `${anchor.point.y}px` }"
          :aria-label="connection ? messages.changeDestination : messages.createConnection"
          :aria-description="messages.connectionHandleHelp"
          @pointerdown.stop="start"
          @pointermove="move"
          @pointerup="end"
          @pointercancel="cancel"
          @lostpointercapture="cancel"
          @click="click"
          @contextmenu.stop.prevent
        >
          <span
            class="flex size-3 items-center justify-center rounded-full border-2 border-primary bg-panel text-primary"
            ><icon-lucide-plus v-if="!connection" class="size-2.5"
          /></span>
        </button>
      </Tip>
      <PopoverPortal
        ><PopoverContent
          v-if="reference"
          :reference="reference"
          side="right"
          :side-offset="8"
          :class="popup.content"
          data-picker-content
          @close-auto-focus.prevent="focusHandle"
          ><h3 class="mb-2 text-xs font-semibold">{{ messages.clickNavigate }}</h3>
          <p class="mb-2 text-[11px] leading-4 text-muted">{{ messages.connectionHandleHelp }}</p>
          <AppSelect
            :label="messages.destination"
            :aria-description="messages.destinationHelp"
            :model-value="connection?.destinationId ?? ''"
            :placeholder="messages.chooseFrame"
            :options="frames.map((frame) => ({ value: frame.id, label: frame.name }))"
            @update:model-value="(id) => commit(String(id))" /></PopoverContent
      ></PopoverPortal>
    </PopoverRoot>
  </div>
</template>
