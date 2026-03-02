
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

type PoemPayload = Partial<Pick<Poem, "slug" | "title" | "body">>

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

    // POST /api/poems
    if (request.method === "POST" && url.pathname === "/api/poems") {
      let payload: PoemPayload

      try {
        payload = (await request.json()) as PoemPayload
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 })
      }

      const slug = payload.slug?.trim()
      const title = payload.title?.trim()
      const body = payload.body?.trim()

      if (!slug || !title || !body) {
        return json(
          { error: "Missing required fields: slug, title, body" },
          { status: 400 },
        )
      }

      try {
        await env.DB
          .prepare(
            "INSERT INTO poems (slug, title, body, created_at) VALUES (?, ?, ?, datetime('now'))",
          )
          .bind(slug, title, body)
          .run()
      } catch {
        return json({ error: "Could not insert poem" }, { status: 500 })
      }

      const createdPoem = await env.DB
        .prepare("SELECT * FROM poems WHERE slug = ?")
        .bind(slug)
        .first<Poem>()

      return json(createdPoem, { status: 201 })
    }

    // PUT /api/poems/:slug
    const poemRouteMatch = url.pathname.match(/^\/api\/poems\/([^/]+)$/)
    if (request.method === "PUT" && poemRouteMatch) {
      const targetSlug = decodeURIComponent(poemRouteMatch[1])
      let payload: PoemPayload

      try {
        payload = (await request.json()) as PoemPayload
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 })
      }

      const slug = payload.slug?.trim() || targetSlug
      const title = payload.title?.trim()
      const body = payload.body?.trim()

      if (!slug || !title || !body) {
        return json(
          { error: "Missing required fields: title, body (slug optional)" },
          { status: 400 },
        )
      }

      const currentPoem = await env.DB
        .prepare("SELECT id FROM poems WHERE slug = ?")
        .bind(targetSlug)
        .first<{ id: number }>()

      if (!currentPoem) {
        return json({ error: "Poem not found" }, { status: 404 })
      }

      try {
        await env.DB
          .prepare("UPDATE poems SET slug = ?, title = ?, body = ? WHERE slug = ?")
          .bind(slug, title, body, targetSlug)
          .run()
      } catch {
        return json({ error: "Could not update poem" }, { status: 500 })
      }

      const updatedPoem = await env.DB
        .prepare("SELECT * FROM poems WHERE slug = ?")
        .bind(slug)
        .first<Poem>()

      return json(updatedPoem)
    }

    // DELETE /api/poems/:slug
    if (request.method === "DELETE" && poemRouteMatch) {
      const slug = decodeURIComponent(poemRouteMatch[1])
      const foundPoem = await env.DB
        .prepare("SELECT id FROM poems WHERE slug = ?")
        .bind(slug)
        .first<{ id: number }>()

      if (!foundPoem) {
        return json({ error: "Poem not found" }, { status: 404 })
      }

      try {
        await env.DB
          .prepare("DELETE FROM poems WHERE slug = ?")
          .bind(slug)
          .run()
      } catch {
        return json({ error: "Could not delete poem" }, { status: 500 })
      }

      return new Response(null, { status: 204 })
    }

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
    if (poemRouteMatch) {
      const slug = decodeURIComponent(poemRouteMatch[1])

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
