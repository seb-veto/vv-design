import { describe, expect, test } from 'bun:test'

import {
  createEditor,
  prototypeConnection,
  prototypeInteractions,
  prototypeHotspots,
  hasPrototypeInteractions,
  prototypeStart
} from '@open-pencil/core'
import { exportFigFile, parseFigFile } from '@open-pencil/core/io/formats/fig'

function scene() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const first = editor.graph.createNode('FRAME', pageId, { name: 'First', width: 320, height: 240 })
  const second = editor.graph.createNode('FRAME', pageId, {
    name: 'Second',
    x: 400,
    width: 320,
    height: 240
  })
  const button = editor.graph.createNode('RECTANGLE', first.id, {
    name: 'Next',
    x: 10,
    y: 20,
    width: 80,
    height: 40
  })
  return { editor, first, second, button, pageId }
}

const unsupported = {
  event: { interactionType: 'MOUSE_IN' },
  actions: [{ connectionType: 'URL', connectionURL: 'https://example.invalid' }]
}

describe('native prototype connections', () => {
  test('edits and removes an on-click connection with undo, retaining unrelated interactions', () => {
    const { editor, first, second, button } = scene()
    button.source.fig.rawNodeFields.prototypeInteractions = [structuredClone(unsupported)]
    editor.setPrototypeConnection(button.id, second.id)
    expect(hasPrototypeInteractions(editor.graph, editor.state.currentPageId)).toBe(true)
    const entries = prototypeInteractions(button)
    const connection = prototypeConnection(entries[1])
    expect(connection?.destinationId).toBe(second.id)
    expect(entries[0]).toEqual(unsupported)
    expect(() => editor.setPrototypeConnection(button.id, second.id)).toThrow('already')
    editor.undoAction()
    expect(prototypeInteractions(button)).toEqual([unsupported])
    editor.redoAction()
    if (!connection) throw new Error('Missing connection')
    editor.setPrototypeConnection(button.id, first.id, connection.id)
    expect(prototypeConnection(prototypeInteractions(button)[1])?.destinationId).toBe(first.id)
    editor.undoAction()
    expect(prototypeConnection(prototypeInteractions(button)[1])?.destinationId).toBe(second.id)
    editor.removePrototypeConnection(button.id, connection.id)
    expect(prototypeInteractions(button)).toEqual([unsupported])
    editor.undoAction()
    expect(prototypeConnection(prototypeInteractions(button)[1])?.id).toBe(connection.id)
  })

  test('refuses invalid/cross-page destinations and preserves unsupported click actions', () => {
    const { editor, second, button } = scene()
    expect(() => editor.setPrototypeConnection(button.id, 'missing')).toThrow()
    expect(() => editor.setPrototypeConnection(button.id, button.id)).toThrow()
    const otherPage = editor.graph.createNode('CANVAS', editor.graph.rootId)
    const other = editor.graph.createNode('FRAME', otherPage.id)
    expect(() => editor.setPrototypeConnection(button.id, other.id)).toThrow()
    const original = {
      event: { interactionType: 'ON_CLICK' },
      actions: [{ connectionType: 'BACK' }]
    }
    button.source.fig.rawNodeFields.prototypeInteractions = [original]
    expect(() => editor.setPrototypeConnection(button.id, second.id)).toThrow('already')
    expect(() => editor.removePrototypeConnection(button.id, 'missing')).toThrow()
    expect(prototypeInteractions(button)).toEqual([original])
    editor.state.readOnly = true
    expect(() => editor.setPrototypeStart(second.id)).toThrow()
  })

  test('real binary .fig save/reopen retains connection GUIDs, start and unsupported data', async () => {
    const { editor, first, second, button, pageId } = scene()
    button.source.fig.rawNodeFields.prototypeInteractions = [structuredClone(unsupported)]
    editor.setPrototypeConnection(button.id, second.id)
    editor.setPrototypeStart(first.id)
    const connection = prototypeConnection(prototypeInteractions(button)[1])
    const bytes = await exportFigFile(editor.graph)
    const reopened = await parseFigFile(bytes.slice().buffer)
    const restored = reopened.getNode(button.id)
    expect(restored).toBeDefined()
    if (!restored) throw new Error('Hotspot was lost')
    expect(prototypeConnection(prototypeInteractions(restored)[1])).toEqual(connection)
    expect(prototypeInteractions(restored)[0]).toEqual(unsupported)
    expect(prototypeStart(reopened, pageId)?.id).toBe(first.id)
  })
  test('hotspots follow world transforms, ancestor clipping, visibility and valid targets', () => {
    const { editor, first, second, button } = scene()
    first.clipsContent = true
    editor.setPrototypeConnection(button.id, second.id)
    expect(prototypeHotspots(editor.graph, first.id)[0]?.polygon).toEqual([
      { x: 10, y: 20 },
      { x: 90, y: 20 },
      { x: 90, y: 60 },
      { x: 10, y: 60 }
    ])
    button.rotation = 90
    const rotated = prototypeHotspots(editor.graph, first.id)[0]?.polygon ?? []
    expect(Math.min(...rotated.map((point) => point.x))).toBeCloseTo(30)
    expect(Math.max(...rotated.map((point) => point.x))).toBeCloseTo(70)
    button.rotation = 0
    const clip = editor.graph.createNode('FRAME', first.id, {
      x: 100,
      y: 100,
      width: 40,
      height: 40,
      clipsContent: true
    })
    const nested = editor.graph.createNode('RECTANGLE', clip.id, {
      name: 'Clipped',
      x: 30,
      y: 0,
      width: 30,
      height: 30
    })
    editor.setPrototypeConnection(nested.id, second.id)
    const hotspot = prototypeHotspots(editor.graph, first.id).find(
      (entry) => entry.nodeId === nested.id
    )
    expect(
      hotspot?.polygon.every(
        (point) => point.x >= 130 && point.x <= 140 && point.y >= 100 && point.y <= 130
      )
    ).toBe(true)
    clip.visible = false
    expect(prototypeHotspots(editor.graph, first.id).map((entry) => entry.nodeId)).toEqual([
      button.id
    ])
    editor.graph.deleteNode(second.id)
    expect(prototypeHotspots(editor.graph, first.id)).toEqual([])
  })

  test('malformed imported metadata is retained rather than replaced', () => {
    const { editor, second, button } = scene()
    const malformed = { futureFormat: true }
    button.source.fig.rawNodeFields.prototypeInteractions = malformed
    expect(() => editor.setPrototypeConnection(button.id, second.id)).toThrow()
    expect(button.source.fig.rawNodeFields.prototypeInteractions).toEqual(malformed)
  })
  test('a pending canvas nudge remains before a later prototype connection in undo history', () => {
    const { editor, first, second, button } = scene()
    editor.select([first.id])
    editor.nudgeSelected(1, 0)
    editor.setPrototypeConnection(button.id, second.id)
    editor.undoAction()
    expect(prototypeInteractions(button)).toEqual([])
    expect(first.x).toBe(1)
    editor.undoAction()
    expect(first.x).toBe(0)
  })
})
