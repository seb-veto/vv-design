import { readBoundedBody } from '@/app/document/io/browser'
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
      /\.fig$/i.test(url.pathname) &&
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
  window.dispatchEvent(new Event('vv-design:file-saved'))
}

export function newVVFileURL(name: string): URL {
  return new URL(
    `/files/${crypto.randomUUID()}/${encodeURIComponent(name.replace(/\.fig$/i, ''))}.fig`,
    serverOrigin
  )
}

export function vvDocumentURL(path: string): URL {
  return new URL(`/files/${path.split('/').map(encodeURIComponent).join('/')}`, serverOrigin)
}

export function vvDocumentPath(url: string | null): string | null {
  const file = vvFileURL(url)
  if (!file) return null
  try {
    return file.pathname.slice('/files/'.length).split('/').map(decodeURIComponent).join('/')
  } catch {
    return null
  }
}

/** Titles are metadata; keeping the file URL stable preserves tab and agent identity. */
export async function vvDocumentName(url: URL, name?: string): Promise<string> {
  const path = vvDocumentPath(url.href)
  if (!path) throw new Error('Invalid VV Design document')
  const response = await fetch(`/__vv-design/file-name?id=${encodeURIComponent(path)}`, {
    method: name === undefined ? 'GET' : 'PATCH',
    headers: { ...(await vvFileHeaders()), 'Content-Type': 'application/json' },
    body: name === undefined ? undefined : JSON.stringify(name),
    cache: 'no-store'
  })
  if (!response.ok) throw new Error('Could not save or read the document name')
  const saved: unknown = JSON.parse(new TextDecoder().decode(await readBoundedBody(response, 4096)))
  if (typeof saved !== 'string' || !saved.trim() || saved.length > 255) {
    throw new Error('Invalid VV Design document name')
  }
  if (name !== undefined) window.dispatchEvent(new Event('vv-design:file-saved'))
  return saved
}
