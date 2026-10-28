<script setup lang="ts">
import { templateRef, unrefElement } from '@vueuse/core'
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed, nextTick, watch, type ComponentPublicInstance } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { useAppMenu } from '@/app/shell/menu/app-menu'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import { useDocumentNameRename } from '@/app/shell/menu/document-name'
import { appMenuShortcutLabel } from '@/app/shell/menu/shortcut'
import { CloudDocumentStatusHost } from '@/components/cloud/integration'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

import DesignMenuItems from './DesignMenuItems.vue'

const store = useEditorStore()
const { menu, pages } = useI18n()
const messages = useDesignMenuMessages()
const { topMenus } = useAppMenu()
const { rename, editingName, startRename, commitRename } = useDocumentNameRename(store)
const nameInput = templateRef<HTMLInputElement>('nameInput')
const fileTrigger = templateRef<ComponentPublicInstance>('fileTrigger')
function renameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
  }
  rename.onKeydown(event)
  if (event.key === 'Enter' || event.key === 'Escape') {
    void nextTick(() => unrefElement(fileTrigger)?.focus())
  }
}
watch(nameInput, (input) => {
  if (input) void rename.focusInput(input)
})
const fileItems = computed(() => [
  { label: pages.value.rename, action: startRename },
  { separator: true as const },
  ...topMenus.value
    .flatMap((group) => group.items)
    .filter((item) => 'menuId' in item && ['save', 'save-as', 'close'].includes(item.menuId ?? ''))
])
const ui = useMenuUI({ content: 'min-w-56' })
</script>

<template>
  <header class="shrink-0 border-b border-border px-3 py-3">
    <div class="flex h-5 items-center gap-1">
      <input
        v-if="editingName"
        ref="nameInput"
        :aria-label="messages.renameFile"
        :aria-description="messages.renameHelp"
        class="min-w-0 flex-1 rounded border border-accent bg-input px-1 text-[13px] text-surface outline-none"
        :value="store.state.documentName"
        @blur="commitRename($event)"
        @keydown="renameKeydown"
      />
      <DropdownMenuRoot v-else>
        <Tip :label="messages.fileMenu">
          <DropdownMenuTrigger
            ref="fileTrigger"
            :aria-label="messages.fileMenu"
            :aria-description="messages.fileHelp"
            class="flex h-5 min-w-0 flex-1 items-center gap-2 rounded text-left text-[13px] font-semibold text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus"
          >
            <span class="min-w-0 flex-1 truncate">{{ store.state.documentName }}</span>
            <icon-lucide-chevron-down class="size-3 shrink-0" />
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuPortal>
          <DropdownMenuContent
            @close-auto-focus="editingName && $event.preventDefault()"
            align="start"
            :side-offset="8"
            :class="ui.content"
          >
            <MenuScrollArea><DesignMenuItems :items="fileItems" /></MenuScrollArea>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
      <CloudDocumentStatusHost />
      <IconButton
        :label="`${menu.toggleUI} (${appMenuShortcutLabel('toggle-ui')})`"
        @click="store.state.showUI = !store.state.showUI"
      >
        <icon-lucide-panel-left class="size-4" />
      </IconButton>
    </div>
    <div class="mt-0.5 text-xs leading-4 text-muted">{{ messages.drafts }}</div>
  </header>
</template>
