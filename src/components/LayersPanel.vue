<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { ref, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { useAIChat } from '@/app/ai/chat/use'
import ChatPanel from '@/components/ChatPanel.vue'
import DesignFileHeader from '@/components/design-navigation/DesignFileHeader.vue'
import DesignNavigation from '@/components/design-navigation/DesignNavigation.vue'
import VVAgentPanel from '@/components/design-navigation/VVAgentPanel.vue'
import AppMenu from '@/components/shell/AppMenu.vue'
import { IS_VV_DESIGN } from '@/constants'
import splitterTheme from '@/theme/splitter'

import AssetsPanel from './assets-panel/AssetsPanel.vue'
import LayerTree from './LayerTree/LayerTree.vue'
import PagesPanel from './PagesPanel.vue'

const { panels } = useI18n()
const { activeTab } = useAIChat()
const activePanel = ref<'file' | 'assets' | 'agents'>('file')
watch(activeTab, (tab) => {
  if (tab === 'ai') activePanel.value = 'agents'
  else if (activePanel.value === 'agents') activePanel.value = 'file'
})
function selectPanel(panel: 'file' | 'assets' | 'agents') {
  activePanel.value = panel
  if (panel === 'agents') activeTab.value = 'ai'
  else if (activeTab.value === 'ai') activeTab.value = 'design'
}
const splitterStyles = tv(splitterTheme)({ direction: 'vertical' })
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 overflow-hidden border-r border-border bg-panel"
    style="contain: paint layout style"
  >
    <DesignNavigation :active="activePanel" @select="selectPanel" />
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <DesignFileHeader v-if="IS_VV_DESIGN" />
      <AppMenu v-else />
      <VVAgentPanel v-if="IS_VV_DESIGN && activePanel === 'agents'" />
      <ChatPanel v-if="!IS_VV_DESIGN" v-show="activePanel === 'agents'" />
      <AssetsPanel v-if="activePanel === 'assets'" />
      <SplitterGroup
        v-show="activePanel === 'file'"
        direction="vertical"
        auto-save-id="layers-layout"
        class="flex-1 overflow-hidden"
      >
        <SplitterPanel
          :default-size="12"
          :min-size="6"
          :max-size="40"
          class="flex flex-col overflow-hidden"
        >
          <PagesPanel />
        </SplitterPanel>
        <SplitterResizeHandle :class="splitterStyles.handle()">
          <div :class="splitterStyles.divider()" />
        </SplitterResizeHandle>
        <SplitterPanel :default-size="88" :min-size="20" class="flex flex-col overflow-hidden">
          <header
            data-test-id="layers-header"
            class="shrink-0 px-3 py-2 text-[11px] font-semibold text-surface"
          >
            {{ panels.layers }}
          </header>
          <LayerTree data-test-id="layers-tree" />
        </SplitterPanel>
      </SplitterGroup>
    </div>
  </aside>
</template>
