import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { ALEO_CONFIG, getExplorerUrl, API_BASE_URL } from '../config'
import aleoService from '../services/AleoService'
import marketStorage from '../services/MarketStorage'
import ipfsService from '../services/IPFSService'

export default function CreateMarket() {
    const navigate = useNavigate()
    const { connected, publicKey, requestTransaction } = useWallet()

    const [formData, setFormData] = useState({
        question: '',
        category: 'crypto',
        resolutionDays: 30,
        oracleAddress: '',
        seedYes: '',
        seedNo: '',
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [txStatus, setTxStatus] = useState(null)
    const [txResult, setTxResult] = useState(null)

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Generate a deterministic market ID from question
    const generateMarketId = (question) => {
        let hash = 0
        for (let i = 0; i < question.length; i++) {
            const char = question.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }
        return Math.abs(hash) % 1000000000 // Keep it in a reasonable range for field
    }

    // Generate a question hash for on-chain storage
    const generateQuestionHash = (question) => {
        let hash = 0
        for (let i = 0; i < question.length; i++) {
            const char = question.charCodeAt(i)
            hash = ((hash << 7) - hash) + char
            hash = hash & hash
        }
        return Math.abs(hash) % 10000000000 // Different range to differentiate from marketId
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!connected) {
            setError('Please connect your wallet first')
            return
        }

        if (!formData.question.trim()) {
            setError('Please enter a market question')
            return
        }

        setIsLoading(true)
        setError('')
        setTxStatus('Generating market ID...')

        try {
            // Generate market ID from question
            const marketId = generateMarketId(formData.question)

            setTxStatus('Uploading question to IPFS...')

            // Upload question to IPFS and get deterministic hash
            let questionHashNum
            let ipfsResult
            try {
                ipfsResult = await ipfsService.uploadQuestion({
                    question: formData.question,
                    category: formData.category,
                    createdAt: Date.now(),
                })
                questionHashNum = ipfsResult.hash
                console.log('Question uploaded, hash:', questionHashNum.toString(), 'CID:', ipfsResult.cid)
            } catch (ipfsError) {
                console.warn('IPFS upload failed, using local hash:', ipfsError)
                questionHashNum = BigInt(generateQuestionHash(formData.question))
                ipfsService.storeQuestionLocally(questionHashNum, formData.question)
            }

            // IMPORTANT: Contract uses resolution_height (block height), not timestamp
            // Estimate: ~5 seconds per block on testnet
            // Calculate approximate block height for resolution
            const blocksPerDay = (24 * 60 * 60) / 5  // ~17,280 blocks/day
            const blocksToAdd = Math.floor(parseInt(formData.resolutionDays) * blocksPerDay)
            // Get current block height from blockchain
            const currentHeight = await aleoService.getCurrentBlockHeight()
            const resolutionHeight = currentHeight + blocksToAdd

            setTxStatus('Building transaction...')

            // Build transaction inputs (now includes questionHash + oracle for on-chain storage)
            const oracleAddr = formData.oracleAddress.trim() || publicKey
            const inputs = aleoService.buildCreateMarketInputs(marketId, resolutionHeight, questionHashNum, oracleAddr)

            setTxStatus('Requesting wallet signature...')

            // Use Leo Wallet's requestTransaction format with chainId for testnetbeta
            const txId = await requestTransaction({
                address: publicKey,
                chainId: 'testnetbeta',
                transitions: [{
                    program: ALEO_CONFIG.programId,
                    functionName: 'create_market',
                    inputs: inputs,
                }],
                fee: ALEO_CONFIG.fees.createMarket,
                feePrivate: false,
            })

            console.log('Transaction approved by wallet:', txId)

            // Save to Backend (using full URL for production)
            try {
                await fetch(`${API_BASE_URL}/api/index`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        marketId: marketId.toString(),
                        question: formData.question,
                        hash: questionHashNum.toString(),
                        ipfsCid: ipfsResult?.cid || ''
                    })
                })
                console.log('Market indexed in backend')

                // Also add to markets cache for instant loading
                const newMarket = {
                    id: marketId.toString(),
                    question: formData.question,
                    creator: publicKey,
                    resolutionHeight: resolutionHeight,
                    resolved: false,
                    winningOutcome: 0,
                    totalYes: 0,
                    totalNo: 0,
                    totalPool: 0,
                    liquidityYes: 0,
                    liquidityNo: 0,
                    totalClaimed: 0,
                    oracle: oracleAddr,
                    currentBlockHeight: currentHeight,
                    ipfsCid: ipfsResult?.cid || ''
                }
                await fetch(`${API_BASE_URL}/api/markets/cache`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markets: [newMarket] })
                })
                console.log('Market added to cache')
            } catch (idxError) {
                console.error('Failed to index market:', idxError)
            }

            // Seed liquidity if the creator provided amounts
            const seedYesAmt = parseInt(formData.seedYes)
            const seedNoAmt = parseInt(formData.seedNo)
            if (seedYesAmt > 0 && seedNoAmt > 0) {
                setTxStatus('Seeding initial liquidity...')
                try {
                    const seedInputs = aleoService.buildSeedLiquidityInputs(marketId, seedYesAmt, seedNoAmt)
                    await requestTransaction({
                        address: publicKey,
                        chainId: 'testnetbeta',
                        transitions: [{
                            program: ALEO_CONFIG.programId,
                            functionName: 'seed_liquidity',
                            inputs: seedInputs,
                        }],
                        fee: ALEO_CONFIG.fees.seedLiquidity,
                        feePrivate: false,
                    })
                    console.log('Seed liquidity transaction sent')
                } catch (seedErr) {
                    console.warn('Seed liquidity failed (market was still created):', seedErr)
                }
            }

            // Redirect to markets page
            navigate('/markets')

        } catch (err) {
            console.error('Error creating market:', err)

            if (err.message?.includes('User rejected')) {
                setError('Transaction cancelled by user')
            } else if (err.message?.includes('Insufficient')) {
                setError('Insufficient balance for transaction')
            } else {
                setError(err.message || 'Failed to create market. Make sure the program is deployed.')
            }
            setTxStatus(null)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="create-market-page">
            <div className="create-market-form">
                <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Create a Market</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
                    Create a prediction market for any future event. Bettors' positions will be completely private.
                </p>

                {error && (
                    <div style={{
                        color: 'var(--color-no)',
                        marginBottom: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-no-bg)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {error}
                    </div>
                )}

                {txStatus && !error && (
                    <div style={{
                        color: 'var(--color-accent)',
                        marginBottom: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        {txStatus}
                    </div>
                )}

                {txResult && (
                    <div style={{
                        color: 'var(--color-yes)',
                        marginBottom: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-yes-bg)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <strong>Market Created Successfully!</strong>
                        <br />
                        <a
                            href={txResult.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--color-yes)' }}
                        >
                            View on Aleoscan
                        </a>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <div className="input-group">
                            <label htmlFor="question">Market Question</label>
                            <input
                                type="text"
                                id="question"
                                name="question"
                                className="input"
                                placeholder="e.g., Will Bitcoin reach $100,000 by Q2 2026?"
                                value={formData.question}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="input-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                name="category"
                                className="input"
                                value={formData.category}
                                onChange={handleChange}
                                disabled={isLoading}
                            >
                                <option value="crypto">Crypto</option>
                                <option value="politics">Politics</option>
                                <option value="sports">Sports</option>
                                <option value="tech">Technology</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="input-group">
                            <label htmlFor="resolutionDays">Resolution Time (days from now)</label>
                            <input
                                type="number"
                                id="resolutionDays"
                                name="resolutionDays"
                                className="input"
                                min="1"
                                max="365"
                                value={formData.resolutionDays}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="input-group">
                            <label htmlFor="oracleAddress">Oracle Address (optional)</label>
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                                An external address authorized to resolve the market. Leave blank to use your own address (self-resolve).
                            </small>
                            <input
                                type="text"
                                id="oracleAddress"
                                name="oracleAddress"
                                className="input"
                                placeholder="aleo1... (leave blank for self-resolution)"
                                value={formData.oracleAddress}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>Initial Liquidity (optional)</h4>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 'var(--spacing-md)' }}>
                            Seed credits into both YES and NO pools to enable AMM pricing. Leave at 0 to skip.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                            <div className="input-group">
                                <label htmlFor="seedYes">YES Pool (microcredits)</label>
                                <input
                                    type="number"
                                    id="seedYes"
                                    name="seedYes"
                                    className="input"
                                    placeholder="50000"
                                    min="0"
                                    value={formData.seedYes || ''}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="seedNo">NO Pool (microcredits)</label>
                                <input
                                    type="number"
                                    id="seedNo"
                                    name="seedNo"
                                    className="input"
                                    placeholder="50000"
                                    min="0"
                                    value={formData.seedNo || ''}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: 'var(--spacing-md)' }}
                        disabled={isLoading || !connected || txResult}
                    >
                        {isLoading ? 'Creating Market...' : connected ? 'Create Market' : 'Connect Wallet to Create'}
                    </button>

                    {/* Transaction fee info */}
                    <p style={{
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.75rem',
                        marginTop: 'var(--spacing-md)'
                    }}>
                        Transaction fee: {ALEO_CONFIG.fees.createMarket / 1000000} credits
                    </p>
                </form>

                {/* Transaction Details (for developers) */}
                {connected && formData.question && (
                    <details style={{ marginTop: 'var(--spacing-xl)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <summary style={{ cursor: 'pointer' }}>Transaction Preview</summary>
                        <pre style={{
                            marginTop: 'var(--spacing-sm)',
                            padding: 'var(--spacing-sm)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'auto'
                        }}>
                            {`Program: ${ALEO_CONFIG.programId}
Function: create_market
Inputs: [
  "${generateMarketId(formData.question)}field",  // market_id
  "${Math.floor(Date.now() / 1000) + (parseInt(formData.resolutionDays) * 86400)}u64"  // resolution_time
]
Fee: ${ALEO_CONFIG.fees.createMarket} microcredits`}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    )
}
