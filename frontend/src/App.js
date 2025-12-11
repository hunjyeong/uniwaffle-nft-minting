import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Ethereum Components
import WalletConnect from './components/WalletConnect';
import MintForm from './components/MintForm';
import NFTDisplay from './components/NFTDisplay';
import NFTManagePage from './components/NFTManagePage';

// Solana Components
import SolanaWalletConnect from './components/SolanaWalletConnect';
import SolanaMintForm from './components/SolanaMintForm';
import SolanaNFTDisplay from './components/SolanaNFTDisplay';

function MainApp() {
  const [activeChain, setActiveChain] = useState('ethereum'); // ethereum or solana
  const [activeTab, setActiveTab] = useState('mint');

  return (
    <div className="App">
      <header className="App-header">
        <h1>NFT Minting System</h1>
        <p className="subtitle">
          {activeChain === 'ethereum' ? 'NFTs on Ethereum' : 'NFTs on Solana'}
        </p>
        
        {/* Chain Selection */}
        <div className="chain-selector">
          <button 
            className={`chain-btn ${activeChain === 'ethereum' ? 'active' : ''}`}
            onClick={() => {
              setActiveChain('ethereum');
              setActiveTab('mint');
            }}
          >
            Ethereum
          </button>
          <button 
            className={`chain-btn ${activeChain === 'solana' ? 'active' : ''}`}
            onClick={() => {
              setActiveChain('solana');
              setActiveTab('mint');
            }}
          >
            Solana
          </button>
        </div>

        {/* Wallet Connect based on selected chain */}
        {activeChain === 'ethereum' ? <WalletConnect /> : <SolanaWalletConnect />}
      </header>

      <main className="App-main">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'mint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mint')}
          >
            Minting
          </button>
          <button 
            className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            My NFT
          </button>
        </div>

        <div className="tab-content">
          {activeChain === 'ethereum' ? (
            activeTab === 'mint' ? <MintForm /> : <NFTDisplay />
          ) : (
            activeTab === 'mint' ? <SolanaMintForm /> : <SolanaNFTDisplay />
          )}
        </div>
      </main>

      <footer className="App-footer">
        <p>
          Made with React, Hardhat, Metaplex, and IPFS
        </p>
        <div className="footer-links">
          {activeChain === 'ethereum' ? (
            <>
              <a 
                href="https://sepolia.etherscan.io" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Sepolia Explorer
              </a>
              <span>•</span>
              <a 
                href="https://testnets.opensea.io" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                OpenSea Testnet
              </a>
            </>
          ) : (
            <>
              <a 
                href="https://explorer.solana.com/?cluster=devnet" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Solana Explorer
              </a>
              <span>•</span>
              <a 
                href="https://phantom.app" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Phantom Wallet
              </a>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/nft-manage" element={<NFTManagePage />} />
      </Routes>
    </Router>
  );
}

export default App;