const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
]

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL || ''

class IPFSService {
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

        let ipfsCid = null

        try {
            const content = JSON.stringify({
                question: question,
                category: questionData.category || 'general',
                createdAt: questionData.createdAt || Date.now(),
                hash: hash.toString(),
                version: 1,
            })

            const blob = new Blob([content], { type: 'application/json' })
            const formData = new FormData()
            formData.append('file', blob, 'question.json')

            const response = await fetch('https://api.web3.storage/upload', {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                ipfsCid = data.cid
                console.log('Uploaded to IPFS:', ipfsCid)
            }
        } catch (error) {
            console.log('IPFS upload unavailable, using indexer only')
        }

        await this.indexQuestion(hash.toString(), question, ipfsCid, questionData.marketId)

        return {
            hash: hash,
            cid: ipfsCid,
        }
    }

    async indexQuestion(hash, question, ipfsCid = null, marketId = null) {
        try {
            const response = await fetch(`${INDEXER_URL}/api/index`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, question, ipfsCid, marketId })
            })

            if (response.ok) {
                console.log('Question indexed successfully')
                return true
            }
        } catch (error) {
            console.warn('Failed to index question:', error)
        }
        return false
    }

    async fetchQuestion(questionHash) {
        const hashStr = typeof questionHash === 'bigint' ? questionHash.toString() : String(questionHash)

        try {
            const response = await fetch(`${INDEXER_URL}/api/question/${hashStr}`)
            if (response.ok) {
                const data = await response.json()
                return data.question
            }
        } catch (error) {
            console.warn('Indexer fetch failed:', error)
        }

        return null
    }

    async fetchQuestionWithCid(questionHash) {
        const hashStr = typeof questionHash === 'bigint' ? questionHash.toString() : String(questionHash)

        try {
            const response = await fetch(`${INDEXER_URL}/api/question/${hashStr}`)
            if (response.ok) {
                const data = await response.json()

                if (data.ipfsCid && !data.question) {
                    const ipfsQuestion = await this.fetchFromIPFS(data.ipfsCid)
                    if (ipfsQuestion) return ipfsQuestion
                }

                return data.question
            }
        } catch (error) {
            console.warn('Fetch failed:', error)
        }

        return null
    }

    async fetchFromIPFS(cid) {
        for (const gateway of IPFS_GATEWAYS) {
            try {
                const response = await fetch(`${gateway}${cid}`, {
                    signal: AbortSignal.timeout(5000),
                })
                if (response.ok) {
                    const data = await response.json()
                    return data.question
                }
            } catch (error) {
                continue
            }
        }
        return null
    }

    getQuestionByHash(hashStr) {
        return null
    }

    storeQuestionLocally(hash, question, cid = null) {
        this.indexQuestion(String(hash), question, cid)
    }
}

export const ipfsService = new IPFSService()
export default ipfsService
