import { computed, ref } from 'vue'

import { useInlineRename } from '@open-pencil/vue/editor/inline-rename'

import { vvDocumentName, vvFileURL } from '@/app/document/io/vv'
import type { EditorStore } from '@/app/editor/active-store'
import { useDesignMenuMessages } from '@/app/shell/menu/design-messages'
import { toast } from '@/app/shell/ui'

const DOCUMENT_NAME_ID = 'document-name'

export function useDocumentNameRename(store: EditorStore) {
  const renaming = ref(false)
  const messages = useDesignMenuMessages()
  const rename = useInlineRename<'document-name'>((_id, name) => {
    const state = store.state
    const url = vvFileURL(store.getDocumentFilePath())
    if (!url) {
      store.state.documentName = name
      return
    }
    renaming.value = true
    void vvDocumentName(url, name)
      .then((saved) => {
        state.documentName = saved
        return saved
      })
      .catch(() => {
        toast.error(messages.value.renameFailed)
      })
      .finally(() => {
        renaming.value = false
      })
  })
  const editingName = computed(() => rename.editingId.value === DOCUMENT_NAME_ID)

  function startRename() {
    if (renaming.value) return
    rename.start(DOCUMENT_NAME_ID, store.state.documentName)
  }

  function commitRename(e: Event) {
    rename.commit(DOCUMENT_NAME_ID, e)
  }

  return { rename, renaming, editingName, startRename, commitRename }
}
