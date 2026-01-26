/**
 * useAleo - Custom hook for Aleo blockchain interaction
 * 
 * Provides easy access to:
 * - Wallet state
 * - AleoService functions
 * - Transaction helpers
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import aleoService from '../services/AleoService'
import { ALEO_CONFIG } from '../config'

export function useAleo() {
    //  Handle wallet context being unavailable during initial render
    let wallet
    try {
        wallet = useWallet()
    } catch (error) {
        // WalletProvider not ready yet - return safe defaults
        console.warn('WalletContext not available yet:', error.message)
        wallet = {
            connected: false,
            publicKey: null,
            wallet: null,
            wallets: [],
            connect: async () => { },
            disconnect: async () => { },
            requestTransaction: async () => { },
        }
    }

    const [programDeployed, setProgramDeployed] = useState(null)
    const [isCheckingProgram, setIsCheckingProgram] = useState(true)

    // Check if the program is deployed on first load
    useEffect(() => {
        const checkProgram = async () => {
            setIsCheckingProgram(true)
            const exists = await aleoService.programExists()
            setProgramDeployed(exists)
            setIsCheckingProgram(false)
        }
        checkProgram()
    }, [])

    // Get market from blockchain
    const getMarket = useCallback(async (marketId) => {
        return await aleoService.getMarket(marketId)
    }, [])

    // Get pool from blockchain
    const getPool = useCallback(async (marketId) => {
        return await aleoService.getPool(marketId)
    }, [])

    // Get full market data (market + pool)
    const getMarketWithPool = useCallback(async (marketId) => {
        const [market, pool] = await Promise.all([
            aleoService.getMarket(marketId),
            aleoService.getPool(marketId)
        ])

        if (!market) return null

        return {
            ...market,
            totalYes: pool?.totalYes || 0,
            totalNo: pool?.totalNo || 0,
            totalPool: pool?.totalPool || 0,
        }
    }, [])

    return {
        // Wallet state
        ...wallet,

        // Program state
        programDeployed,
        isCheckingProgram,
        programId: ALEO_CONFIG.programId,

        // AleoService functions
        getMarket,
        getPool,
        getMarketWithPool,
        aleoService,

        // Config
        config: ALEO_CONFIG,
    }
}

export default useAleo
