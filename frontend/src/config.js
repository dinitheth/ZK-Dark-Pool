// Aleo Network Configuration
export const ALEO_CONFIG = {
    // Network settings
    network: 'testnet',
    rpcUrl: 'https://api.explorer.provable.com/v1',

    // Program ID - update this after deployment
    programId: 'dark_pool_marketv1.aleo',

    // Fee settings (in microcredits)
    fees: {
        createMarket: 500000,   // 0.5 credits
        placeBet: 100000,       // 0.1 credits
        resolveMarket: 100000,  // 0.1 credits
        claimWinnings: 100000,  // 0.1 credits
    },

    // Mapping names
    mappings: {
        markets: 'markets',
        pools: 'pools',
        marketCount: 'market_count',
        marketIds: 'market_ids',
        marketQuestions: 'market_questions',
    },
}

// Aleo explorer URLs
export const EXPLORER_URLS = {
    testnet: 'https://testnet.explorer.provable.com',
    mainnet: 'https://explorer.provable.com',
}

export const getExplorerUrl = (type, id) => {
    const baseUrl = EXPLORER_URLS[ALEO_CONFIG.network]
    switch (type) {
        case 'transaction':
            return `${baseUrl}/transaction/${id}`
        case 'program':
            return `${baseUrl}/program/${id}`
        case 'address':
            return `${baseUrl}/address/${id}`
        default:
            return baseUrl
    }
}
