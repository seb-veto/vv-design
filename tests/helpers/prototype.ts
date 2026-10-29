import type { Page } from '@playwright/test'

export async function createPrototypeScene(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor is unavailable')
    const pageId = store.state.currentPageId
    const frames = ['First screen', 'Second screen', 'Third screen'].map((name, index) =>
      store.graph.createNode('FRAME', pageId, { name, x: index * 240, width: 120, height: 160 })
    )
    const hotspot = store.graph.createNode('RECTANGLE', frames[0].id, {
      name: 'Hotspot',
      x: 20,
      y: 60,
      width: 80,
      height: 40
    })
    store.select([hotspot.id])
    store.centerOn(300, 80, 1)
    store.requestRender()
    return { source: hotspot.id, first: frames[0].id, second: frames[1].id, third: frames[2].id }
  })
}

export async function prototypeState(page: Page, id: string) {
  return page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Editor is unavailable')
    const node = store.graph.getNode(nodeId)
    const raw = node?.source.fig.rawNodeFields.prototypeInteractions
    return { exists: !!node, raw, count: Array.isArray(raw) ? raw.length : 0 }
  }, id)
}

export async function prototypeFramePoint(page: Page, id: string) {
  return page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    const node = store?.graph.getNode(nodeId)
    if (!store || !node) throw new Error('Frame is unavailable')
    const origin = store.graph.getAbsolutePosition(nodeId)
    const { zoom, panX, panY } = store.state
    return {
      x: (origin.x + node.width / 2) * zoom + panX,
      y: (origin.y + node.height / 2) * zoom + panY
    }
  }, id)
}
