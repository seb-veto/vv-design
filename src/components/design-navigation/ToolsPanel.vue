<script setup lang="ts">
import { computed, ref } from 'vue'

import { useAIChat } from '@/app/ai/chat/use'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import AppInput from '@/components/ui/input/AppInput.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

const messages = useDesignMenuMessages()
const { activeTab } = useAIChat()
const query = ref('')
const tools = computed(() =>
  [
    {
      id: 'code' as const,
      label: messages.value.codeTool,
      description: messages.value.codeToolDescription,
      help: messages.value.codeToolHelp
    },
    {
      id: 'lint' as const,
      label: messages.value.checkTool,
      description: messages.value.checkToolDescription,
      help: messages.value.checkToolHelp
    }
  ].filter((tool) =>
    `${tool.label} ${tool.description}`
      .toLocaleLowerCase()
      .includes(query.value.trim().toLocaleLowerCase())
  )
)
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col overflow-auto p-3" :aria-label="messages.tools">
    <h2 class="mb-3 text-[13px] font-semibold">{{ messages.tools }}</h2>
    <AppInput
      v-model="query"
      type="search"
      :aria-label="messages.searchTools"
      :placeholder="messages.searchTools"
      autocomplete="off"
    >
      <template #leading><icon-lucide-search class="size-3.5" /></template>
    </AppInput>
    <h3 class="my-4 text-xs font-semibold">{{ messages.builtInTools }}</h3>
    <div class="flex flex-col gap-1">
      <Tip v-for="tool in tools" :key="tool.id" :label="tool.label" side="right">
        <button
          type="button"
          :aria-label="tool.label"
          :aria-description="tool.help"
          :aria-pressed="activeTab === tool.id"
          :data-active="activeTab === tool.id"
          class="flex items-start gap-2 rounded-lg p-2 text-left outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus data-[active=true]:bg-panel-selected-muted"
          @click="activeTab = tool.id"
        >
          <span
            class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded border border-border bg-input"
          >
            <icon-lucide-code v-if="tool.id === 'code'" class="size-4" />
            <icon-lucide-list-checks v-else class="size-4" />
          </span>
          <span
            ><span class="block text-xs font-medium">{{ tool.label }}</span
            ><span class="mt-0.5 block text-[11px] leading-4 text-muted">{{
              tool.description
            }}</span></span
          >
        </button>
      </Tip>
    </div>
    <p v-if="!tools.length" role="status" class="py-6 text-xs text-muted">
      {{ messages.noMatchingTools }}
    </p>
  </section>
</template>
