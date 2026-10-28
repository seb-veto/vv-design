<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { useVVLibrary, type VVDocument } from '@/app/home/vv-library'
import { useDateFormat } from '@/app/i18n/date'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import { openFileDialog } from '@/app/shell/menu/use'
import DocumentEntry from '@/components/home/document/DocumentEntry.vue'
import HomeLayout from '@/components/home/HomeLayout.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { sideList } from '@/components/ui/list/side-list'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

const emit = defineEmits<{ 'new-document': [] }>()
const { workspace, recents, open } = useVVLibrary()
const { documents, loading, error, previewURL, previewDirective: vWorkspacePreview } = workspace
const messages = useDesignMenuMessages()
const { files, panels, menu } = useI18n()
const dates = useDateFormat()
const location = ref<'recents' | 'drafts'>('recents')
const query = ref('')
const view = useLocalStorage<'grid' | 'list'>('open-pencil:home-files-view', 'grid')
const openError = ref(false)
const ui = sideList()
const matching = computed(() =>
  (location.value === 'recents' ? recents.value : documents.value).filter((document) =>
    document.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())
  )
)
async function openDocument(document: VVDocument) {
  openError.value = false
  try {
    await open(document)
  } catch (error) {
    openError.value = true
    console.error('[Design] Could not open saved design:', error)
  }
}
</script>

<template>
  <HomeLayout>
    <template #locations
      ><AppInput
        v-model="query"
        type="search"
        :aria-label="messages.searchFiles"
        :placeholder="messages.searchFiles"
        autocomplete="off"
    /></template>
    <template #sidebar>
      <nav :class="ui.root()" :aria-label="messages.localFiles">
        <div class="flex h-14 items-center gap-2 border-b border-border px-4 text-sm font-semibold">
          <icon-lucide-figma class="size-5" />Design
        </div>
        <div class="p-3">
          <AppInput
            v-model="query"
            type="search"
            :aria-label="messages.searchFiles"
            :placeholder="messages.searchFiles"
            autocomplete="off"
            size="md"
          >
            <template #leading><icon-lucide-search class="size-3.5" /></template>
          </AppInput>
        </div>
        <div :class="ui.group()">
          <button
            type="button"
            :class="ui.item()"
            :aria-description="messages.recentsHelp"
            :aria-pressed="location === 'recents'"
            :data-active="location === 'recents'"
            @click="location = 'recents'"
          >
            <icon-lucide-clock :class="ui.icon()" /><span>{{ messages.recents }}</span>
          </button>
        </div>
        <div :class="ui.group()">
          <p :class="ui.title()" class="px-2 py-2">{{ messages.localFiles }}</p>
          <button
            type="button"
            :class="ui.item()"
            :aria-description="messages.draftsHelp"
            :aria-pressed="location === 'drafts'"
            :data-active="location === 'drafts'"
            @click="location = 'drafts'"
          >
            <icon-lucide-file :class="ui.icon()" /><span>{{ messages.drafts }}</span>
          </button>
        </div>
      </nav>
    </template>
    <div class="mb-6 flex flex-wrap items-center gap-3 border-b border-border pb-5">
      <h1 class="mr-auto text-xl font-semibold">
        {{ location === 'recents' ? messages.recents : messages.drafts }}
      </h1>
      <AppButton
        variant="outline"
        :aria-description="messages.importHelp"
        @click="openFileDialog"
        >{{ menu.open }}</AppButton
      >
      <AppButton
        color="primary"
        variant="solid"
        :aria-description="messages.newHelp"
        @click="emit('new-document')"
        ><template #leading><icon-lucide-plus class="size-3.5" /></template
        >{{ files.newDesign }}</AppButton
      >
    </div>
    <div class="mb-5 flex items-center gap-2">
      <p class="mr-auto text-xs text-muted">{{ messages.savedLocally }}</p>
      <IconButton
        :label="messages.refreshFiles"
        :aria-description="messages.refreshHelp"
        :aria-busy="loading"
        @click="workspace.invalidate()"
        ><icon-lucide-refresh-cw class="size-4"
      /></IconButton>
      <SegmentedControl
        v-model="view"
        required
        :label="files.recentFiles"
        size="md"
        :options="[
          { value: 'grid', label: panels.gridView },
          { value: 'list', label: panels.listView }
        ]"
      >
        <template #option="{ option }"
          ><icon-lucide-layout-grid
            v-if="option.value === 'grid'"
            class="size-3.5" /><icon-lucide-list v-else class="size-3.5"
        /></template>
      </SegmentedControl>
    </div>
    <p v-if="error" role="alert" class="mb-4 text-xs text-error">{{ messages.loadFailed }}</p>
    <p v-if="openError" role="alert" class="mb-4 text-xs text-error">{{ messages.openFailed }}</p>
    <p v-if="loading && !documents.length" role="status" class="text-xs text-muted">
      {{ messages.loadingFiles }}
    </p>
    <div
      v-if="matching.length"
      :class="
        view === 'grid'
          ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6'
          : 'overflow-hidden rounded-lg border border-border'
      "
    >
      <DocumentEntry
        v-for="document in matching"
        :key="document.id"
        v-workspace-preview="document.id"
        :view="view"
        :name="document.name"
        :metadata="dates.format(document.updatedAt, 'dateTime')"
        :previewURL="previewURL(document.id)"
        :help="messages.openHelp"
        @open="openDocument(document)"
      />
    </div>
    <p v-else-if="!loading && !error" class="py-12 text-center text-sm text-muted">
      {{
        query.trim()
          ? files.noMatchingFiles({ query: query.trim() })
          : location === 'recents'
            ? messages.noRecents
            : messages.noDrafts
      }}
    </p>
    <AppButton
      v-if="location === 'recents' && !matching.length && !loading && !error && !query.trim()"
      variant="outline"
      :aria-description="messages.draftsHelp"
      class="mx-auto"
      @click="location = 'drafts'"
      >{{ messages.browseDrafts }}</AppButton
    >
  </HomeLayout>
</template>
