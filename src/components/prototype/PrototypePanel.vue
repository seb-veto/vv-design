<script setup lang="ts">
import { computed } from 'vue'

import {
  getNodeEditCapability,
  canAddPrototypeConnection,
  prototypeConnection,
  prototypeFrame,
  prototypeFrames,
  prototypeActiveInteractions,
  prototypeStart
} from '@open-pencil/core'
import { useSelectionState } from '@open-pencil/vue/editor/selection-state'

import { useEditorStore } from '@/app/editor/active-store'
import { startPreview } from '@/app/editor/prototype/preview'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import { toast } from '@/app/shell/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const store = useEditorStore()
const messages = useDesignMenuMessages()
const { selectedNode: selected } = useSelectionState()
const view = computed(() => {
  void store.state.sceneVersion
  const node = selected.value
  return {
    node,
    frame: node ? prototypeFrame(store.graph, node.id) : null,
    frames: prototypeFrames(store.graph, store.state.currentPageId),
    start: prototypeStart(store.graph, store.state.currentPageId),
    entries: node
      ? prototypeActiveInteractions(node).map((entry, index) => ({
          index,
          connection: prototypeConnection(entry)
        }))
      : [],
    editable:
      !!node && !store.state.readOnly && getNodeEditCapability(store.graph, node.id).editable
  }
})
const options = computed(() =>
  view.value.frames.map((frame) => ({ value: frame.id, label: frame.name }))
)
function update(action: () => void) {
  try {
    action()
  } catch {
    toast.error(messages.value.prototypeFailed)
  }
}
function add() {
  const { node, frame, frames } = view.value
  const target = frames.find((entry) => entry.id !== frame?.id)
  if (node && target) update(() => store.setPrototypeConnection(node.id, target.id))
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <PanelSection :label="messages.flowStartingPoint">
      <p class="mb-2 text-xs text-muted">{{ view.start?.name ?? messages.addFrames }}</p>
      <AppButton
        v-if="view.frame"
        variant="outline"
        :disabled="!view.editable || view.start?.id === view.frame.id"
        :aria-description="messages.startHereHelp"
        @click="update(() => store.setPrototypeStart(view.frame!.id))"
        >{{ messages.startHere }}</AppButton
      >
      <AppButton
        class="mt-2"
        variant="outline"
        :disabled="!view.frames.length"
        :aria-description="messages.previewHelp"
        @click="startPreview(store, $event)"
        >{{ messages.previewPrototype }}</AppButton
      >
    </PanelSection>
    <PanelSection :label="messages.interactions">
      <template #actions>
        <IconButton
          :label="messages.addInteraction"
          :aria-description="messages.addInteractionHelp"
          :disabled="
            !view.editable ||
            !view.frame ||
            view.frames.length < 2 ||
            (!!view.node && !canAddPrototypeConnection(view.node))
          "
          @click="add"
          ><icon-lucide-plus class="size-3.5"
        /></IconButton>
      </template>
      <p v-if="!view.node || !view.frame" class="text-xs text-muted">
        {{ messages.selectHotspot }}
      </p>
      <p v-else-if="view.frames.length < 2" class="text-xs text-muted">{{ messages.addFrames }}</p>
      <div v-for="entry in view.entries" :key="entry.index" class="mb-3">
        <template v-if="entry.connection">
          <div class="mb-1 flex items-center gap-1 text-xs">
            <span class="flex-1">{{ messages.clickNavigate }}</span
            ><IconButton
              :label="messages.removeInteraction"
              :aria-description="messages.removeInteractionHelp"
              :disabled="!view.editable"
              size="xs"
              @click="
                update(() => store.removePrototypeConnection(view.node!.id, entry.connection!.id))
              "
              ><icon-lucide-minus class="size-3.5"
            /></IconButton>
          </div>
          <AppSelect
            :label="messages.destination"
            :aria-description="messages.destinationHelp"
            :model-value="entry.connection.destinationId"
            :display-label="
              view.frames.some((frame) => frame.id === entry.connection?.destinationId)
                ? undefined
                : messages.missingDestination
            "
            :options="options"
            :disabled="!view.editable"
            @update:model-value="
              (id) =>
                update(() =>
                  store.setPrototypeConnection(view.node!.id, String(id), entry.connection!.id)
                )
            "
          />
          <p class="mt-1 text-[11px] text-muted">{{ messages.instant }}</p>
        </template>
        <p v-else class="text-xs text-muted">{{ messages.unsupportedInteraction }}</p>
      </div>
    </PanelSection>
  </div>
</template>
