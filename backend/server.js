import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'questions.json')

const app = express()
app.use(cors())
app.use(express.json())

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
        }
    } catch (err) {
        console.error('Error loading data:', err)
    }
    return {}
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

let questionIndex = loadData()

app.post('/api/index', (req, res) => {
    const { hash, question, ipfsCid, marketId } = req.body
    
    if (!hash || !question) {
        return res.status(400).json({ error: 'hash and question required' })
    }
    
    const hashStr = String(hash)
    questionIndex[hashStr] = {
        question,
        ipfsCid: ipfsCid || null,
        marketId: marketId || null,
        createdAt: Date.now()
    }
    
    saveData(questionIndex)
    console.log(`Indexed question: ${hashStr.slice(0, 16)}... -> "${question.slice(0, 50)}..."`)
    
    res.json({ success: true, hash: hashStr })
})

app.get('/api/question/:hash', (req, res) => {
    const hashStr = String(req.params.hash)
    const entry = questionIndex[hashStr]
    
    if (entry) {
        res.json(entry)
    } else {
        res.status(404).json({ error: 'Question not found' })
    }
})

app.get('/api/questions', (req, res) => {
    res.json(questionIndex)
})

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', questionCount: Object.keys(questionIndex).length })
})

const PORT = process.env.INDEXER_PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Question indexer running on port ${PORT}`)
    console.log(`Loaded ${Object.keys(questionIndex).length} questions from storage`)
})
