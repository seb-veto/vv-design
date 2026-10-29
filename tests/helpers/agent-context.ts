import type { Page } from '@playwright/test'

export async function observeAgentContext(page: Page) {
  await page.route('**/__vv-design/runtime', async (route) => {
    await route.fulfill({ json: { parentOrigin: new URL(route.request().url()).origin } })
  })
  await page.addInitScript(() => {
    window.addEventListener('message', (event) => {
      if (event.source === window && event.data?.type === 'vv-design:agents' && event.data.visible)
        Reflect.set(window, '__agentContext', event.data)
    })
  })
}

export async function readAgentContext(page: Page) {
  return page.evaluate(() => {
    const value: unknown = Reflect.get(window, '__agentContext')
    if (!value || typeof value !== 'object') return null
    if (!('documentId' in value) || !('pageId' in value)) return null
    if (typeof value.documentId !== 'string' || typeof value.pageId !== 'string') return null
    return { documentId: value.documentId, pageId: value.pageId }
  })
}
