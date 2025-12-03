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
  const [currentChain, setCurrentChain] = useState(null); // 초기값을 null로 변경

  // Trust Wallet 설치 확인
  const isTrustWalletInstalled = () => {
    return typeof window.ethereum !== 'undefined' && 
           (window.ethereum.isTrust || window.ethereum.isTrustWallet);
  };

  // 일반 지갑 제공자 확인
  const hasWalletProvider = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // 체인 전환 (멀티체인 지원)
  const switchChain = async (chain) => {
    if (!window.ethereum) {
      setError('지갑이 설치되어 있지 않습니다.');
      return false;
    }

    try {
      // EVM 체인만 지원
      if (chain.type !== CHAIN_TYPES.EVM) {
        throw new Error('현재 EVM 체인만 지원합니다.');
      }

      setError(null);

      // 1단계: 체인 전환 시도
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
        // 에러 코드 4902: 체인이 지갑에 없음
        if (switchError.code === 4902) {
          
          // Mainnet은 추가할 수 없음 - 이미 존재해야 함
          if (chain.chainId === '0x1') {
            setError(
              'Ethereum Mainnet을 찾을 수 없습니다. ' +
              'Trust Wallet에서 Ethereum Mainnet을 활성화해주세요.'
            );
            throw new Error('Mainnet을 찾을 수 없습니다.');
          }
          
          // 2단계: Testnet/L2는 체인 추가
          try {
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
            console.log('체인 추가 및 전환 성공:', chain.name);
            return true;
            
          } catch (addError) {
            console.error('체인 추가 실패:', addError);
            
            if (addError.code === 4001) {
              setError('사용자가 네트워크 추가를 거부했습니다.');
            } else {
              setError(`${chain.name} 추가에 실패했습니다.`);
            }
            
            throw addError;
          }
          
        } else if (switchError.code === 4001) {
          setError('사용자가 네트워크 전환을 거부했습니다.');
          throw switchError;
        } else {
          setError('네트워크 전환에 실패했습니다.');
          throw switchError;
        }
      }
      
    } catch (err) {
      console.error('체인 전환 실패:', err);
      return false;
    }
  };

  // Trust Wallet 연결 (멀티체인 지원)
  const connectTrustWallet = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
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
        const networkChainId = '0x' + network.chainId.toString(16);
        
        console.log('지갑 연결됨:', {
          account: accounts[0],
          currentNetwork: networkChainId,
          requestedNetwork: chain.chainId
        });

        setAccount(accounts[0]);
        setProvider(provider);
        setChainId(networkChainId);
        setWalletType(isTrustWalletInstalled() ? 'trustwallet' : 'metamask');

        // 선택한 체인과 다르면 전환 시도
        if (networkChainId !== chain.chainId) {
          console.log('🔄 네트워크 전환 필요:', {
            from: networkChainId,
            to: chain.chainId
          });
          
          const switched = await switchChain(chain);
          
          if (switched) {
            // 전환 성공 - switchChain에서 이미 setCurrentChain 호출됨
            console.log('✅ 네트워크 전환 성공');
          } else {
            // 전환 실패 - 실제 연결된 네트워크로 설정
            console.warn('⚠️ 네트워크 전환 실패, 현재 네트워크 유지');
            const currentNetworkChain = Object.values(SUPPORTED_CHAINS).find(
              c => c.chainId === networkChainId
            );
            
            if (currentNetworkChain) {
              setCurrentChain(currentNetworkChain);
              setError(
                `${chain.name}(으)로 전환하지 못했습니다. ` +
                `현재 ${currentNetworkChain.name}에 연결되어 있습니다.`
              );
            } else {
              // 지원하지 않는 네트워크
              setError('지원하지 않는 네트워크입니다. 다른 네트워크를 선택해주세요.');
            }
          }
        } else {
          // 이미 올바른 네트워크에 연결됨
          console.log('✅ 이미 올바른 네트워크에 연결됨');
          setCurrentChain(chain);
        }

        console.log('지갑 연결 완료:', accounts[0]);
      } else {
        // WalletConnect로 QR 코드 연결
        await connectWalletConnect(chain);
      }
    } catch (err) {
      console.error('지갑 연결 실패:', err);
      
      if (err.code === 4001) {
        setError('사용자가 연결을 거부했습니다.');
      } else {
        setError(err.message || '지갑 연결에 실패했습니다.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // WalletConnect 연결 (QR Code)
  const connectWalletConnect = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
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
        const newChainId = '0x' + parseInt(chainId).toString(16);
        setChainId(newChainId);
        
        // currentChain 업데이트
        const chain = Object.values(SUPPORTED_CHAINS).find(
          c => c.chainId === newChainId
        );
        if (chain) {
          setCurrentChain(chain);
        }
        
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
  const connectWallet = async (chain = currentChain || SUPPORTED_CHAINS.ETHEREUM_SEPOLIA) => {
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
    setError(null);
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
      console.log('🔗 네트워크 변경 감지:', newChainId);
      
      setChainId(newChainId);
      
      // currentChain 업데이트
      const chain = Object.values(SUPPORTED_CHAINS).find(
        c => c.chainId === newChainId
      );
      if (chain) {
        setCurrentChain(chain);
        console.log('✅ 체인 업데이트됨:', chain.name);
      } else {
        console.warn('⚠️ 지원하지 않는 체인:', newChainId);
      }
      
      // 페이지 새로고침 제거 - React 상태로만 관리
      // window.location.reload();
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
            console.log('기존 연결 복원:', chain.name);
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
    switchToSepolia,
    isTrustWalletInstalled
  };
};