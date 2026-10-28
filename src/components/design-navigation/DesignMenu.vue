<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed } from 'vue'

import { useAppMenu } from '@/app/shell/menu/app-menu'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import IconButton from '@/components/ui/button/IconButton.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

import DesignMenuItems from './DesignMenuItems.vue'

const { topMenus } = useAppMenu()
const messages = useDesignMenuMessages()
const groups = computed(() =>
  topMenus.value.map((group) => ({ label: group.label, sub: group.items }))
)
const ui = useMenuUI({ content: 'min-w-52' })
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <IconButton
        :label="messages.mainMenu"
        :aria-description="messages.menuHelp"
        size="sm"
        class="mb-3"
        side="right"
      >
        <icon-lucide-figma class="size-5" />
      </IconButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent side="right" align="start" :side-offset="8" :class="ui.content">
        <MenuScrollArea><DesignMenuItems :items="groups" /></MenuScrollArea>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
