/**
 * AleoService - Handles all Aleo blockchain interactions
 * 
 * This service provides:
 * - Network client for reading public state (mappings)
 * - Transaction building helpers
 * - Program execution utilities
 */

import { ALEO_CONFIG } from '../config'

class AleoService {
    constructor() {
        this.rpcUrl = ALEO_CONFIG.rpcUrl
        this.programId = ALEO_CONFIG.programId
    }

    /**
     * Read a mapping value from the program
     * @param {string} mappingName - Name of the mapping (e.g., 'markets', 'pools')
     * @param {string} key - The key to look up
     * @returns {Promise<string|null>} - The mapping value or null if not found
     */
    async getMappingValue(mappingName, key) {
        try {
            const url = `${this.rpcUrl}/testnet/program/${this.programId}/mapping/${mappingName}/${key}`
            const response = await fetch(url)

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`Mapping ${mappingName}[${key}] not found`)
                    return null
                }
                throw new Error(`Failed to fetch mapping: ${response.statusText}`)
            }

            const data = await response.text()
            return data || null
        } catch (error) {
            console.error(`Error reading mapping ${mappingName}[${key}]:`, error)
            return null
        }
    }

    /**
     * Get market info from the markets mapping
     * @param {string} marketId - The market ID (field value)
     * @returns {Promise<Object|null>} - Parsed market info or null
     */
    async getMarket(marketId) {
        // API requires the 'field' suffix for field-type keys
        const key = String(marketId).includes('field') ? marketId : `${marketId}field`
        const value = await this.getMappingValue(ALEO_CONFIG.mappings.markets, key)
        if (!value) return null

        return this.parseMarketInfo(value)
    }

    /**
     * Get pool state from the pools mapping
     * @param {string} marketId - The market ID (field value)
     * @returns {Promise<Object|null>} - Parsed pool state or null
     */
    async getPool(marketId) {
        // API requires the 'field' suffix for field-type keys
        const key = String(marketId).includes('field') ? marketId : `${marketId}field`
        const value = await this.getMappingValue(ALEO_CONFIG.mappings.pools, key)
        if (!value) return null

        return this.parsePoolState(value)
    }

    /**
     * Parse MarketInfo struct from Aleo format
     * Handles both compact and pretty-printed JSON-like formats from API
     */
    parseMarketInfo(value) {
        try {
            // Remove quotes, newlines, and extra whitespace
            const cleaned = value.replace(/^"|"$/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim()
            
            // Extract individual fields using flexible patterns
            const creatorMatch = cleaned.match(/creator:\s*(aleo1[a-z0-9]+)/)
            const resolutionMatch = cleaned.match(/resolution_height:\s*(\d+)u32/)
            const resolvedMatch = cleaned.match(/resolved:\s*(true|false)/)
            const outcomeMatch = cleaned.match(/winning_outcome:\s*(\d+)u8/)

            if (!creatorMatch || !resolutionMatch || !resolvedMatch || !outcomeMatch) {
                console.warn('Could not parse MarketInfo:', value)
                return null
            }

            return {
                creator: creatorMatch[1],
                resolutionHeight: parseInt(resolutionMatch[1]),
                resolved: resolvedMatch[1] === 'true',
                winningOutcome: parseInt(outcomeMatch[1]),
            }
        } catch (error) {
            console.error('Error parsing MarketInfo:', error)
            return null
        }
    }

    /**
     * Parse PoolState struct from Aleo format
     * Handles both compact and pretty-printed JSON-like formats from API
     */
    parsePoolState(value) {
        try {
            // Remove quotes, newlines, and extra whitespace
            const cleaned = value.replace(/^"|"$/g, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim()
            
            // Extract individual fields using flexible patterns
            const yesMatch = cleaned.match(/total_yes:\s*(\d+)u64/)
            const noMatch = cleaned.match(/total_no:\s*(\d+)u64/)
            const poolMatch = cleaned.match(/total_pool:\s*(\d+)u64/)

            if (!yesMatch || !noMatch || !poolMatch) {
                console.warn('Could not parse PoolState:', value)
                return null
            }

            return {
                totalYes: parseInt(yesMatch[1]),
                totalNo: parseInt(noMatch[1]),
                totalPool: parseInt(poolMatch[1]),
            }
        } catch (error) {
            console.error('Error parsing PoolState:', error)
            return null
        }
    }

    /**
     * Check if the program exists on the network
     * @returns {Promise<boolean>}
     */
    async programExists() {
        try {
            const url = `${this.rpcUrl}/testnet/program/${this.programId}`
            console.log('Checking program at:', url)
            const response = await fetch(url)
            console.log('Program exists:', response.ok)
            return response.ok
        } catch (error) {
            console.error('Error checking program:', error)
            return false
        }
    }

    /**
     * Get current block height from the network
     * @returns {Promise<number>}
     */
    async getCurrentBlockHeight() {
        try {
            const url = `${this.rpcUrl}/testnet/block/height/latest`
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error('Failed to fetch block height')
            }
            const height = await response.text()
            return parseInt(height)
        } catch (error) {
            console.error('Error fetching block height:', error)
            return 14000000
        }
    }

    /**
     * Get recent transactions for the program
     * @param {number} limit - Number of transactions to fetch
     * @returns {Promise<Array>}
     */
    async getRecentTransactions(limit = 10) {
        try {
            const url = `${this.rpcUrl}/testnet/program/${this.programId}/transactions?limit=${limit}`
            const response = await fetch(url)

            if (!response.ok) {
                return []
            }

            return await response.json()
        } catch (error) {
            console.error('Error fetching transactions:', error)
            return []
        }
    }

    /**
     * Get transaction details
     * @param {string} txId - Transaction ID
     * @returns {Promise<Object|null>}
     */
    async getTransaction(txId) {
        try {
            const url = `${this.rpcUrl}/testnet/transaction/${txId}`
            const response = await fetch(url)

            if (!response.ok) {
                return null
            }

            return await response.json()
        } catch (error) {
            console.error('Error fetching transaction:', error)
            return null
        }
    }

    /**
     * Build transaction inputs for place_bet
     * @param {string} marketId - Market ID
     * @param {number} outcome - 0 for NO, 1 for YES
     * @param {number} amount - Bet amount in microcredits
     * @returns {Array<string>}
     */
    buildPlaceBetInputs(marketId, outcome, amount) {
        return [
            `${marketId}field`,
            `${outcome}u8`,
            `${amount}u64`,
        ]
    }

    /**
     * Build transaction inputs for create_market
     * @param {string} marketId - Market ID
     * @param {number} resolutionHeight - Block height for resolution
     * @param {string} questionHash - Hash of the question text
     * @returns {Array<string>}
     */
    buildCreateMarketInputs(marketId, resolutionHeight, questionHash) {
        return [
            `${marketId}field`,
            `${resolutionHeight}u32`,
            `${questionHash}field`,
        ]
    }
    
    /**
     * Get total market count from on-chain registry
     * @returns {Promise<number>}
     */
    async getMarketCount() {
        try {
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketCount, '0u64')
            if (!value) return 0
            // Parse u64 value
            const match = value.match(/(\d+)u64/)
            return match ? parseInt(match[1]) : 0
        } catch (error) {
            console.error('Error getting market count:', error)
            return 0
        }
    }
    
    /**
     * Get market ID at a specific index in the registry
     * @param {number} index - Index in the registry
     * @returns {Promise<string|null>}
     */
    async getMarketIdAtIndex(index) {
        try {
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketIds, `${index}u64`)
            if (!value) return null
            // Parse field value
            const match = value.match(/(\d+)field/)
            return match ? match[1] : null
        } catch (error) {
            console.error(`Error getting market ID at index ${index}:`, error)
            return null
        }
    }
    
    /**
     * Get question hash for a market
     * @param {string} marketId - Market ID
     * @returns {Promise<string|null>}
     */
    async getMarketQuestionHash(marketId) {
        try {
            const key = String(marketId).includes('field') ? marketId : `${marketId}field`
            const value = await this.getMappingValue(ALEO_CONFIG.mappings.marketQuestions, key)
            if (!value) return null
            const match = value.match(/(\d+)field/)
            return match ? match[1] : null
        } catch (error) {
            console.error(`Error getting question hash for market ${marketId}:`, error)
            return null
        }
    }
    
    /**
     * Fetch all markets from on-chain registry
     * @returns {Promise<Array>}
     */
    async getAllMarkets() {
        try {
            const count = await this.getMarketCount()
            console.log('Total markets on-chain:', count)
            
            if (count === 0) return []
            
            const markets = []
            for (let i = 0; i < count; i++) {
                const marketId = await this.getMarketIdAtIndex(i)
                if (marketId) {
                    const marketInfo = await this.getMarket(marketId)
                    const poolState = await this.getPool(marketId)
                    const questionHash = await this.getMarketQuestionHash(marketId)
                    
                    markets.push({
                        id: marketId,
                        questionHash: questionHash,
                        ...marketInfo,
                        ...poolState,
                    })
                }
            }
            
            return markets
        } catch (error) {
            console.error('Error fetching all markets:', error)
            return []
        }
    }

    /**
     * Build transaction inputs for resolve_market
     * @param {string} marketId - Market ID
     * @param {number} winningOutcome - 0 for NO, 1 for YES
     * @returns {Array<string>}
     */
    buildResolveMarketInputs(marketId, winningOutcome) {
        return [
            `${marketId}field`,
            `${winningOutcome}u8`,
        ]
    }
}

export const aleoService = new AleoService()
export default aleoService
