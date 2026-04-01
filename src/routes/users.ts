import { Router } from 'express'

const router = Router()

const users: Array<{ id: number; name: string; email: string }> = []
let nextId = 1

router.get('/', (req, res) => {
  res.json(users)
})

router.post('/', (req, res) => {
  const { name, email } = req.body
  const user = { id: nextId++, name, email }
  users.push(user)
  res.status(201).json(user)
})

router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === Number(req.params.id))
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

export { router as userRouter }
