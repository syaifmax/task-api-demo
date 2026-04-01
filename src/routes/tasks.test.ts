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

const getHandler = async (method: 'get' | 'post' | 'patch' | 'delete', path: string) => {
  const { taskRouter } = await import('./tasks.js')
  const layer = taskRouter.stack.find(entry => {
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

describe('task routes', () => {
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


  test('GET / returns created tasks', async () => {
    const createHandler = await getHandler('post', '/')
    const listHandler = await getHandler('get', '/')

    createHandler({ body: { title: 'First task' } } as Request, createMockResponse() as unknown as Response, () => undefined)

    const listRes = createMockResponse() as unknown as Response
    listHandler({} as Request, listRes, () => undefined)

    expect((listRes as unknown as MockResponse).statusCode).toBe(200)
    expect((listRes as unknown as MockResponse).payload).toEqual([
      { id: 1, title: 'First task', done: false },
    ])
  })

  test('POST / creates a task', async () => {
    const handler = await getHandler('post', '/')
    const req = { body: { title: 'Write tests' } } as Request
    const res = createMockResponse() as unknown as Response

    handler(req, res, () => undefined)

    expect((res as unknown as MockResponse).statusCode).toBe(201)
    expect((res as unknown as MockResponse).payload).toEqual({
      id: 1,
      title: 'Write tests',
      done: false,
    })
  })

  test('PATCH /:id updates title and done fields', async () => {
    const createHandler = await getHandler('post', '/')
    const updateHandler = await getHandler('patch', '/:id')

    createHandler({ body: { title: 'Old title' } } as Request, createMockResponse() as unknown as Response, () => undefined)

    const updateReq = {
      params: { id: '1' },
      body: { title: 'New title', done: true },
    } as unknown as Request
    const updateRes = createMockResponse() as unknown as Response

    updateHandler(updateReq, updateRes, () => undefined)

    expect((updateRes as unknown as MockResponse).statusCode).toBe(200)
    expect((updateRes as unknown as MockResponse).payload).toEqual({
      id: 1,
      title: 'New title',
      done: true,
    })
  })

  test('PATCH /:id returns 404 when task does not exist', async () => {
    const handler = await getHandler('patch', '/:id')
    const req = { params: { id: '123' }, body: { done: true } } as unknown as Request
    const res = createMockResponse() as unknown as Response

    handler(req, res, () => undefined)

    expect((res as unknown as MockResponse).statusCode).toBe(404)
    expect((res as unknown as MockResponse).payload).toEqual({ error: 'Not found' })
  })

  test('DELETE /:id removes a task', async () => {
    const createHandler = await getHandler('post', '/')
    const deleteHandler = await getHandler('delete', '/:id')

    createHandler({ body: { title: 'Delete me' } } as Request, createMockResponse() as unknown as Response, () => undefined)

    const deleteReq = { params: { id: '1' } } as unknown as Request
    const deleteRes = createMockResponse() as unknown as Response

    deleteHandler(deleteReq, deleteRes, () => undefined)

    expect((deleteRes as unknown as MockResponse).statusCode).toBe(204)
    expect((deleteRes as unknown as MockResponse).sent).toBe(true)
  })

  test('DELETE /:id returns 404 when task does not exist', async () => {
    const handler = await getHandler('delete', '/:id')
    const req = { params: { id: '404' } } as unknown as Request
    const res = createMockResponse() as unknown as Response

    handler(req, res, () => undefined)

    expect((res as unknown as MockResponse).statusCode).toBe(404)
    expect((res as unknown as MockResponse).payload).toEqual({ error: 'Not found' })
  })
})
