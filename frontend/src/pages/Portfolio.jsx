import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { ALEO_CONFIG, getExplorerUrl, API_BASE_URL } from '../config'
import useAleo from '../hooks/useAleo'
import aleoService from '../services/AleoService'

export default function Portfolio() {
    const { connected, publicKey, requestRecords, requestTransaction } = useWallet()
    const { programDeployed, isCheckingProgram } = useAleo()
    const [bets, setBets] = useState([])
    const [marketQuestions, setMarketQuestions] = useState({})
    const [marketData, setMarketData] = useState({}) // market pool/resolution data
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [claimingId, setClaimingId] = useState(null)
    const [claimError, setClaimError] = useState('')
    const [claimSuccess, setClaimSuccess] = useState('')

    // Helper to clean market ID (remove .private suffix and field type)
    const cleanMarketId = (rawId) => {
        if (!rawId) return ''
        return rawId.replace('field', '').replace('.private', '').replace('.public', '')
    }

    useEffect(() => {
        const loadBets = async () => {
            if (!connected) {
                setBets([])
                setIsLoading(false)
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                if (programDeployed && requestRecords) {
                    try {
                        const records = await requestRecords(ALEO_CONFIG.programId)
                        console.log('Fetched records:', records)

                        // Parse Bet records and keep raw record for claim_winnings
                        const betRecords = records
                            .filter(r => r.recordName === 'Bet')
                            .map(r => ({
                                id: r.id || Math.random().toString(),
                                marketId: cleanMarketId(r.data?.market_id),
                                outcome: parseInt(r.data?.outcome?.replace('u8', '').replace('.private', '')) || 0,
                                amount: parseInt(r.data?.amount?.replace('u64', '').replace('.private', '')) || 0,
                                rawRecord: r, // Keep raw record for claim transaction
                                status: 'pending',
                            }))

                        // Fetch market data for each unique market
                        const uniqueMarketIds = [...new Set(betRecords.map(b => b.marketId).filter(Boolean))]
                        const questions = {}
                        const markets = {}

                        await Promise.all(uniqueMarketIds.map(async (marketId) => {
                            try {
                                // Fetch market question
                                const res = await fetch(`${API_BASE_URL}/api/question/${marketId}`)
                                if (res.ok) {
                                    const data = await res.json()
                                    questions[marketId] = data.question
                                }
                            } catch (e) {
                                console.log('Failed to fetch question for market:', marketId)
                            }
                            try {
                                // Fetch market info + pool from blockchain
                                const [info, pool] = await Promise.all([
                                    aleoService.getMarket(marketId),
                                    aleoService.getPool(marketId),
                                ])
                                if (info) {
                                    markets[marketId] = {
                                        ...info,
                                        totalYes: pool?.totalYes || 0,
                                        totalNo: pool?.totalNo || 0,
                                        totalPool: pool?.totalPool || 0,
                                        totalClaimed: pool?.totalClaimed || 0,
                                    }
                                }
                            } catch (e) {
                                console.log('Failed to fetch market data:', marketId)
                            }
                        }))

                        // Determine bet status based on market resolution
                        const enrichedBets = betRecords.map(bet => {
                            const mkt = markets[bet.marketId]
                            if (!mkt) return { ...bet, status: 'pending' }
                            if (!mkt.resolved) return { ...bet, status: 'pending' }
                            if (bet.outcome === mkt.winningOutcome) {
                                const payout = aleoService.calculatePayout(bet.amount, bet.outcome, mkt)
                                return { ...bet, status: 'won', payout, winningOutcome: mkt.winningOutcome }
                            }
                            return { ...bet, status: 'lost', payout: 0, winningOutcome: mkt.winningOutcome }
                        })

                        setBets(enrichedBets)
                        setMarketQuestions(questions)
                        setMarketData(markets)
                    } catch (recordError) {
                        console.log('Could not fetch records, using empty state:', recordError)
                        setBets([])
                    }
                } else {
                    setBets([])
                }
            } catch (err) {
                console.error('Error loading bets:', err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        loadBets()
    }, [connected, programDeployed, requestRecords])

    // Claim winnings handler
    const handleClaim = async (bet) => {
        if (!connected || !requestTransaction) return
        setClaimingId(bet.id)
        setClaimError('')
        setClaimSuccess('')

        try {
            const mkt = marketData[bet.marketId]
            if (!mkt) throw new Error('Market data not found')

            // Calculate exact payout (must match on-chain calculation)
            const payout = aleoService.calculatePayout(bet.amount, bet.outcome, mkt)
            if (payout <= 0) throw new Error('No payout available')

            console.log('Claiming payout:', payout, 'for bet:', bet.amount, 'on market:', bet.marketId)

            const txId = await requestTransaction({
                address: publicKey,
                chainId: 'testnetbeta',
                transitions: [{
                    program: ALEO_CONFIG.programId,
                    functionName: 'claim_winnings',
                    inputs: aleoService.buildClaimWinningsInputs(bet.rawRecord, payout),
                }],
                fee: ALEO_CONFIG.fees.claimWinnings,
                feePrivate: false,
            })

            console.log('Claim tx submitted:', txId)
            setClaimSuccess(`Claim submitted! ${payout.toLocaleString()} microcredits will be transferred to your wallet. TX: ${txId}`)
        } catch (err) {
            console.error('Claim error:', err)
            if (err.message?.includes('User rejected')) {
                setClaimError('Transaction cancelled')
            } else {
                setClaimError(err.message || 'Failed to claim winnings')
            }
        } finally {
            setClaimingId(null)
        }
    }

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount)
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)
    const pendingBets = bets.filter(b => b.status === 'pending')
    const wonBets = bets.filter(b => b.status === 'won')
    const lostBets = bets.filter(b => b.status === 'lost')
    const totalWinnings = wonBets.reduce((sum, b) => sum + (b.payout || 0), 0)

    if (!connected) {
        return (
            <div className="portfolio-page">
                <div className="empty-state">
                    <div className="empty-state-icon"></div>
                    <h3 className="empty-state-title">Connect your wallet</h3>
                    <p>Connect your Leo Wallet to view your private bets.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="portfolio-page">
            <div className="portfolio-header">
                <h2>Your Portfolio</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
                    Your bets are encrypted and only visible to you.
                    <span className="privacy-indicator private" style={{ marginLeft: 'var(--spacing-sm)' }}>
                        Private Records
                    </span>
                </p>
            </div>

            {/* Wallet Address */}
            <div style={{
                marginBottom: 'var(--spacing-xl)',
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Connected Wallet</span>
                        <p className="mono" style={{ margin: 0, fontSize: '0.875rem', wordBreak: 'break-all' }}>
                            {publicKey}
                        </p>
                    </div>
                    <a
                        href={getExplorerUrl('address', publicKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem' }}
                    >
                        View on Explorer
                    </a>
                </div>
            </div>

            <div className="portfolio-stats">
                <div className="portfolio-stat-card">
                    <div className="portfolio-stat-label">Total Bet</div>
                    <div className="portfolio-stat-value" style={{ color: 'var(--color-accent)' }}>
                        {formatCredits(totalBet)}
                    </div>
                </div>
                <div className="portfolio-stat-card">
                    <div className="portfolio-stat-label">Active Bets</div>
                    <div className="portfolio-stat-value">{pendingBets.length}</div>
                </div>
                <div className="portfolio-stat-card">
                    <div className="portfolio-stat-label">Won</div>
                    <div className="portfolio-stat-value" style={{ color: 'var(--color-yes)' }}>
                        {wonBets.length}
                    </div>
                </div>
                <div className="portfolio-stat-card">
                    <div className="portfolio-stat-label">Lost</div>
                    <div className="portfolio-stat-value" style={{ color: 'var(--color-no)' }}>
                        {lostBets.length}
                    </div>
                </div>
                <div className="portfolio-stat-card">
                    <div className="portfolio-stat-label">Claimable Winnings</div>
                    <div className="portfolio-stat-value" style={{ color: 'var(--color-yes)' }}>
                        {formatCredits(totalWinnings)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>microcredits</div>
                </div>
            </div>

            {/* Claim status messages */}
            {claimError && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    background: 'var(--color-no-bg)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-no)',
                    border: '1px solid var(--color-no)',
                    fontSize: '0.875rem'
                }}>
                    {claimError}
                </div>
            )}
            {claimSuccess && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    background: 'var(--color-yes-bg)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-yes)',
                    border: '1px solid var(--color-yes)',
                    fontSize: '0.875rem'
                }}>
                    {claimSuccess}
                </div>
            )}

            <h3 style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                Your Bets
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                    (amounts only visible to you)
                </span>
            </h3>

            {isLoading ? (
                <div className="bet-list">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bet-list-item">
                            <div className="skeleton" style={{ height: 20, width: '60%' }} />
                            <div className="skeleton" style={{ height: 20, width: '80px' }} />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div style={{
                    padding: 'var(--spacing-lg)',
                    background: 'var(--color-no-bg)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-no)'
                }}>
                    Error loading bets: {error}
                </div>
            ) : bets.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"></div>
                    <h3 className="empty-state-title">No bets yet</h3>
                    <p>
                        {programDeployed
                            ? 'Place your first private prediction!'
                            : 'The program needs to be deployed to place bets.'}
                    </p>
                    <Link to="/markets" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                        Browse Markets
                    </Link>
                </div>
            ) : (
                <div className="bet-list">
                    {bets.map(bet => (
                        <div
                            key={bet.id}
                            className="bet-list-item"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap',
                                opacity: bet.status === 'lost' ? 0.6 : 1,
                                borderLeft: bet.status === 'won' ? '3px solid var(--color-yes)'
                                    : bet.status === 'lost' ? '3px solid var(--color-no)'
                                    : '3px solid var(--color-accent)',
                            }}
                        >
                            <Link
                                to={`/market/${bet.marketId}`}
                                style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
                            >
                                <div className="bet-list-item-market">
                                    {marketQuestions[bet.marketId] || `Market #${bet.marketId}`}
                                </div>
                            </Link>
                            <div className={`bet-list-item-outcome ${bet.outcome === 1 ? 'yes' : 'no'}`}>
                                {bet.outcome === 1 ? 'YES' : 'NO'}
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 100 }}>
                                <div className="bet-list-item-amount" style={{
                                    color: bet.outcome === 1 ? 'var(--color-yes)' : 'var(--color-no)'
                                }}>
                                    {formatCredits(bet.amount)}
                                </div>
                                {bet.status === 'won' && bet.payout > 0 && (
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-yes)' }}>
                                        Payout: {formatCredits(bet.payout)}
                                    </div>
                                )}
                            </div>
                            <div style={{ minWidth: 100, textAlign: 'right' }}>
                                {bet.status === 'pending' && (
                                    <span style={{
                                        fontSize: '0.75rem', padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--color-accent-bg)', color: 'var(--color-accent)'
                                    }}>Pending</span>
                                )}
                                {bet.status === 'lost' && (
                                    <span style={{
                                        fontSize: '0.75rem', padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--color-no-bg)', color: 'var(--color-no)'
                                    }}>Lost</span>
                                )}
                                {bet.status === 'won' && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={claimingId === bet.id}
                                        onClick={(e) => { e.preventDefault(); handleClaim(bet); }}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {claimingId === bet.id ? 'Claiming...' : `Claim ${formatCredits(bet.payout)}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{
                marginTop: 'var(--spacing-2xl)',
                padding: 'var(--spacing-lg)',
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)'
            }}>
                <h4 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    How Privacy Works
                </h4>
                <ul style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    paddingLeft: 'var(--spacing-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                }}>
                    <li>Your bets are stored as <strong>encrypted records</strong> on Aleo</li>
                    <li>Only your wallet's <strong>view key</strong> can decrypt them</li>
                    <li>Other users see only <strong>aggregated pool sizes</strong></li>
                    <li>Claiming winnings uses <strong>credits.aleo</strong> for real token transfers</li>
                    <li>Payouts are <strong>proportional</strong>: (your bet / winning pool) * total pool</li>
                    <li>ZK proofs verify ownership <strong>without revealing</strong> bet details</li>
                </ul>
            </div>
        </div>
    )
}
