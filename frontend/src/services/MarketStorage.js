/**
 * MarketStorage - Client-side market tracking
 * 
 * Since Aleo doesn't have event indexing yet, we track created markets in localStorage
 * This allows us to discover and display markets without needing a backend indexer
 */

const STORAGE_KEY = 'zk_dark_pool_markets'

class MarketStorage {
    /**
     * Get all tracked market IDs
     * @returns {Array<string>} Array of market IDs (field values)
     */
    getMarketIds() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch (error) {
            console.error('Error reading market storage:', error)
            return []
        }
    }

    /**
     * Add a new market to tracking
     * @param {string} marketId - Market ID to track
     * @param {string} question - Market question (for display)
     * @param {string} ipfsCid - IPFS CID for the question (optional)
     */
    async addMarket(marketId, question, ipfsCid = null) {
        try {
            const cleanId = String(marketId).replace('field', '')

            const response = await fetch('/api/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    marketId: cleanId,
                    question: question,
                    hash: '0',
                    ipfsCid: ipfsCid || ''
                })
            })

            if (response.ok) {
                console.log('Market manually indexed in backend:', cleanId)
            } else {
                console.error('Failed to index market in backend')
            }

            // Legacy LocalStorage support (optional, can keep for local testing without internet)
            const markets = this.getMarketIds()
            const exists = markets.some(m => m.id === marketId)
            if (!exists) {
                markets.push({
                    id: marketId,
                    question: question,
                    ipfsCid: ipfsCid,
                    createdAt: Date.now(),
                })
                localStorage.setItem(STORAGE_KEY, JSON.stringify(markets))
            }
        } catch (error) {
            console.error('Error adding market:', error)
        }
    }

    /**
     * Get IPFS CID for a market
     * @param {string} marketId
     * @returns {string|null}
     */
    getMarketIpfsCid(marketId) {
        const markets = this.getMarketIds()
        const market = markets.find(m => String(m.id) === String(marketId))
        return market ? market.ipfsCid : null
    }

    /**
     * Clear all tracked markets (for testing/reset)
     */
    clear() {
        localStorage.removeItem(STORAGE_KEY)
        console.log('Market storage cleared')
    }

    /**
     * Get market question by ID
     * @param {string} marketId
     * @returns {string|null}
     */
    getMarketQuestion(marketId) {
        const markets = this.getMarketIds()
        const market = markets.find(m => m.id === marketId)
        return market ? market.question : null
    }
}

export const marketStorage = new MarketStorage()
export default marketStorage
