import { Router } from 'express'

const router = Router()

const tasks: Array<{ id: number; title: string; done: boolean }> = []
let nextId = 1

router.get('/', (req, res) => {
  res.json(tasks)
})

router.post('/', (req, res) => {
  const { title } = req.body
  const task = { id: nextId++, title, done: false }
  tasks.push(task)
  res.status(201).json(task)
})

router.patch('/:id', (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id))
  if (!task) return res.status(404).json({ error: 'Not found' })
  if (req.body.title) task.title = req.body.title
  if (req.body.done !== undefined) task.done = req.body.done
  res.json(task)
})

router.delete('/:id', (req, res) => {
  const idx = tasks.findIndex(t => t.id === Number(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  tasks.splice(idx, 1)
  res.status(204).send()
})

export { router as taskRouter }
