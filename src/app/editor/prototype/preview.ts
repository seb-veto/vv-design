import type { EditorStore } from '@/app/editor/active-store'
import { IS_VV_DESIGN } from '@/constants'

/** WebKit pointer activation does not focus buttons; the modal needs its return target. */
export function startPreview(store: EditorStore, event: Event): void {
  if (IS_VV_DESIGN && event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  store.startPlay()
}
