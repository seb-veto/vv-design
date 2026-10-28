<script setup lang="ts">
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from 'reka-ui'

import type { MenuEntry } from '@open-pencil/vue/editor/menu-model'

import {
  hasMenuSubItems,
  isMenuCheckbox,
  isMenuSeparator,
  menuChecked,
  menuDisabled,
  menuLabel,
  menuShortcut,
  menuSubItems,
  runMenuAction,
  updateMenuChecked
} from '@/app/shell/menu/entry'
import AppShortcutText from '@/components/ui/menu/AppShortcutText.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'

const { items } = defineProps<{ items: MenuEntry[] }>()
const ui = useMenuUI({ content: 'min-w-56', item: 'text-xs', shortcut: 'text-xs' })
</script>

<template>
  <template v-for="(item, index) in items" :key="index">
    <DropdownMenuSeparator v-if="isMenuSeparator(item)" :class="ui.separator" />
    <DropdownMenuSub v-else-if="hasMenuSubItems(item)">
      <DropdownMenuSubTrigger :class="ui.item" :disabled="menuDisabled(item)">
        <span class="flex-1">{{ menuLabel(item) }}</span>
        <icon-lucide-chevron-right class="size-3 text-muted" />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent :side-offset="4" :class="ui.content">
          <MenuScrollArea><DesignMenuItems :items="menuSubItems(item)" /></MenuScrollArea>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
    <DropdownMenuCheckboxItem
      v-else-if="isMenuCheckbox(item)"
      :model-value="menuChecked(item)"
      :disabled="menuDisabled(item)"
      :class="ui.item"
      @update:model-value="updateMenuChecked(item, $event === true)"
    >
      <span class="flex-1">{{ menuLabel(item) }}</span>
      <DropdownMenuItemIndicator><icon-lucide-check class="size-3.5" /></DropdownMenuItemIndicator>
    </DropdownMenuCheckboxItem>
    <DropdownMenuItem
      v-else
      :class="ui.item"
      :disabled="menuDisabled(item)"
      @select="runMenuAction(item)"
    >
      <span class="flex-1">{{ menuLabel(item) }}</span>
      <AppShortcutText v-if="menuShortcut(item)">{{ menuShortcut(item) }}</AppShortcutText>
    </DropdownMenuItem>
  </template>
</template>
