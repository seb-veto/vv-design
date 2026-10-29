import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { prototypeDestinationAt, prototypeLinkGeometry } from '@/app/editor/prototype/connections'

test('connection anchors and target picking share the canvas viewport and world transforms', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const first = graph.createNode('FRAME', page.id, { width: 100, height: 80 })
  const next = graph.createNode('RECTANGLE', first.id, { x: 10, y: 20, width: 20, height: 20 })
  const second = graph.createNode('FRAME', page.id, { x: 200, width: 100, height: 80 })
  const view = { panX: 10, panY: 20, zoom: 2 }
  const link = prototypeLinkGeometry(graph, next, second, view)
  expect(link.from).toEqual({ x: 70, y: 80 })
  expect(link.to).toEqual({ x: 410, y: 100 })
  expect(prototypeDestinationAt(graph, page.id, { x: 450, y: 100 }, view)?.id).toBe(second.id)
  expect(prototypeDestinationAt(graph, page.id, { x: 350, y: 100 }, view)).toBeNull()
  second.rotation = 90
  expect(prototypeDestinationAt(graph, page.id, { x: 510, y: 100 }, view)?.id).toBe(second.id)
  second.visible = false
  expect(prototypeDestinationAt(graph, page.id, { x: 510, y: 100 }, view)).toBeNull()
})
