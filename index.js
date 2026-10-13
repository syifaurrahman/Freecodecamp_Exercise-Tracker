const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// ─── In-memory data store ────────────────────────────────────────────────────
let users = []     // [{ _id, username }]
let exercises = [] // [{ userId, description, duration, date }]

// Simple unique ID generator
function generateId() {
  return Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 10)
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// POST /api/users — create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body
  if (!username) {
    return res.json({ error: 'username is required' })
  }
  const newUser = { _id: generateId(), username }
  users.push(newUser)
  res.json({ username: newUser.username, _id: newUser._id })
})

// GET /api/users — list all users
app.get('/api/users', (req, res) => {
  res.json(users.map(u => ({ username: u.username, _id: u._id })))
})

// POST /api/users/:_id/exercises — add an exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params
  const { description, duration, date } = req.body

  const user = users.find(u => u._id === _id)
  if (!user) {
    return res.json({ error: 'User not found' })
  }

  if (!description || !duration) {
    return res.json({ error: 'description and duration are required' })
  }

  const parsedDuration = parseInt(duration)
  if (isNaN(parsedDuration)) {
    return res.json({ error: 'duration must be a number' })
  }

  // Use provided date or fall back to today
  let exerciseDate
  if (date) {
    exerciseDate = new Date(date)
    if (isNaN(exerciseDate.getTime())) {
      return res.json({ error: 'Invalid date format. Use yyyy-mm-dd' })
    }
  } else {
    exerciseDate = new Date()
  }

  const exercise = {
    userId: _id,
    description,
    duration: parsedDuration,
    date: exerciseDate
  }
  exercises.push(exercise)

  res.json({
    _id: user._id,
    username: user.username,
    date: exerciseDate.toDateString(),
    duration: parsedDuration,
    description
  })
})

// GET /api/users/:_id/logs — retrieve a user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params
  const { from, to, limit } = req.query

  const user = users.find(u => u._id === _id)
  if (!user) {
    return res.json({ error: 'User not found' })
  }

  let log = exercises.filter(e => e.userId === _id)

  // Filter by from date (inclusive)
  if (from) {
    const fromDate = new Date(from)
    if (!isNaN(fromDate.getTime())) {
      log = log.filter(e => e.date >= fromDate)
    }
  }

  // Filter by to date (inclusive)
  if (to) {
    const toDate = new Date(to)
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999)
      log = log.filter(e => e.date <= toDate)
    }
  }

  // Limit number of results
  if (limit) {
    const parsedLimit = parseInt(limit)
    if (!isNaN(parsedLimit)) {
      log = log.slice(0, parsedLimit)
    }
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
