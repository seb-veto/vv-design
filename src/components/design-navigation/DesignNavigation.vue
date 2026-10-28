<script setup lang="ts">
import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'
import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

const { active } = defineProps<{ active: 'file' | 'agents' | 'assets' }>()
const emit = defineEmits<{ select: [panel: 'file' | 'agents' | 'assets'] }>()
const store = useEditorStore()
const { menu, panels } = useI18n()
const navigation = [
  { id: 'file', label: 'File', help: 'Show pages and layers' },
  { id: 'agents', label: 'Agents', help: 'Open BB conversation' },
  { id: 'assets', label: 'Assets', help: 'Browse reusable components' }
] as const
</script>

<template>
  <nav
    aria-label="Design navigation"
    class="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel py-3"
  >
    <Tip :label="menu.settings">
      <button
        type="button"
        :aria-label="menu.settings"
        class="mb-3 flex size-8 items-center justify-center rounded text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus"
        @click="openSettingsDialog()"
      >
        <icon-lucide-pen-tool class="size-5" />
      </button>
    </Tip>
    <Tip v-for="item in navigation" :key="item.id" :label="item.help" side="right">
      <button
        type="button"
        :aria-label="item.label"
        :aria-pressed="active === item.id"
        :data-active="active === item.id"
        class="flex w-10 flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus data-[active=true]:bg-panel-selected-muted data-[active=true]:text-primary"
        @click="emit('select', item.id)"
      >
        <icon-lucide-file v-if="item.id === 'file'" class="size-5" />
        <icon-lucide-sparkles v-else-if="item.id === 'agents'" class="size-5" />
        <icon-lucide-circle-plus v-else class="size-5" />
        <span>{{ item.label }}</span>
      </button>
    </Tip>
    <div class="my-2 h-px w-6 bg-border" />
    <Tip :label="panels.openVariables" side="right">
      <button
        type="button"
        aria-label="Variables"
        class="flex w-10 flex-col items-center gap-1 rounded-lg py-2 text-[11px] text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus"
        @click="store.state.variablesOpen = true"
      >
        <icon-lucide-hexagon class="size-5" />
        <span>Variables</span>
      </button>
    </Tip>
    <div class="flex-1" />
    <IconButton :label="menu.settings" side="right" @click="openSettingsDialog()"
      ><icon-lucide-settings class="size-4"
    /></IconButton>
  </nav>
</template>
