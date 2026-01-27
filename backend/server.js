import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// MongoDB Connection Pattern for Serverless
const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
    console.warn('Warning: MONGODB_URI is not defined in environment variables.')
}

let cached = global.mongoose

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            }
        }

        console.log('Connecting to MongoDB...')
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
            console.log('Connected to MongoDB successfully')
            return mongoose
        }).catch(err => {
            console.error('MongoDB connection error:', err)
            throw err
        })
    }

    try {
        cached.conn = await cached.promise
    } catch (e) {
        cached.promise = null
        throw e
    }

    return cached.conn
}

// Routes
app.use(async (req, res, next) => {
    // Ensure DB is connected before handling request
    if (MONGODB_URI) {
        try {
            await connectToDatabase()
        } catch (error) {
            console.error("Database connection failed for request")
        }
    }
    next()
})

// Schema Definition
const QuestionSchema = new mongoose.Schema({
    hash: { type: String, required: true, unique: true },
    question: { type: String, required: true },
    ipfsCid: String,
    marketId: String,
    createdAt: { type: Number, default: Date.now }
})

const Question = mongoose.model('Question', QuestionSchema)

// Routes
app.post('/api/index', async (req, res) => {
    const { hash, question, ipfsCid, marketId } = req.body

    if (!hash || !question) {
        return res.status(400).json({ error: 'hash and question required' })
    }

    try {
        const hashStr = String(hash)

        // Upsert: Update if exists, Insert if new
        await Question.findOneAndUpdate(
            { hash: hashStr },
            {
                hash: hashStr,
                question,
                ipfsCid: ipfsCid || null,
                marketId: marketId || null,
                createdAt: Date.now()
            },
            { upsert: true, new: true }
        )

        console.log(`Indexed question: ${hashStr.slice(0, 16)}...`)
        res.json({ success: true, hash: hashStr })
    } catch (error) {
        console.error('Error indexing question:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/question/:hash', async (req, res) => {
    try {
        const hashStr = String(req.params.hash)
        const entry = await Question.findOne({ hash: hashStr })

        if (entry) {
            res.json({
                question: entry.question,
                ipfsCid: entry.ipfsCid,
                marketId: entry.marketId,
                createdAt: entry.createdAt
            })
        } else {
            res.status(404).json({ error: 'Question not found' })
        }
    } catch (error) {
        console.error('Error fetching question:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/questions', async (req, res) => {
    try {
        const questions = await Question.find().sort({ createdAt: -1 })

        // Convert array to object map to match original API format if needed
        // But frontend likely iterates over values.
        // Let's match the original format: { hash: { ... } }
        const questionIndex = {}
        questions.forEach(q => {
            questionIndex[q.hash] = {
                question: q.question,
                ipfsCid: q.ipfsCid,
                marketId: q.marketId,
                createdAt: q.createdAt
            }
        })

        res.json(questionIndex)
    } catch (error) {
        console.error('Error fetching questions:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Question indexer running on port ${PORT}`)
})
