import React from 'react';
import { useWeb3 } from '../hooks/useWeb3';

const WalletConnect = () => {
  const {
    account,
    isConnecting,
    isConnected,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchToSepolia
  } = useWeb3();

  // 주소 줄이기 (0x1234...5678)
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="wallet-connect">
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!isConnected ? (
        <button 
          className="connect-button"
          onClick={connectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? '연결 중...' : 'Trust Wallet 연결'}
        </button>
      ) : (
        <div className="connected-info">
          <div className="account-info">
            <span className="status-indicator">🟢</span>
            <span className="address">{formatAddress(account)}</span>
          </div>
          
          {!isCorrectNetwork && (
            <button 
              className="network-switch-button"
              onClick={switchToSepolia}
            >
              Sepolia로 전환
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
    </div>
  );
};

export default WalletConnect;