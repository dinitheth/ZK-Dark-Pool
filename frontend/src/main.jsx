import React, { useMemo, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui'
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo'
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base'
import App from './App.jsx'
import './styles/index.css'
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css'

function Root() {
    useEffect(() => {
        console.log('=== Leo Wallet Detection Debug ===');
        console.log('window.leoWallet:', window.leoWallet);
        console.log('=================================');
    }, []);

    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: 'ZK Dark Pool',
            }),
        ],
        []
    )

    return (
        <WalletProvider
            wallets={wallets}
            network={WalletAdapterNetwork.TestnetBeta}
            decryptPermission={DecryptPermission.UponRequest}
            autoConnect={true}
        >
            <WalletModalProvider>
                <App />
            </WalletModalProvider>
        </WalletProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
