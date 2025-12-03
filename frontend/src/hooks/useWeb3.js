// frontend/src/hooks/useWeb3.js
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, CHAIN_TYPES } from '../config/chains';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [currentChain, setCurrentChain] = useState(SUPPORTED_CHAINS.ETHEREUM_SEPOLIA);

  // Trust Wallet 설치 확인
  const isTrustWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isTrust;
  };

  // 일반 지갑 제공자 확인
  const hasWalletProvider = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Trust Wallet 연결 (멀티체인 지원)
  const connectTrustWallet = async (chain = currentChain) => {
    setIsConnecting(true);
    setError(null);

    try {
      // EVM 체인만 지원
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      if (isTrustWalletInstalled() || hasWalletProvider()) {
        // Trust Wallet 또는 MetaMask 연결
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        setAccount(accounts[0]);
        setProvider(provider);
        setChainId('0x' + network.chainId.toString(16));
        setCurrentChain(chain);
        setWalletType(isTrustWalletInstalled() ? 'trustwallet' : 'metamask');

        // 선택한 체인과 다르면 전환
        if ('0x' + network.chainId.toString(16) !== chain.chainId) {
          await switchChain(chain);
        }

        console.log('지갑 연결 성공:', accounts[0]);
      } else {
        // WalletConnect로 QR 코드 연결
        await connectWalletConnect(chain);
      }
    } catch (err) {
      console.error('지갑 연결 실패:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // WalletConnect 연결 (QR Code)
  const connectWalletConnect = async (chain = currentChain) => {
    setIsConnecting(true);
    setError(null);

    try {
      // EVM 체인만 지원
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      
      const walletConnectProvider = await EthereumProvider.init({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [parseInt(chain.chainId, 16)],
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'light',
          themeVariables: {
            '--wcm-z-index': '9999'
          }
        }
      });

      await walletConnectProvider.connect();

      const provider = new ethers.BrowserProvider(walletConnectProvider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setAccount(address);
      setProvider(provider);
      setChainId('0x' + network.chainId.toString(16));
      setCurrentChain(chain);
      setWalletType('walletconnect');

      // WalletConnect 이벤트 리스너
      walletConnectProvider.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      walletConnectProvider.on('chainChanged', (chainId) => {
        setChainId('0x' + parseInt(chainId).toString(16));
        window.location.reload();
      });

      walletConnectProvider.on('disconnect', () => {
        disconnectWallet();
      });

      console.log('WalletConnect 연결 성공:', address);
    } catch (err) {
      console.error('WalletConnect 연결 실패:', err);
      if (err.message.includes('User rejected')) {
        setError('사용자가 연결을 거부했습니다.');
      } else {
        setError('WalletConnect 연결에 실패했습니다.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 범용 지갑 연결
  const connectWallet = async (chain = currentChain) => {
    if (!hasWalletProvider() && !isTrustWalletInstalled()) {
      setError('지갑이 설치되어 있지 않습니다.');
      return;
    }

    // 체인 타입 확인
    if (chain.type !== CHAIN_TYPES.EVM) {
      setError('현재 EVM 체인만 지원합니다.');
      return;
    }

    await connectTrustWallet(chain);
  };

  // 체인 전환 (멀티체인 지원)
  const switchChain = async (chain) => {
    try {
      // EVM 체인만 지원
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chain.chainId }]
      });
      setCurrentChain(chain);
      setChainId(chain.chainId);
    } catch (switchError) {
      // 체인이 없으면 추가
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chain.chainId,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.explorer]
            }]
          });
          setCurrentChain(chain);
          setChainId(chain.chainId);
        } catch (addError) {
          console.error('네트워크 추가 실패:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  };

  // Sepolia로 전환 (하위 호환성)
  const switchToSepolia = async () => {
    await switchChain(SUPPORTED_CHAINS.ETHEREUM_SEPOLIA);
  };

  // 지갑 연결 해제
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setWalletType(null);
    console.log('지갑 연결 해제');
  };

  // 계정 변경 감지
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        console.log('계정 변경됨:', accounts[0]);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      console.log('네트워크 변경됨:', newChainId);
      
      // currentChain 업데이트
      const chain = Object.values(SUPPORTED_CHAINS).find(
        c => c.chainId === newChainId
      );
      if (chain) {
        setCurrentChain(chain);
      }
      
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  // 페이지 로드 시 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      if (!hasWalletProvider()) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });

        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const networkChainId = '0x' + network.chainId.toString(16);
          
          setAccount(accounts[0]);
          setProvider(provider);
          setChainId(networkChainId);
          
          // 현재 체인 찾기
          const chain = Object.values(SUPPORTED_CHAINS).find(
            c => c.chainId === networkChainId
          );
          if (chain) {
            setCurrentChain(chain);
          }
          
          if (isTrustWalletInstalled()) {
            setWalletType('trustwallet');
          } else {
            setWalletType('metamask');
          }
        }
      } catch (err) {
        console.error('연결 확인 실패:', err);
      }
    };

    checkConnection();
  }, []);

  return {
    account,
    provider,
    chainId,
    isConnecting,
    error,
    walletType,
    currentChain,
    isConnected: !!account,
    isCorrectNetwork: chainId === currentChain?.chainId,
    connectWallet,
    connectTrustWallet,
    connectWalletConnect,
    disconnectWallet,
    switchChain,
    switchToSepolia, // 하위 호환성
    isTrustWalletInstalled
  };
};