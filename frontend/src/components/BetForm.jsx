import { useState } from 'react'
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react'
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base'
import { ALEO_CONFIG, getExplorerUrl } from '../config'
import aleoService from '../services/AleoService'

export default function BetForm({ market, onBetPlaced }) {
    const { connected, publicKey, requestTransaction } = useWallet()
    const [selectedOutcome, setSelectedOutcome] = useState(null)
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [txStatus, setTxStatus] = useState(null)

    const handlePlaceBet = async () => {
        if (!connected) {
            setError('Please connect your wallet first')
            return
        }

        if (selectedOutcome === null) {
            setError('Please select an outcome')
            return
        }

        const betAmount = parseInt(amount)
        if (!betAmount || betAmount <= 0) {
            setError('Please enter a valid amount')
            return
        }

        setIsLoading(true)
        setError('')
        setTxStatus('Building transaction...')

        try {
            // Build transaction inputs using AleoService
            const inputs = aleoService.buildPlaceBetInputs(
                market.id,
                selectedOutcome,
                betAmount
            )

            setTxStatus('Requesting wallet signature...')

            // Use Leo Wallet's requestTransaction format with chainId for testnetbeta
            const txId = await requestTransaction({
                address: publicKey,
                chainId: 'testnetbeta',
                transitions: [{
                    program: ALEO_CONFIG.programId,
                    functionName: 'place_bet',
                    inputs: inputs,
                }],
                fee: ALEO_CONFIG.fees.placeBet,
                feePrivate: false,
            })

            console.log('Bet approved by wallet:', txId)

            // Notify parent immediately after wallet approval - don't wait for on-chain confirmation
            if (onBetPlaced) {
                onBetPlaced({
                    outcome: selectedOutcome,
                    amount: betAmount,
                    txId,
                    explorerUrl: getExplorerUrl('transaction', txId),
                })
            }

            // Reset form
            setSelectedOutcome(null)
            setAmount('')
            setTxStatus(null)

        } catch (err) {
            console.error('Error placing bet:', err)
            const errorMsg = err.message?.toLowerCase() || ''

            // Handle specific wallet errors with friendly messages
            if (errorMsg.includes('user rejected') || errorMsg.includes('cancelled') || errorMsg.includes('denied')) {
                setError('You cancelled the transaction. No worries, try again when ready!')
            } else if (errorMsg.includes('insufficient') || errorMsg.includes('balance') || errorMsg.includes('not enough')) {
                setError('Your wallet balance is too low. Please add more ALEO to your wallet and try again.')
            } else if (errorMsg.includes('fee') || errorMsg.includes('gas')) {
                setError('Not enough ALEO for transaction fees. Please top up your wallet.')
            } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
                setError('Network issue detected. Please check your connection and try again.')
            } else {
                setError('Something went wrong. Please make sure your wallet has enough ALEO and try again.')
            }
            setTxStatus(null)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bet-form">
            <h3 className="bet-form-title">
                <span className="privacy-indicator private">Private Bet</span>
                Place Your Bet
            </h3>

            {error && (
                <div style={{
                    color: 'var(--color-no)',
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    background: 'var(--color-no-bg)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {error}
                </div>
            )}

            {txStatus && !error && (
                <div style={{
                    color: 'var(--color-accent)',
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {txStatus}
                </div>
            )}

            <div className="bet-form-outcomes">
                <button
                    className={`outcome-btn yes ${selectedOutcome === 1 ? 'selected' : ''}`}
                    onClick={() => setSelectedOutcome(1)}
                    disabled={isLoading}
                >
                    YES
                </button>
                <button
                    className={`outcome-btn no ${selectedOutcome === 0 ? 'selected' : ''}`}
                    onClick={() => setSelectedOutcome(0)}
                    disabled={isLoading}
                >
                    NO
                </button>
            </div>

            <div className="bet-amount-input input-group">
                <label>Bet Amount (microcredits)</label>
                <small style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                    This amount will be deducted from your connected wallet
                </small>
                <input
                    type="number"
                    className="input"
                    placeholder="100000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                    min="1"
                />
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-xs)',
                    marginTop: 'var(--spacing-sm)'
                }}>
                    {[500, 1000, 3000, 5000, 10000, 30000].map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(preset.toString())}
                            disabled={isLoading}
                            style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                background: amount === preset.toString() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                                color: amount === preset.toString() ? 'white' : 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {preset.toLocaleString()}
                        </button>
                    ))}
                </div>
                <small style={{ color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
                    1 ALEO = 10,000 microcredits
                </small>
            </div>

            <button
                className="btn btn-primary bet-submit"
                onClick={handlePlaceBet}
                disabled={isLoading || !connected}
            >
                {isLoading ? 'Processing...' : connected ? 'Place Private Bet' : 'Connect Wallet to Bet'}
            </button>

            <div className="bet-privacy-note">
                Your bet amount and choice are encrypted on-chain. Only you can decrypt them.
            </div>

            {/* Transaction Details (for developers) */}
            {connected && (
                <details style={{ marginTop: 'var(--spacing-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <summary style={{ cursor: 'pointer' }}>Transaction Details</summary>
                    <pre style={{
                        marginTop: 'var(--spacing-sm)',
                        padding: 'var(--spacing-sm)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'auto'
                    }}>
                        {`Program: ${ALEO_CONFIG.programId}
Function: place_bet
Inputs: [
  "${market.id}field",   // market_id
  "${selectedOutcome ?? '?'}u8",        // outcome (private)
  "${amount || '?'}u64"   // amount (private)
]
Fee: ${ALEO_CONFIG.fees.placeBet} microcredits`}
                    </pre>
                </details>
            )}
        </div>
    )
}
