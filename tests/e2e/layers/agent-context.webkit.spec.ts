import { expect, test } from '@playwright/test'

import { observeAgentContext, readAgentContext } from '#tests/helpers/agent-context'
import { CanvasHelper } from '#tests/helpers/canvas'

test.skip(process.env.VITE_VV_DESIGN !== '1', 'Agent context belongs to VV Design')
test.setTimeout(60000)

test('separate editor windows publish unique document targets and follow page changes', async ({
  page,
  browser
}) => {
  await observeAgentContext(page)
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.getByRole('button', { name: 'Agents', exact: true }).click()
  await expect.poll(() => readAgentContext(page)).not.toBeNull()
  const first = await readAgentContext(page)
  expect(first?.documentId).toMatch(/^tab-[0-9a-f-]{36}$/)

  const other = await browser.newPage()
  try {
    await observeAgentContext(other)
    await other.goto(new URL('/?test', page.url()).href)
    await new CanvasHelper(other).waitForInit()
    await other.getByRole('button', { name: 'Agents', exact: true }).click()
    await expect.poll(() => readAgentContext(other)).not.toBeNull()
    expect((await readAgentContext(other))?.documentId).not.toBe(first?.documentId)
  } finally {
    await other.close()
  }
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('button', { name: 'Add page', exact: true }).click()
  await page.getByRole('button', { name: 'Agents', exact: true }).click()
  await expect.poll(async () => (await readAgentContext(page))?.pageId).not.toBe(first?.pageId)
  expect((await readAgentContext(page))?.documentId).toBe(first?.documentId)
})
