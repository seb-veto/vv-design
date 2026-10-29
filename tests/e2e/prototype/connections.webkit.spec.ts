import { expect, test, type Page, type Locator } from '@playwright/test'

import type { Vector } from '@open-pencil/scene-graph/primitives'

import { CanvasHelper } from '#tests/helpers/canvas'
import { createPrototypeScene, prototypeFramePoint, prototypeState } from '#tests/helpers/prototype'

test.skip(process.env.VITE_VV_DESIGN !== '1', 'Prototype canvas controls belong to the VV build')
test.setTimeout(60000)

async function drag(page: Page, handle: Locator, to: Vector) {
  const box = await handle.boundingBox()
  if (!box) throw new Error('Connection handle is unavailable')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

test('canvas connections drag, retarget, cancel, undo and preserve layer identity', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  const scene = await createPrototypeScene(page)
  await canvas.waitForRender()
  await page.getByRole('tab', { name: 'Prototype', exact: true }).click()
  const area = page.getByTestId('canvas-area')
  const point = async (id: string) => {
    const box = await area.boundingBox()
    if (!box) throw new Error('Canvas is unavailable')
    const p = await prototypeFramePoint(page, id)
    return { x: box.x + p.x, y: box.y + p.y }
  }
  await drag(
    page,
    page.getByRole('button', { name: 'Create prototype connection', exact: true }),
    await point(scene.second)
  )
  await expect.poll(async () => (await prototypeState(page, scene.source)).count).toBe(1)
  const destination = page.getByRole('combobox', { name: 'Destination', exact: true })
  await expect(destination).toContainText('Second screen')
  await page.mouse.move(0, 0)
  await expect(area).toHaveScreenshot('prototype-connection.png', {
    maxDiffPixels: 40,
    maxDiffPixelRatio: 0.0001
  })

  const change = page.getByRole('button', { name: 'Change prototype destination', exact: true })
  const original = await prototypeState(page, scene.source)
  await drag(page, change, { x: 20, y: 20 })
  expect(await prototypeState(page, scene.source)).toEqual(original)
  await drag(page, change, await point(scene.third))
  await expect(destination).toContainText('Third screen')
  await change.press('Meta+z')
  await expect(destination).toContainText('Second screen')

  const box = await change.boundingBox()
  if (!box) throw new Error('Handle is unavailable')
  await page.mouse.move(box.x + 12, box.y + 12)
  await page.mouse.down()
  const third = await point(scene.third)
  await page.mouse.move(third.x, third.y, { steps: 8 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await prototypeState(page, scene.source)).toEqual(original)

  await change.press('Enter')
  const picker = page.getByRole('dialog').filter({ hasText: 'On click' })
  await picker.getByRole('combobox', { name: 'Destination', exact: true }).click()
  await page.getByRole('option', { name: 'Third screen', exact: true }).click()
  await expect(destination).toContainText('Third screen')
  await change.press('Delete')
  await expect.poll(async () => (await prototypeState(page, scene.source)).count).toBe(0)
  expect((await prototypeState(page, scene.source)).exists).toBe(true)
  await page
    .getByRole('button', { name: 'Create prototype connection', exact: true })
    .press('Meta+z')
  await expect(destination).toContainText('Third screen')
})
