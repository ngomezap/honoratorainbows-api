
export interface Env {
  DB: D1Database
}

type Poem = {
  id: number
  slug: string
  title: string
  body: string
  created_at: string
}

function json<T>(data: T, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    ...init,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 })
    }

    // GET /api/poems
    if (url.pathname === "/api/poems") {
      const { results } = await env.DB
        .prepare("SELECT * FROM poems ORDER BY created_at DESC")
        .all<Poem>()

      return json(results)
    }

    // GET /api/poems/:slug
    const match = url.pathname.match(/^\/api\/poems\/([^/]+)$/)

    if (match) {
      const slug = decodeURIComponent(match[1])

      const poem = await env.DB
        .prepare("SELECT * FROM poems WHERE slug = ?")
        .bind(slug)
        .first<Poem>()

      if (!poem) {
        return new Response("Not found", { status: 404 })
      }

      return json(poem)
    }

    return new Response("API funcionando 🚀")
  },
} satisfies ExportedHandler<Env>