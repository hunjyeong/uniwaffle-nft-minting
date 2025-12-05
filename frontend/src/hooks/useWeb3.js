import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAINS, CHAIN_TYPES } from '../config/chains';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [walletType, setWalletType] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [wcProvider, setWcProvider] = useState(null);

  // 지갑 연결 해제 (먼저 정의)
  const disconnectWallet = useCallback(async () => {
    if (wcProvider) {
      try {
        await wcProvider.disconnect();
      } catch (err) {
        console.error('WalletConnect 연결 해제 실패:', err);
      }
      setWcProvider(null);
    }

    setAccount(null);
    setProvider(null);
    setChainId(null);
    setWalletType(null);
    setCurrentChain(null);
    setError(null);
    console.log('지갑 연결 해제');
  }, [wcProvider]);

  // Trust Wallet 확인 (WalletConnect 포함)
  const isTrustWalletAvailable = () => {
    if (typeof window.ethereum !== 'undefined' && 
        (window.ethereum.isTrust || window.ethereum.isTrustWallet)) {
      return 'injected';
    }
    return 'walletconnect';
  };

  // 체인 전환 (WalletConnect 지원)
  const switchChain = async (chain) => {
    try {
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      setError(null);

      // WalletConnect 사용 중인 경우
      if (walletType === 'walletconnect' && wcProvider) {
        try {
          await wcProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chain.chainId }]
          });
          
          setCurrentChain(chain);
          setChainId(chain.chainId);
          console.log('WalletConnect 체인 전환 성공:', chain.name);
          return true;
        } catch (switchError) {
          if (switchError.code === 4902 && chain.chainId !== '0x1') {
            await wcProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chain.chainId,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: chain.explorer ? [chain.explorer] : []
              }]
            });
            
            setCurrentChain(chain);
            setChainId(chain.chainId);
            return true;
          }
          throw switchError;
        }
      }

      // Trust Wallet 내장 브라우저
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chain.chainId }]
          });
          
          setCurrentChain(chain);
          setChainId(chain.chainId);
          console.log('체인 전환 성공:', chain.name);
          return true;
          
        } catch (switchError) {
          if (switchError.code === 4902) {
            if (chain.chainId === '0x1') {
              setError('Ethereum Mainnet을 찾을 수 없습니다.');
              throw new Error('Mainnet을 찾을 수 없습니다.');
            }
            
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chain.chainId,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrl],
                blockExplorerUrls: chain.explorer ? [chain.explorer] : []
              }]
            });
            
            setCurrentChain(chain);
            setChainId(chain.chainId);
            return true;
          } else if (switchError.code === 4001) {
            setError('사용자가 네트워크 전환을 거부했습니다.');
            throw switchError;
          } else {
            setError('네트워크 전환에 실패했습니다.');
            throw switchError;
          }
        }
      }
      
    } catch (err) {
      console.error('체인 전환 실패:', err);
      return false;
    }
  };

  // WalletConnect 연결 (Trust Wallet QR Code)
  const connectWalletConnect = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
      
      const savedSession = localStorage.getItem('walletconnect');
      
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

      if (savedSession && walletConnectProvider.session) {
        console.log('기존 WalletConnect 세션 복원 시도');
      } else {
        await walletConnectProvider.connect();
      }

      const provider = new ethers.BrowserProvider(walletConnectProvider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setAccount(address);
      setProvider(provider);
      setChainId('0x' + network.chainId.toString(16));
      setCurrentChain(chain);
      setWalletType('walletconnect');
      setWcProvider(walletConnectProvider);

      // WalletConnect 이벤트 리스너
      walletConnectProvider.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      walletConnectProvider.on('chainChanged', (chainId) => {
        const newChainId = '0x' + parseInt(chainId).toString(16);
        setChainId(newChainId);
        
        const chain = Object.values(SUPPORTED_CHAINS).find(
          c => c.chainId === newChainId
        );
        if (chain) {
          setCurrentChain(chain);
        }
      });

      walletConnectProvider.on('disconnect', () => {
        console.log('WalletConnect 연결 해제됨');
        disconnectWallet();
      });

      console.log('WalletConnect 연결 성공:', address);
    } catch (err) {
      console.error('WalletConnect 연결 실패:', err);
      if (err.message.includes('User rejected') || err.message.includes('User closed modal')) {
        setError('사용자가 연결을 거부했습니다.');
      } else {
        setError('Trust Wallet 연결에 실패했습니다.');
      }
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Trust Wallet 내장 브라우저 연결
  const connectTrustWalletInjected = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      if (!window.ethereum) {
        throw new Error('Trust Wallet을 찾을 수 없습니다.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const networkChainId = '0x' + network.chainId.toString(16);
      
      console.log('Trust Wallet 연결됨:', {
        account: accounts[0],
        currentNetwork: networkChainId,
        requestedNetwork: chain.chainId
      });

      setAccount(accounts[0]);
      setProvider(provider);
      setChainId(networkChainId);
      setWalletType('trustwallet');

      if (networkChainId !== chain.chainId) {
        console.log('네트워크 전환 필요');
        const switched = await switchChain(chain);
        
        if (!switched) {
          const currentNetworkChain = Object.values(SUPPORTED_CHAINS).find(
            c => c.chainId === networkChainId
          );
          
          if (currentNetworkChain) {
            setCurrentChain(currentNetworkChain);
            setError(
              `${chain.name}(으)로 전환하지 못했습니다. ` +
              `현재 ${currentNetworkChain.name}에 연결되어 있습니다.`
            );
          }
        }
      } else {
        setCurrentChain(chain);
      }

      console.log('지갑 연결 완료:', accounts[0]);
    } catch (err) {
      console.error('지갑 연결 실패:', err);
      
      if (err.code === 4001) {
        setError('사용자가 연결을 거부했습니다.');
      } else {
        setError(err.message || '지갑 연결에 실패했습니다.');
      }
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // 통합 연결 함수
  const connectWallet = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
    if (chain.type !== CHAIN_TYPES.EVM) {
      setError('현재 EVM 체인만 지원합니다.');
      return;
    }

    const walletAvailable = isTrustWalletAvailable();
    
    try {
      if (walletAvailable === 'injected') {
        await connectTrustWalletInjected(chain);
      } else {
        await connectWalletConnect(chain);
      }
    } catch (err) {
      console.error('연결 실패:', err);
    }
  };

  // 계정 및 체인 변경 감지
  useEffect(() => {
    if (!window.ethereum || walletType === 'walletconnect') return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
        console.log('계정 변경됨:', accounts[0]);
      }
    };

    const handleChainChanged = (newChainId) => {
      console.log('네트워크 변경 감지:', newChainId);
      setChainId(newChainId);
      
      const chain = Object.values(SUPPORTED_CHAINS).find(
        c => c.chainId === newChainId
      );
      if (chain) {
        setCurrentChain(chain);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account, walletType, disconnectWallet]);

  // 페이지 로드 시 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // 1. Trust Wallet 내장 브라우저 확인
        if (window.ethereum && 
            (window.ethereum.isTrust || window.ethereum.isTrustWallet)) {
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
            setWalletType('trustwallet');
            
            const chain = Object.values(SUPPORTED_CHAINS).find(
              c => c.chainId === networkChainId
            );
            if (chain) {
              setCurrentChain(chain);
              console.log('Trust Wallet 연결 복원:', chain.name);
            }
            return;
          }
        }

        // 2. WalletConnect 세션 복원 시도
        const savedSession = localStorage.getItem('walletconnect');
        if (savedSession) {
          try {
            const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
            
            const walletConnectProvider = await EthereumProvider.init({
              projectId: process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
              chains: [11155111],
              showQrModal: false
            });

            if (walletConnectProvider.session) {
              const provider = new ethers.BrowserProvider(walletConnectProvider);
              const signer = await provider.getSigner();
              const address = await signer.getAddress();
              const network = await provider.getNetwork();
              const networkChainId = '0x' + network.chainId.toString(16);

              setAccount(address);
              setProvider(provider);
              setChainId(networkChainId);
              setWalletType('walletconnect');
              setWcProvider(walletConnectProvider);

              const chain = Object.values(SUPPORTED_CHAINS).find(
                c => c.chainId === networkChainId
              );
              if (chain) {
                setCurrentChain(chain);
                console.log('WalletConnect 세션 복원:', chain.name);
              }

              walletConnectProvider.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                  setAccount(accounts[0]);
                } else {
                  disconnectWallet();
                }
              });

              walletConnectProvider.on('chainChanged', (chainId) => {
                const newChainId = '0x' + parseInt(chainId).toString(16);
                setChainId(newChainId);
                
                const chain = Object.values(SUPPORTED_CHAINS).find(
                  c => c.chainId === newChainId
                );
                if (chain) {
                  setCurrentChain(chain);
                }
              });

              walletConnectProvider.on('disconnect', () => {
                disconnectWallet();
              });
            } else {
              localStorage.removeItem('walletconnect');
              console.log('WalletConnect 세션 만료됨');
            }
          } catch (err) {
            console.error('WalletConnect 세션 복원 실패:', err);
            localStorage.removeItem('walletconnect');
          }
        }
      } catch (err) {
        console.error('연결 확인 실패:', err);
      }
    };

    checkConnection();
  }, [disconnectWallet]);

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
    disconnectWallet,
    switchChain,
    isTrustWalletAvailable
  };
};