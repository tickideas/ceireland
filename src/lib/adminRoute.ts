import { NextRequest, NextResponse } from 'next/server'
import type { z } from 'zod'
import { verifyAdminFromRequest } from './adminAuth'
import type { JWTPayload } from './auth'
import { safeValidate, formatZodErrors } from './validation'
import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  errorResponse,
} from './errors'

/**
 * adminRoute() — single seam for admin-gated Next.js route handlers.
 *
 * Owns auth, body/query/params validation, error shaping, logging, and
 * JSON wrapping. Handlers contain only domain logic. They may return:
 *   - any plain JS value → wrapped in NextResponse.json (status 200)
 *   - `undefined` → wrapped as JSON `null` (status 200)
 *   - a Response/NextResponse → passed through untouched (handler owns status,
 *     headers, and body — use this for non-200 success, streaming, or non-JSON)
 *
 * Throwing an AppError from a handler produces the canonical
 * errorToResponse() shape via errorResponse() (which also logs).
 */

type ZodAny = z.ZodType<unknown>

type Infer<S extends ZodAny | undefined> = S extends ZodAny ? z.infer<S> : undefined

export interface AdminRouteSchemas<
  B extends ZodAny | undefined = undefined,
  Q extends ZodAny | undefined = undefined,
  P extends ZodAny | undefined = undefined,
> {
  body?: B
  query?: Q
  params?: P
}

export interface AdminRouteContext<
  B extends ZodAny | undefined = undefined,
  Q extends ZodAny | undefined = undefined,
  P extends ZodAny | undefined = undefined,
> {
  request: NextRequest
  user: JWTPayload
  body: Infer<B>
  query: Infer<Q>
  params: Infer<P>
}

export type AdminRouteHandler<
  B extends ZodAny | undefined,
  Q extends ZodAny | undefined,
  P extends ZodAny | undefined,
> = (ctx: AdminRouteContext<B, Q, P>) => Promise<unknown> | unknown

interface NextRouteArgs {
  // Next.js 16 may also pass `string[]` for catch-all routes (`[...slug]`).
  // No migrated route uses catch-all today, but the type stays permissive so
  // future catch-all routes can adopt the seam without widening this contract.
  params?: Promise<Record<string, string | string[]>>
}

function logContextFromRequest(request: NextRequest): string {
  const method = request.method ?? 'REQUEST'
  try {
    const url = new URL(request.url)
    return `${method} ${url.pathname}`
  } catch {
    return method
  }
}

async function parseBody(request: NextRequest): Promise<unknown> {
  // Routes call this only when a body schema is provided. An empty body
  // is treated as `{}` so partial schemas still work.
  try {
    const parsed = await request.json()
    return parsed ?? {}
  } catch {
    throw new ValidationError('Invalid JSON body')
  }
}

function validateOrThrow<S extends ZodAny>(schema: S, data: unknown): z.infer<S> {
  const result = safeValidate(schema, data)
  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.errors).join(', '))
  }
  return result.data as z.infer<S>
}

function wrapResult(result: unknown): NextResponse {
  if (result instanceof Response) {
    // Includes NextResponse (extends Response). Pass through.
    return result as NextResponse
  }
  return NextResponse.json(result ?? null)
}

export function adminRoute<
  B extends ZodAny | undefined = undefined,
  Q extends ZodAny | undefined = undefined,
  P extends ZodAny | undefined = undefined,
>(
  schemas: AdminRouteSchemas<B, Q, P>,
  handler: AdminRouteHandler<B, Q, P>,
): (request: NextRequest, args?: NextRouteArgs) => Promise<NextResponse> {
  return async (request, args) => {
    const logCtx = logContextFromRequest(request)
    try {
      const adminResult = await verifyAdminFromRequest(request)
      if (!adminResult.success) {
        // Convert the discriminated result into a thrown AppError so the
        // response shape matches every other error path.
        if (adminResult.status === 429) {
          throw new RateLimitError(adminResult.error)
        }
        // 401 from verifyAdminFromRequest covers both "no token" and
        // "non-admin token"; both surface as Unauthorized to the client.
        throw new AuthenticationError(adminResult.error)
      }

      let body: unknown = undefined
      if (schemas.body) {
        body = validateOrThrow(schemas.body, await parseBody(request))
      }

      let query: unknown = undefined
      if (schemas.query) {
        const url = new URL(request.url)
        query = validateOrThrow(
          schemas.query,
          Object.fromEntries(url.searchParams.entries()),
        )
      }

      let params: unknown = undefined
      if (schemas.params) {
        // `await undefined` resolves to undefined, so the optional chain is
        // safe even when Next.js passes no second arg (non-dynamic routes).
        const raw = (await args?.params) ?? {}
        params = validateOrThrow(schemas.params, raw)
      }

      const result = await handler({
        request,
        user: adminResult.payload,
        body: body as Infer<B>,
        query: query as Infer<Q>,
        params: params as Infer<P>,
      })

      return wrapResult(result)
    } catch (error) {
      // errorResponse() discriminates AppError vs unknown internally — one path.
      return errorResponse(error, logCtx)
    }
  }
}
