import { useEventListener, useMutationObserver } from '@vueuse/core'
import { nextTick } from 'vue'

/** Native host panels must yield to popups rendered inside their embedded editor. */
export function usePanelOcclusion(onChange: () => void) {
  useEventListener(document, ['focusin', 'focusout'], () => {
    void nextTick(onChange)
  })
  useMutationObserver(
    document.body,
    () => {
      void nextTick(onChange)
    },
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-state']
    }
  )
  return (bounds: DOMRect): boolean => {
    if (document.querySelector('[role="dialog"][data-state="open"]')) return true
    return [...document.querySelectorAll('[role="menu"][data-state="open"]')].some((menu) => {
      const rect = menu.getBoundingClientRect()
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.left < bounds.right &&
        rect.right > bounds.left &&
        rect.top < bounds.bottom &&
        rect.bottom > bounds.top
      )
    })
  }
}
