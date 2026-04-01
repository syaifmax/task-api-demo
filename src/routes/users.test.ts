import type { Request, Response, NextFunction } from 'express'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

type JsonValue = Record<string, unknown> | Array<unknown>

type MockResponse = {
  statusCode: number
  payload?: JsonValue
  sent?: boolean
  status: (code: number) => MockResponse
  json: (body: JsonValue) => MockResponse
  send: () => MockResponse
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: JsonValue) {
      this.payload = body
      return this
    },
    send() {
      this.sent = true
      return this
    },
  }

  return response
}

const getHandler = async (method: 'get' | 'post', path: string) => {
  const { userRouter } = await import('./users.js')
  const layer = userRouter.stack.find(entry => {
    const route = entry.route as
      | { path: string; methods: Record<string, boolean>; stack: Array<{ handle: (req: Request, res: Response, next: NextFunction) => unknown }> }
      | undefined

    return route?.path === path && route.methods[method]
  })

  if (!layer || !layer.route) {
    throw new Error(`Route not found for ${method.toUpperCase()} ${path}`)
  }

  const stack = (layer.route as unknown as { stack: Array<{ handle: (req: Request, res: Response, next: NextFunction) => unknown }> }).stack
  return stack[0].handle
}

describe('user routes', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('GET / returns an empty list by default', async () => {
    const handler = await getHandler('get', '/')
    const req = {} as Request
    const res = createMockResponse() as unknown as Response

    handler(req, res, () => undefined)

    expect((res as unknown as MockResponse).statusCode).toBe(200)
    expect((res as unknown as MockResponse).payload).toEqual([])
  })


  test('GET / returns created users', async () => {
    const createHandler = await getHandler('post', '/')
    const listHandler = await getHandler('get', '/')

    createHandler({ body: { name: 'Lin', email: 'lin@example.com' } } as Request, createMockResponse() as unknown as Response, () => undefined)

    const listRes = createMockResponse() as unknown as Response
    listHandler({} as Request, listRes, () => undefined)

    expect((listRes as unknown as MockResponse).statusCode).toBe(200)
    expect((listRes as unknown as MockResponse).payload).toEqual([
      { id: 1, name: 'Lin', email: 'lin@example.com' },
    ])
  })

  test('POST / creates a user and GET /:id retrieves it', async () => {
    const createHandler = await getHandler('post', '/')
    const getByIdHandler = await getHandler('get', '/:id')

    const createReq = { body: { name: 'Ada', email: 'ada@example.com' } } as Request
    const createRes = createMockResponse() as unknown as Response

    createHandler(createReq, createRes, () => undefined)

    expect((createRes as unknown as MockResponse).statusCode).toBe(201)
    expect((createRes as unknown as MockResponse).payload).toEqual({
      id: 1,
      name: 'Ada',
      email: 'ada@example.com',
    })

    const fetchReq = { params: { id: '1' } } as unknown as Request
    const fetchRes = createMockResponse() as unknown as Response

    getByIdHandler(fetchReq, fetchRes, () => undefined)

    expect((fetchRes as unknown as MockResponse).statusCode).toBe(200)
    expect((fetchRes as unknown as MockResponse).payload).toEqual({
      id: 1,
      name: 'Ada',
      email: 'ada@example.com',
    })
  })

  test('GET /:id returns 404 when user is missing', async () => {
    const handler = await getHandler('get', '/:id')
    const req = { params: { id: '999' } } as unknown as Request
    const res = createMockResponse() as unknown as Response

    handler(req, res, () => undefined)

    expect((res as unknown as MockResponse).statusCode).toBe(404)
    expect((res as unknown as MockResponse).payload).toEqual({ error: 'Not found' })
  })
})
