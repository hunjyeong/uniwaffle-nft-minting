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

  // Ethereum 지갑 감지 (Trust Wallet, MetaMask 등)
  const getEthereumProvider = () => {
    // 1. window.ethereum이 없으면 null
    if (!window.ethereum) return null;
    
    // 2. 여러 지갑이 설치된 경우 (window.ethereum.providers 배열)
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      // Phantom이 아닌 첫 번째 EVM 지갑 찾기
      const evmProvider = window.ethereum.providers.find(
        provider => !provider.isPhantom
      );
      
      if (evmProvider) {
        console.log('EVM 지갑 발견 (다중 지갑 환경)');
        return evmProvider;
      }
    }
    
    // 3. 단일 지갑이지만 Phantom인 경우
    if (window.ethereum.isPhantom) {
      console.log('Phantom 지갑만 감지됨 - Ethereum 지갑을 설치해주세요');
      return null;
    }
    
    // 4. 일반적인 경우 (Trust Wallet, MetaMask 등)
    return window.ethereum;
  };

  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    setAccount(null);
    setProvider(null);
    setChainId(null);
    setWalletType(null);
    setCurrentChain(null);
    setError(null);
    console.log('지갑 연결 해제');
  }, []);

  // 체인 전환
  const switchChain = async (chain) => {
    try {
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      setError(null);

      const ethereum = getEthereumProvider();
      if (ethereum) {
        try {
          await ethereum.request({
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
            
            await ethereum.request({
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

  // Trust Wallet 연결
  const connectWallet = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
    setIsConnecting(true);
    setError(null);

    try {
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      const ethereum = getEthereumProvider();
      
      if (!ethereum) {
        setError('Trust Wallet 또는 MetaMask를 설치해주세요.');
        throw new Error('Ethereum 지갑을 찾을 수 없습니다.');
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      const networkChainId = '0x' + network.chainId.toString(16);
      
      console.log('지갑 연결됨:', {
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

  // 계정 및 체인 변경 감지
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

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

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account, disconnectWallet]);

  // 페이지 로드 시 연결 상태 확인
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const ethereum = getEthereumProvider();
        
        if (ethereum) {
          const accounts = await ethereum.request({
            method: 'eth_accounts'
          });

          if (accounts.length > 0) {
            const provider = new ethers.BrowserProvider(ethereum);
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
              console.log('지갑 연결 복원:', chain.name);
            }
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
    disconnectWallet,
    switchChain
  };
};