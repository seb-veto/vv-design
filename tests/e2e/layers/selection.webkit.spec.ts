import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test.setTimeout(60000)

test('layer accessibility follows canvas, additive and keyboard selection', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.drawRect(100, 100, 80, 40)
  await canvas.drawRect(260, 100, 80, 40)
  const rows = page.getByRole('treeitem')
  await expect(rows).toHaveCount(2)
  const first = rows.nth(0)
  const second = rows.nth(1)
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(second).toHaveAttribute('aria-selected', 'false')
  await second.click({ modifiers: ['Meta'] })
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(second).toHaveAttribute('aria-selected', 'true')
  await second.press('Space')
  await expect(first).toHaveAttribute('aria-selected', 'false')
  await expect(second).toHaveAttribute('aria-selected', 'true')
  await second.press('ArrowUp')
  await expect(first).toBeFocused()
  await first.press('Space')
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(second).toHaveAttribute('aria-selected', 'false')
  await expect(first.getByTestId('layers-item')).toHaveAttribute('data-selected')
  await expect(second.getByTestId('layers-item')).not.toHaveAttribute('data-selected')
})
