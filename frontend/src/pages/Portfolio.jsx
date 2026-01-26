import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { ALEO_CONFIG, getExplorerUrl } from '../config'
import useAleo from '../hooks/useAleo'

export default function Portfolio() {
    const { connected, publicKey, requestRecords } = useWallet()
    const { programDeployed, isCheckingProgram } = useAleo()
    const [bets, setBets] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

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
                // Try to fetch real records from wallet if program is deployed
                if (programDeployed && requestRecords) {
                    try {
                        const records = await requestRecords(ALEO_CONFIG.programId)
                        console.log('Fetched records:', records)

                        // Parse Bet records
                        const betRecords = records
                            .filter(r => r.recordName === 'Bet')
                            .map(r => ({
                                id: r.id || Math.random().toString(),
                                marketId: r.data?.market_id?.replace('field', ''),
                                outcome: parseInt(r.data?.outcome?.replace('u8', '')) || 0,
                                amount: parseInt(r.data?.amount?.replace('u64', '')) || 0,
                                status: 'pending',
                            }))

                        setBets(betRecords)
                    } catch (recordError) {
                        console.log('Could not fetch records, using empty state:', recordError)
                        setBets([])
                    }
                } else {
                    // Demo mode - no real records
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

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount)
    }

    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0)
    const pendingBets = bets.filter(b => b.status === 'pending')
    const wonBets = bets.filter(b => b.status === 'won')

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
                    <div className="portfolio-stat-label">Claimable</div>
                    <div className="portfolio-stat-value" style={{ color: 'var(--color-yes)' }}>
                        {formatCredits(wonBets.reduce((sum, b) => sum + b.amount * 2, 0))}
                    </div>
                </div>
            </div>

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
                        <Link
                            key={bet.id}
                            to={`/market/${bet.marketId}`}
                            className="bet-list-item"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="bet-list-item-market">Market #{bet.marketId}</div>
                            <div className={`bet-list-item-outcome ${bet.outcome === 1 ? 'yes' : 'no'}`}>
                                {bet.outcome === 1 ? 'YES' : 'NO'}
                            </div>
                            <div className="bet-list-item-amount" style={{
                                color: bet.outcome === 1 ? 'var(--color-yes)' : 'var(--color-no)'
                            }}>
                                {formatCredits(bet.amount)}
                            </div>
                            {bet.status === 'won' && (
                                <button className="btn btn-primary btn-sm">Claim</button>
                            )}
                        </Link>
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
                    <li>When claiming winnings, you prove ownership via <strong>ZK proof</strong> without revealing bet details</li>
                </ul>
            </div>
        </div>
    )
}
