import express from 'express'
import { taskRouter } from './routes/tasks.js'
import { userRouter } from './routes/users.js'

const app = express()
app.use(express.json())

app.use('/api/tasks', taskRouter)
app.use('/api/users', userRouter)

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
