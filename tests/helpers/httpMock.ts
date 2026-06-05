import http from 'node:http'

export interface MockRoute {
  method: string
  path: string
  status?: number
  body?: unknown
}

export async function startHttpMock(routes: MockRoute[]) {
  const calls: { method: string; url: string; body: string }[] = []
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      calls.push({ method: req.method ?? '', url: req.url ?? '', body })
      const route = routes.find((r) => r.method === req.method && r.path === req.url)
      if (!route) { res.statusCode = 404; res.end('not found'); return }
      res.statusCode = route.status ?? 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(route.body ?? {}))
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as import('node:net').AddressInfo).port
  return {
    port,
    calls,
    close: () => new Promise<void>((r) => server.close(() => r()))
  }
}
