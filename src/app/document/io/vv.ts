import { IS_VV_DESIGN } from '@/constants'

const serverOrigin =
  typeof __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__ === 'string'
    ? __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__
    : ''

/** Only VV's authenticated, root-confined file endpoint is writable from the browser. */
export function vvFileURL(path: string | null): URL | null {
  if (!IS_VV_DESIGN || !path) return null
  try {
    const url = new URL(path)
    return url.origin === serverOrigin &&
      url.pathname.startsWith('/files/') &&
      url.pathname.endsWith('.fig') &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? url
      : null
  } catch {
    return null
  }
}

export async function vvFileHeaders(): Promise<Record<string, string>> {
  const response = await fetch('/__vv-design/runtime', { cache: 'no-store' })
  if (!response.ok) throw new Error('VV Design file store is unavailable')
  const session: unknown = await response.json()
  if (
    !session ||
    typeof session !== 'object' ||
    !('token' in session) ||
    typeof session.token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(session.token)
  ) {
    throw new Error('VV Design returned an invalid file session')
  }
  return { Authorization: `Bearer ${session.token}` }
}

export async function writeVVFile(url: URL, data: Uint8Array): Promise<void> {
  if (!vvFileURL(url.href)) throw new Error('Invalid VV Design file destination')
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...(await vvFileHeaders()), 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(data)
  })
  if (!response.ok) throw new Error(`VV Design save failed (${response.status})`)
}

export function newVVFileURL(name: string): URL {
  return new URL(
    `/files/${crypto.randomUUID()}/${encodeURIComponent(name.replace(/\.fig$/i, ''))}.fig`,
    serverOrigin
  )
}
