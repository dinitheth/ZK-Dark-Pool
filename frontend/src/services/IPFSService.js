const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
]

const IPFS_INDEX_KEY = 'zk_darkpool_ipfs_index'

class IPFSService {
    constructor() {
        this.index = this.loadIndex()
    }

    loadIndex() {
        try {
            const stored = localStorage.getItem(IPFS_INDEX_KEY)
            return stored ? JSON.parse(stored) : {}
        } catch {
            return {}
        }
    }

    saveIndex() {
        localStorage.setItem(IPFS_INDEX_KEY, JSON.stringify(this.index))
    }

    async hashQuestion(question) {
        const encoder = new TextEncoder()
        const data = encoder.encode(question)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        const hashBigInt = BigInt('0x' + hashHex.slice(0, 16))
        return hashBigInt
    }

    async uploadQuestion(questionData) {
        const question = questionData.question
        const hash = await this.hashQuestion(question)
        
        const content = JSON.stringify({
            question: question,
            category: questionData.category || 'general',
            createdAt: questionData.createdAt || Date.now(),
            hash: hash.toString(),
            version: 1,
        })

        let cid = null

        try {
            const blob = new Blob([content], { type: 'application/json' })
            const formData = new FormData()
            formData.append('file', blob, 'question.json')
            
            const response = await fetch('https://api.web3.storage/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                cid = data.cid
                console.log('Uploaded to IPFS:', cid)
            }
        } catch (error) {
            console.log('IPFS upload unavailable, using local storage')
        }

        this.index[hash.toString()] = {
            question: question,
            cid: cid,
            createdAt: Date.now(),
        }
        this.saveIndex()

        return {
            hash: hash,
            cid: cid,
        }
    }

    async fetchQuestion(questionHash) {
        const hashStr = typeof questionHash === 'bigint' ? questionHash.toString() : String(questionHash)
        
        if (this.index[hashStr]) {
            return this.index[hashStr].question
        }

        const cid = this.index[hashStr]?.cid
        if (cid) {
            for (const gateway of IPFS_GATEWAYS) {
                try {
                    const response = await fetch(`${gateway}${cid}`, {
                        signal: AbortSignal.timeout(5000),
                    })

                    if (response.ok) {
                        const data = await response.json()
                        this.index[hashStr] = {
                            question: data.question,
                            cid: cid,
                            createdAt: Date.now(),
                        }
                        this.saveIndex()
                        return data.question
                    }
                } catch (error) {
                    console.log(`Gateway ${gateway} failed, trying next...`)
                }
            }
        }

        return null
    }

    getQuestionByHash(hashStr) {
        return this.index[hashStr]?.question || null
    }

    storeQuestionLocally(hash, question, cid = null) {
        const hashStr = typeof hash === 'bigint' ? hash.toString() : String(hash)
        this.index[hashStr] = {
            question: question,
            cid: cid,
            createdAt: Date.now(),
        }
        this.saveIndex()
    }
}

export const ipfsService = new IPFSService()
export default ipfsService
