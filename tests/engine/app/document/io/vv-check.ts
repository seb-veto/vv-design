import { afterEach, expect, test } from 'bun:test'

Reflect.set(globalThis, '__VV_DESIGN__', true)
Reflect.set(globalThis, '__OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__', 'http://127.0.0.1:46180')
const { vvFileURL, writeVVFile } = await import('@/app/document/io/vv')
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('only the pinned file origin receives a write credential', async () => {
  let requests = 0
  globalThis.fetch = (async () => {
    requests++
    return new Response()
  }) as typeof fetch
  for (const path of [
    'https://example.com/files/design.fig',
    'http://127.0.0.1:46181/files/design.fig',
    'http://user@127.0.0.1:46180/files/design.fig',
    'http://127.0.0.1:46180/files/design.fig?token=bad',
    'http://127.0.0.1:46180/health',
    '/tmp/design.fig'
  ]) {
    expect(vvFileURL(path)).toBeNull()
  }
  await expect(
    writeVVFile(new URL('https://example.com/files/design.fig'), new Uint8Array())
  ).rejects.toThrow()
  expect(requests).toBe(0)
})

test('a failed write propagates and the credential stays in the authorization header', async () => {
  const token = 'a'.repeat(64)
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    if (url === '/__vv-design/runtime') return Response.json({ token })
    expect(String(url)).not.toContain(token)
    expect(init?.method).toBe('PUT')
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${token}`)
    return new Response('disk failure', { status: 500 })
  }) as typeof fetch
  await expect(
    writeVVFile(new URL('http://127.0.0.1:46180/files/design.fig'), new Uint8Array([1]))
  ).rejects.toThrow('500')
})
