import { expect, test } from 'bun:test'

test('VV file trust boundary and failed writes in an isolated build mode', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/engine/app/document/io/vv-check.ts'],
    {
      cwd: process.cwd(),
      stdout: 'pipe',
      stderr: 'pipe'
    }
  )
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ])
  expect({ code, diagnostics: code ? output + errors : '' }).toEqual({ code: 0, diagnostics: '' })
})
