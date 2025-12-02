import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SEPOLIA_CHAIN_ID } from '../config/contracts';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [walletType, setWalletType] = useState(null);

  // Trust Wallet 설치 확인
  const isTrustWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isTrust;
  };

  // 일반 지갑 제공자 확인
  const hasWalletProvider = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // Trust Wallet 연결
  const connectTrustWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (isTrustWalletInstalled()) {
        // Trust Wallet 앱 내 브라우저에서 직접 연결
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        
        setAccount(accounts[0]);
        setProvider(provider);
        setChainId('0x' + network.chainId.toString(16));
        setWalletType('trustwallet');

        if ('0x' + network.chainId.toString(16) !== SEPOLIA_CHAIN_ID) {
          await switchToSepolia();
        }

        console.log('Trust Wallet 연결 성공:', accounts[0]);
      } else {
        // Trust Wallet 미설치 시 WalletConnect로 QR 코드 연결
        await connectWalletConnect();
      }
    } catch (err) {
      console.error('Trust Wallet 연결 실패:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // WalletConnect 연결 (QR Code)
  const connectWalletConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      
      const walletConnectProvider = await EthereumProvider.init({
        projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
        chains: [11155111], // Sepolia
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

  // 범용 지갑 연결 (Trust Wallet 전용)
  const connectWallet = async () => {
    if (!hasWalletProvider() && !isTrustWalletInstalled()) {
      setError('Trust Wallet이 설치되어 있지 않습니다.');
      return;
    }

    await connectTrustWallet();
  };

  // Sepolia 네트워크로 전환
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Testnet',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } catch (addError) {
          console.error('네트워크 추가 실패:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
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

    const handleChainChanged = (chainId) => {
      setChainId(chainId);
      console.log('네트워크 변경됨:', chainId);
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
          
          setAccount(accounts[0]);
          setProvider(provider);
          setChainId('0x' + network.chainId.toString(16));
          
          if (isTrustWalletInstalled()) {
            setWalletType('trustwallet');
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
    isConnected: !!account,
    isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
    connectWallet,
    connectTrustWallet,
    connectWalletConnect,
    disconnectWallet,
    switchToSepolia,
    isTrustWalletInstalled
  };
};