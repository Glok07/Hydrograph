// Serveur local qui expose les fonctions de api/ comme Vercel le fait. Lancer : npm run api
import 'dotenv/config'
import http from 'node:http'
import * as alertsSend from '../api/alerts/send.js'
import * as chat from '../api/chat/index.js'
import * as history from '../api/history/index.js'
import * as network from '../api/network/index.js'
import * as planAi from '../api/plan/ai.js'
import * as subscribers from '../api/subscribers/index.js'
import * as verify from '../api/subscribers/verify.js'
import * as webhook from '../api/whatsapp/webhook.js'

type Handlers = Partial<Record<'GET' | 'POST' | 'PUT', (r: Request) => Response | Promise<Response>>>
const routes: Record<string, Handlers> = {
  '/api/subscribers': subscribers,
  '/api/subscribers/verify': verify,
  '/api/alerts/send': alertsSend,
  '/api/plan/ai': planAi,
  '/api/whatsapp/webhook': webhook,
  '/api/network': network,
  '/api/history': history,
  '/api/chat': chat,
}

const PORT = Number(process.env.PORT ?? 8787)

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
    const handler = routes[url.pathname]?.[req.method as 'GET' | 'POST' | 'PUT']
    if (!handler) {
      res.writeHead(404).end('not found')
      return
    }
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    try {
      const out = await handler(new Request(url, { method: req.method, headers: req.headers as Record<string, string>, body }))
      res.writeHead(out.status, Object.fromEntries(out.headers))
      res.end(await out.text())
    } catch (e) {
      console.error(e)
      res.writeHead(500).end('erreur serveur')
    }
  })
  .listen(PORT, () => console.log(`API locale sur http://localhost:${PORT}`))
