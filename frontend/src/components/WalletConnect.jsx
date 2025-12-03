import React, { useState } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getChainsByCategory } from '../config/chains';

const WalletConnect = () => {
  const {
    account,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    currentChain,
    error,
    connectWallet,
    disconnectWallet,
    switchChain
  } = useWeb3();

  const [showChainSelector, setShowChainSelector] = useState(false);

  // 주소 포맷
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 체인 선택 핸들러
  const handleChainSelect = async (chain) => {
    if (isConnected) {
      await switchChain(chain);
    } else {
      await connectWallet(chain);
    }
    setShowChainSelector(false);
  };

  const chainCategories = getChainsByCategory();

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!isConnected ? (
        <div className="connect-section">
          <button 
            className="chain-selector-button"
            onClick={() => setShowChainSelector(!showChainSelector)}
          >
            {currentChain ? (
              <>
                <span className="chain-icon">{currentChain.icon}</span>
                <span>{currentChain.shortName}</span>
                <span className="dropdown-arrow">▼</span>
              </>
            ) : (
              <>
                <span>블록체인 선택</span>
                <span className="dropdown-arrow">▼</span>
              </>
            )}
          </button>

          {showChainSelector && (
            <div className="chain-dropdown">
              {Object.entries(chainCategories).map(([category, chains]) => (
                chains.length > 0 && (
                  <div key={category} className="chain-category">
                    <div className="category-title">{category}</div>
                    {chains.map(chain => (
                      <button
                        key={chain.id}
                        className={`chain-option ${currentChain?.id === chain.id ? 'selected' : ''}`}
                        onClick={() => handleChainSelect(chain)}
                      >
                        <span className="chain-icon">{chain.icon}</span>
                        <span className="chain-name">{chain.shortName}</span>
                        {chain.isTestnet && (
                          <span className="testnet-badge">Testnet</span>
                        )}
                      </button>
                    ))}
                  </div>
                )
              ))}
            </div>
          )}

          <button 
            className="connect-button"
            onClick={() => connectWallet(currentChain)}
            disabled={isConnecting || !currentChain}
          >
            {isConnecting ? '연결 중...' : 'MetaMask/Trust Wallet 연결'}
          </button>

          <div className="wallet-hint">
            <p>💡 MetaMask 또는 Trust Wallet을 사용하세요</p>
          </div>
        </div>
      ) : (
        <div className="connected-info">
          <div className="chain-info">
            <button 
              className="chain-display"
              onClick={() => setShowChainSelector(!showChainSelector)}
            >
              <span className="chain-icon">{currentChain?.icon}</span>
              <span className="chain-name">{currentChain?.shortName}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showChainSelector && (
              <div className="chain-dropdown">
                {Object.entries(chainCategories).map(([category, chains]) => (
                  chains.length > 0 && (
                    <div key={category} className="chain-category">
                      <div className="category-title">{category}</div>
                      {chains.map(chain => (
                        <button
                          key={chain.id}
                          className={`chain-option ${currentChain?.id === chain.id ? 'selected' : ''}`}
                          onClick={() => handleChainSelect(chain)}
                          disabled={isConnecting}
                        >
                          <span className="chain-icon">{chain.icon}</span>
                          <span className="chain-name">{chain.shortName}</span>
                          {chain.isTestnet && (
                            <span className="testnet-badge">Testnet</span>
                          )}
                          {currentChain?.id === chain.id && (
                            <span className="check-mark">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="account-info">
            <span className="status-indicator">🟢</span>
            <span className="address">
              {formatAddress(account)}
            </span>
            <button
              className="copy-button"
              onClick={() => {
                navigator.clipboard.writeText(account);
                alert('주소가 복사되었습니다!');
              }}
              title="주소 복사"
            >
              📋
            </button>
          </div>
          
          {!isCorrectNetwork && currentChain && (
            <button 
              className="network-switch-button"
              onClick={() => switchChain(currentChain)}
            >
              {currentChain.shortName}로 전환
            </button>
          )}
          
          <button 
            className="disconnect-button"
            onClick={disconnectWallet}
          >
            연결 해제
          </button>
        </div>
      )}

      <style jsx>{`
        .wallet-connect {
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .connect-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chain-selector-button,
        .chain-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: #f8f9fa;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          min-width: 300px;
        }

        .chain-selector-button:hover,
        .chain-display:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }

        .chain-icon {
          font-size: 24px;
          min-width: 24px;
        }

        .dropdown-arrow {
          margin-left: auto;
          font-size: 14px;
        }

        .chain-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          max-height: 500px;
          overflow-y: auto;
          min-width: 300px;
        }

        .chain-category {
          padding: 8px 0;
          border-bottom: 1px solid #f1f3f5;
        }

        .chain-category:last-child {
          border-bottom: none;
        }

        .category-title {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #868e96;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .chain-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 20px;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
          font-size: 15px;
        }

        .chain-option:hover:not(:disabled) {
          background: #f8f9fa;
        }

        .chain-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .chain-option.selected {
          background: #e7f5ff;
        }

        .chain-name {
          flex: 1;
          font-size: 15px;
          font-weight: 500;
          white-space: nowrap;
        }

        .testnet-badge {
          font-size: 11px;
          padding: 3px 8px;
          background: #fff3bf;
          color: #f59f00;
          border-radius: 4px;
          font-weight: 600;
          white-space: nowrap;
        }

        .check-mark {
          color: #51cf66;
          font-weight: bold;
          font-size: 16px;
        }

        .connect-button {
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .connect-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wallet-hint {
          text-align: center;
          font-size: 13px;
          color: #868e96;
        }

        .wallet-hint p {
          margin: 0;
        }

        .connected-info {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }

        .chain-info {
          position: relative;
        }

        .account-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .status-indicator {
          font-size: 12px;
        }

        .address {
          flex: 1;
          font-family: monospace;
          font-size: 14px;
          font-weight: 600;
        }

        .copy-button {
          padding: 4px 8px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .copy-button:hover {
          opacity: 1;
        }

        .network-switch-button {
          padding: 10px 16px;
          background: #fff3bf;
          color: #f59f00;
          border: 2px solid #ffe066;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .network-switch-button:hover {
          background: #ffe066;
        }

        .disconnect-button {
          padding: 10px 16px;
          background: white;
          color: #495057;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .disconnect-button:hover {
          background: #f8f9fa;
          border-color: #ced4da;
        }

        .error-message {
          padding: 12px 16px;
          background: #ffe0e0;
          color: #c92a2a;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default WalletConnect;