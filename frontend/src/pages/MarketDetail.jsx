import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import BetForm from '../components/BetForm'
import aleoService from '../services/AleoService'
import { ALEO_CONFIG } from '../config'

export default function MarketDetail() {
    const { id } = useParams()
    const { connected, publicKey, requestTransaction } = useWallet()
    const [market, setMarket] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [betPlaced, setBetPlaced] = useState(null)
    const [currentBlockHeight, setCurrentBlockHeight] = useState(null)
    const [loadingDelayed, setLoadingDelayed] = useState(false)
    const [seedYes, setSeedYes] = useState('')
    const [seedNo, setSeedNo] = useState('')
    const [seedLoading, setSeedLoading] = useState(false)
    const [seedError, setSeedError] = useState('')
    const [seedSuccess, setSeedSuccess] = useState(false)
    const [resolveOutcome, setResolveOutcome] = useState(null)
    const [resolveLoading, setResolveLoading] = useState(false)
    const [resolveError, setResolveError] = useState('')
    const [resolveSuccess, setResolveSuccess] = useState('')
    const [withdrawLoading, setWithdrawLoading] = useState(false)
    const [withdrawError, setWithdrawError] = useState('')
    const [withdrawSuccess, setWithdrawSuccess] = useState('')

    useEffect(() => {
        const loadMarket = async () => {
            setIsLoading(true)
            setLoadingDelayed(false)
            
            // Show delayed message after 3 seconds
            const delayTimer = setTimeout(() => {
                setLoadingDelayed(true)
            }, 3000)
            
            try {
                const cleanId = String(id).replace('field', '')
                
                const [marketData, blockHeight] = await Promise.all([
                    aleoService.getMarketWithDetails(cleanId),
                    aleoService.getCurrentBlockHeight()
                ])
                
                setCurrentBlockHeight(blockHeight)
                
                if (marketData) {
                    setMarket(marketData)
                }
            } catch (error) {
                console.error('Error loading market:', error)
            }
            
            clearTimeout(delayTimer)
            setIsLoading(false)
            setLoadingDelayed(false)
        }
        loadMarket()
    }, [id])

    const handleBetPlaced = (bet) => {
        setBetPlaced(bet)
    }

    // Seed liquidity handler (creator only)
    const handleSeedLiquidity = async () => {
        if (!connected || !publicKey) return
        const yesAmt = parseInt(seedYes)
        const noAmt = parseInt(seedNo)
        if (!yesAmt || !noAmt || yesAmt <= 0 || noAmt <= 0) {
            setSeedError('Enter valid amounts for both sides')
            return
        }
        setSeedLoading(true)
        setSeedError('')
        try {
            const inputs = aleoService.buildSeedLiquidityInputs(market.id, yesAmt, noAmt)
            const txId = await requestTransaction({
                address: publicKey,
                chainId: 'testnetbeta',
                transitions: [{
                    program: ALEO_CONFIG.programId,
                    functionName: 'seed_liquidity',
                    inputs: inputs,
                }],
                fee: ALEO_CONFIG.fees.seedLiquidity,
                feePrivate: false,
            })
            console.log('Seed liquidity tx:', txId)
            setSeedSuccess(true)
            setSeedYes('')
            setSeedNo('')
        } catch (err) {
            console.error('Seed liquidity error:', err)
            setSeedError(err.message?.includes('User rejected') ? 'Transaction cancelled' : (err.message || 'Failed to seed liquidity'))
        } finally {
            setSeedLoading(false)
        }
    }

    const impliedOdds = market ? aleoService.calculateImpliedOdds(market) : { yes: 50, no: 50 }
    const isCreator = connected && publicKey && market?.creator === publicKey
    const isOracle = connected && publicKey && market?.oracle === publicKey
    const canResolve = (isCreator || isOracle) && market && !market.resolved && currentBlockHeight >= market.resolutionHeight
    const hasLiquidity = market && (market.liquidityYes > 0 || market.liquidityNo > 0)

    const formatCredits = (amount) => {
        return new Intl.NumberFormat('en-US').format(amount)
    }

    const formatBlocksToTime = (resolutionHeight) => {
        if (!currentBlockHeight || !resolutionHeight) return 'Unknown'
        
        const blocksRemaining = resolutionHeight - currentBlockHeight
        if (blocksRemaining <= 0) return 'Ready for resolution'
        
        const secondsRemaining = blocksRemaining * 5
        const days = Math.floor(secondsRemaining / 86400)
        const hours = Math.floor((secondsRemaining % 86400) / 3600)
        
        if (days > 0) {
            return `~${days}d ${hours}h left`
        } else if (hours > 0) {
            return `~${hours}h left`
        } else {
            return `<1h left`
        }
    }

    const estimateResolutionDate = (resolutionHeight) => {
        if (!currentBlockHeight || !resolutionHeight) return 'Unknown'
        
        const blocksRemaining = resolutionHeight - currentBlockHeight
        const secondsRemaining = blocksRemaining * 5
        const resolutionDate = new Date(Date.now() + secondsRemaining * 1000)
        
        return resolutionDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    if (isLoading) {
        return (
            <div className="market-detail-page">
                <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 200, marginBottom: 24 }} />
                <div className="skeleton" style={{ height: 300 }} />
                {loadingDelayed && (
                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        background: 'var(--color-bg-card)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.9rem'
                    }}>
                        Fetching data from blockchain... This may take a moment, or try refreshing the page.
                    </div>
                )}
            </div>
        )
    }

    if (!market) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"></div>
                <h3 className="empty-state-title">Market not found</h3>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                    This market may not exist on the blockchain or hasn't been indexed yet.
                </p>
                <Link to="/markets" className="btn btn-primary" style={{ marginTop: 'var(--spacing-lg)' }}>
                    Back to Markets
                </Link>
            </div>
        )
    }

    const totalPool = (market.totalYes || 0) + (market.totalNo || 0)
    const yesPercentage = totalPool > 0 ? (market.totalYes / totalPool) * 100 : 50

    return (
        <div className="market-detail-page" style={{ maxWidth: 900, margin: '0 auto' }}>
            <Link to="/markets" style={{
                color: 'var(--color-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                marginBottom: 'var(--spacing-lg)'
            }}>
                ← Back to Markets
            </Link>

            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
                    <h1 style={{ flex: 1, marginRight: 'var(--spacing-lg)' }}>{market.question}</h1>
                    <span className={`market-card-status ${market.resolved ? 'resolved' : 'open'}`}>
                        {market.resolved ? 'Resolved' : 'Open'}
                    </span>
                </div>

                {market.description && (
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
                        {market.description}
                    </p>
                )}

                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                        <span style={{ color: 'var(--color-yes)', fontWeight: 600 }}>
                            YES {yesPercentage.toFixed(1)}%
                        </span>
                        <span style={{ color: 'var(--color-no)', fontWeight: 600 }}>
                            NO {(100 - yesPercentage).toFixed(1)}%
                        </span>
                    </div>
                    <div style={{
                        height: 12,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-no)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${yesPercentage}%`,
                            height: '100%',
                            background: 'var(--color-yes)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <div className="market-card-pool">
                    <div className="pool-stat">
                        <div className="pool-stat-label">Yes Pool</div>
                        <div className="pool-stat-value yes">{formatCredits(market.totalYes || 0)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">No Pool</div>
                        <div className="pool-stat-value no">{formatCredits(market.totalNo || 0)}</div>
                    </div>
                    <div className="pool-stat">
                        <div className="pool-stat-label">Total Pool</div>
                        <div className="pool-stat-value">{formatCredits(totalPool)}</div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-lg)',
                    marginTop: 'var(--spacing-lg)',
                    paddingTop: 'var(--spacing-lg)',
                    borderTop: '1px solid var(--color-border)',
                    fontSize: '0.875rem'
                }}>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Resolution Date: </span>
                        <span style={{ fontWeight: 500 }}>{estimateResolutionDate(market.resolutionHeight)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Time Remaining: </span>
                        <span style={{ fontWeight: 500 }}>{formatBlocksToTime(market.resolutionHeight)}</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Creator: </span>
                        <span className="mono" style={{ fontWeight: 500 }}>
                            {market.creator?.slice(0, 10)}...{market.creator?.slice(-6)}
                        </span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Oracle: </span>
                        <span className="mono" style={{ fontWeight: 500 }}>
                            {market.oracle ? (market.oracle === market.creator ? 'Creator (self-resolve)' : `${market.oracle?.slice(0, 10)}...${market.oracle?.slice(-6)}`) : 'Creator'}
                        </span>
                    </div>
                    <div>
                        <span className="privacy-indicator private">Individual bets hidden</span>
                    </div>
                    <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Liquidity: </span>
                        <span style={{ fontWeight: 500, color: hasLiquidity ? 'var(--color-yes)' : 'var(--color-pending)' }}>
                            {hasLiquidity
                                ? `${formatCredits(market.liquidityYes || 0)} YES / ${formatCredits(market.liquidityNo || 0)} NO`
                                : 'Not seeded yet'}
                        </span>
                    </div>
                </div>

                {/* Payout Info Box */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'rgba(99, 102, 241, 0.06)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem'
                }}>
                    <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-accent)' }}>Payout Formula</h4>
                    <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                        <code style={{ background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>
                            payout = (your_bet × total_pool) ÷ winning_pool
                        </code>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                        <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>YES payout multiplier: </span>
                            <strong style={{ color: 'var(--color-yes)' }}>
                                {market.totalYes > 0 ? (totalPool / market.totalYes).toFixed(2) : '—'}x
                            </strong>
                        </div>
                        <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>NO payout multiplier: </span>
                            <strong style={{ color: 'var(--color-no)' }}>
                                {market.totalNo > 0 ? (totalPool / market.totalNo).toFixed(2) : '—'}x
                            </strong>
                        </div>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: '8px 0 0' }}>
                        Real credits are transferred via <code>credits.aleo</code>. Winnings calculated on-chain with u128 precision.
                    </p>
                </div>
                
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                }}>
                    <strong>Market ID:</strong> {market.id} | 
                    <strong> Resolution Block:</strong> {market.resolutionHeight} |
                    <strong> Current Block:</strong> {currentBlockHeight} |
                    <strong> Claimed:</strong> {formatCredits(market.totalClaimed || 0)}
                </div>
            </div>

            {/* Seed Liquidity Panel (creator only, when no liquidity) */}
            {isCreator && !market.resolved && !hasLiquidity && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-accent)' }}>
                        💧 Seed Initial Liquidity
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                        As the market creator, deposit credits to both YES and NO pools to bootstrap AMM pricing.
                        Credits are transferred from your wallet via <code>credits.aleo</code>.
                    </p>
                    {seedError && (
                        <div style={{ color: 'var(--color-no)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-no-bg)', borderRadius: 'var(--radius-sm)' }}>
                            {seedError}
                        </div>
                    )}
                    {seedSuccess && (
                        <div style={{ color: 'var(--color-yes)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-yes-bg)', borderRadius: 'var(--radius-sm)' }}>
                            Liquidity seed transaction submitted! Pool will update after confirmation.
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                        <div className="input-group">
                            <label>YES Pool Amount (microcredits)</label>
                            <input type="number" className="input" placeholder="50000" value={seedYes} onChange={e => setSeedYes(e.target.value)} disabled={seedLoading} min="1" />
                        </div>
                        <div className="input-group">
                            <label>NO Pool Amount (microcredits)</label>
                            <input type="number" className="input" placeholder="50000" value={seedNo} onChange={e => setSeedNo(e.target.value)} disabled={seedLoading} min="1" />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSeedLiquidity} disabled={seedLoading} style={{ width: '100%' }}>
                        {seedLoading ? 'Seeding Liquidity...' : 'Seed Liquidity (Transfer Credits)'}
                    </button>
                </div>
            )}

            {/* Resolve Market Panel (creator/oracle, when block height reached) */}
            {canResolve && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    <h3 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-pending)' }}>
                        ⚖️ Resolve Market
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                        Resolution block height reached. As the {isOracle && !isCreator ? 'designated oracle' : 'creator'}, select the winning outcome.
                    </p>
                    {resolveError && (
                        <div style={{ color: 'var(--color-no)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-no-bg)', borderRadius: 'var(--radius-sm)' }}>
                            {resolveError}
                        </div>
                    )}
                    {resolveSuccess && (
                        <div style={{ color: 'var(--color-yes)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-yes-bg)', borderRadius: 'var(--radius-sm)' }}>
                            {resolveSuccess}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                        <button
                            className={`btn ${resolveOutcome === 1 ? 'btn-primary' : 'btn-outline'}`}
                            style={{ flex: 1, borderColor: 'var(--color-yes)', color: resolveOutcome === 1 ? 'white' : 'var(--color-yes)', background: resolveOutcome === 1 ? 'var(--color-yes)' : 'transparent' }}
                            onClick={() => setResolveOutcome(1)}
                            disabled={resolveLoading}
                        >
                            YES Wins
                        </button>
                        <button
                            className={`btn ${resolveOutcome === 0 ? 'btn-primary' : 'btn-outline'}`}
                            style={{ flex: 1, borderColor: 'var(--color-no)', color: resolveOutcome === 0 ? 'white' : 'var(--color-no)', background: resolveOutcome === 0 ? 'var(--color-no)' : 'transparent' }}
                            onClick={() => setResolveOutcome(0)}
                            disabled={resolveLoading}
                        >
                            NO Wins
                        </button>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={resolveOutcome === null || resolveLoading}
                        onClick={async () => {
                            setResolveLoading(true)
                            setResolveError('')
                            setResolveSuccess('')
                            try {
                                const inputs = aleoService.buildResolveMarketInputs(market.id, resolveOutcome)
                                const txId = await requestTransaction({
                                    address: publicKey,
                                    chainId: 'testnetbeta',
                                    transitions: [{
                                        program: ALEO_CONFIG.programId,
                                        functionName: 'resolve_market',
                                        inputs: inputs,
                                    }],
                                    fee: ALEO_CONFIG.fees.resolveMarket,
                                    feePrivate: false,
                                })
                                setResolveSuccess(`Market resolved! TX: ${txId}. The outcome will be finalized after confirmation.`)
                            } catch (err) {
                                setResolveError(err.message?.includes('User rejected') ? 'Transaction cancelled' : (err.message || 'Failed to resolve market'))
                            } finally {
                                setResolveLoading(false)
                            }
                        }}
                    >
                        {resolveLoading ? 'Resolving...' : `Resolve as ${resolveOutcome === 1 ? 'YES' : resolveOutcome === 0 ? 'NO' : '...'}`}
                    </button>
                </div>
            )}

            {!market.resolved && (
                <BetForm market={market} onBetPlaced={handleBetPlaced} />
            )}

            {betPlaced && (
                <div className="card" style={{
                    marginTop: 'var(--spacing-lg)',
                    background: 'var(--color-yes-bg)',
                    borderColor: 'var(--color-yes)'
                }}>
                    <h3 style={{ color: 'var(--color-yes)', marginBottom: 'var(--spacing-sm)' }}>
                        Bet Placed Successfully
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        Your bet is now encrypted on-chain. Only you can see the details until resolution.
                    </p>
                    <div className="mono" style={{
                        marginTop: 'var(--spacing-md)',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        wordBreak: 'break-all'
                    }}>
                        Request ID: {betPlaced.txId || 'Pending confirmation...'}
                    </div>
                </div>
            )}

            {market.resolved && (
                <div className="card" style={{
                    background: market.winningOutcome === 1 ? 'var(--color-yes-bg)' : 'var(--color-no-bg)',
                    borderColor: market.winningOutcome === 1 ? 'var(--color-yes)' : 'var(--color-no)'
                }}>
                    <h3 style={{
                        color: market.winningOutcome === 1 ? 'var(--color-yes)' : 'var(--color-no)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        Market Resolved: {market.winningOutcome === 1 ? 'YES' : 'NO'}
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        If you placed a winning bet, you can claim your proportional payout.
                        Go to your <Link to="/portfolio" style={{ color: 'var(--color-accent)' }}>Portfolio</Link> to claim winnings.
                    </p>
                    <div style={{
                        marginTop: 'var(--spacing-md)',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Winning side pool:</span>
                            <span>{formatCredits(market.winningOutcome === 1 ? market.totalYes : market.totalNo)} microcredits</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total pool:</span>
                            <span>{formatCredits(totalPool)} microcredits</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Payout multiplier:</span>
                            <strong style={{ color: 'var(--color-yes)' }}>
                                {aleoService.getPayoutMultiplier(market.winningOutcome, market).toFixed(2)}x
                            </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>Total claimed:</span>
                            <span>{formatCredits(market.totalClaimed || 0)} / {formatCredits(totalPool)}</span>
                        </div>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 'var(--spacing-sm)' }}>
                        Credits transferred from program to winners via <code>credits.aleo/transfer_public</code>
                    </p>

                    {/* Withdraw Liquidity (creator/LP, resolved market) */}
                    {isCreator && (
                        <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
                            <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>💧 Withdraw Liquidity</h4>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: 'var(--spacing-sm)' }}>
                                As the LP, withdraw your share of unclaimed pool funds.
                            </p>
                            {withdrawError && (
                                <div style={{ color: 'var(--color-no)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-no-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                    {withdrawError}
                                </div>
                            )}
                            {withdrawSuccess && (
                                <div style={{ color: 'var(--color-yes)', marginBottom: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-yes-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                                    {withdrawSuccess}
                                </div>
                            )}
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                                Remaining in pool: {formatCredits((market.totalPool || 0) - (market.totalClaimed || 0))} microcredits
                            </p>
                            <button
                                className="btn btn-outline"
                                disabled={withdrawLoading || (market.totalPool || 0) - (market.totalClaimed || 0) <= 0}
                                onClick={async () => {
                                    setWithdrawLoading(true)
                                    setWithdrawError('')
                                    setWithdrawSuccess('')
                                    try {
                                        // Fetch LP token records from wallet
                                        // For withdraw_liquidity, user needs their LPToken record
                                        // The wallet adapter should provide requestRecords
                                        const remaining = (market.totalPool || 0) - (market.totalClaimed || 0)
                                        const lpYes = market.liquidityYes || 0
                                        const lpNo = market.liquidityNo || 0
                                        const lpTotal = lpYes + lpNo
                                        if (lpTotal === 0 || remaining === 0) throw new Error('No liquidity to withdraw')
                                        const expectedReturn = Math.floor((lpTotal * remaining) / (market.totalPool || 1))
                                        if (expectedReturn <= 0) throw new Error('Nothing to withdraw')

                                        // Note: withdraw_liquidity requires the private LPToken record.
                                        // The user must have it in their wallet from seed_liquidity.
                                        setWithdrawError('To withdraw, use your LPToken record from seed_liquidity. Execute: withdraw_liquidity(lp_token, ' + expectedReturn + 'u64) via CLI or wallet.')
                                    } catch (err) {
                                        setWithdrawError(err.message || 'Failed to calculate withdrawal')
                                    } finally {
                                        setWithdrawLoading(false)
                                    }
                                }}
                            >
                                {withdrawLoading ? 'Calculating...' : 'Withdraw Liquidity'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
