import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { transferNFT, burnNFT, getContract } from '../utils/EVMcontract';
import './NFTDisplay.css';
import './NFTManagePage.css';

// 분할 토큰 정보 컴포넌트
const FractionTokenInfo = ({ nft, provider }) => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokenInfo = async () => {
      try {
        const contract = await getContract(provider, 'fractional');
        const fractionData = await contract.fractionalizedNFTs(nft.tokenId);
        
        const tokenAddress = fractionData.fractionToken;
        
        const tokenAbi = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint256)'
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        const [name, symbol, totalSupply, balance] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply(),
          tokenContract.balanceOf(userAddress)
        ]);

        setTokenInfo({
          address: tokenAddress,
          name,
          symbol,
          totalSupply: totalSupply.toString(),
          balance: balance.toString(),
          buyoutPrice: ethers.formatEther(fractionData.buyoutPrice)
        });
      } catch (err) {
        console.error('토큰 정보 로드 실패:', err);
      } finally {
        setLoading(false);
      }
    };

    if (provider && nft) {
      loadTokenInfo();
    }
  }, [provider, nft]);

  if (loading) {
    return <div className="loading-small">토큰 정보 로딩 중...</div>;
  }

  if (!tokenInfo) {
    return <div className="error-small">토큰 정보를 불러올 수 없습니다.</div>;
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('주소가 복사되었습니다!');
  };

  return (
    <div className="token-info-content">
      <div className="info-row">
        <span className="info-label">토큰 이름:</span>
        <span className="info-value">{tokenInfo.name}</span>
      </div>
      <div className="info-row">
        <span className="info-label">토큰 심볼:</span>
        <span className="info-value">{tokenInfo.symbol}</span>
      </div>
      <div className="info-row">
        <span className="info-label">총 조각 수:</span>
        <span className="info-value">{tokenInfo.totalSupply}</span>
      </div>
      <div className="info-row">
        <span className="info-label">내 보유량:</span>
        <span className="info-value balance">✨ {tokenInfo.balance} 조각</span>
      </div>
      <div className="info-row">
        <span className="info-label">매입 가격:</span>
        <span className="info-value">{tokenInfo.buyoutPrice} ETH</span>
      </div>
      <div className="info-row">
        <span className="info-label">토큰 주소:</span>
        <span className="info-value address-value">
          <code className="token-address">{tokenInfo.address}</code>
          <button 
            className="copy-button"
            onClick={() => copyToClipboard(tokenInfo.address)}
            title="주소 복사"
          >
            📋
          </button>
        </span>
      </div>
      
      <div className="wallet-guide">
        <h4>💡 Trust Wallet에 추가하는 방법:</h4>
        <ol>
          <li>Trust Wallet 앱 열기</li>
          <li>가상자산 관리 선택</li>
          <li><strong>"추가(+)"</strong> 버튼 선택</li>
          <li>네트워크: <strong className="network-highlight">Ethereum (Sepolia Testnet)</strong></li>
          <li>Contract Address: 위 주소 옆 📋 버튼으로 복사 후 붙여넣기</li>
          <li>"토큰 추가" 버튼 클릭</li>
        </ol>
        <p>
          ⚠️ <strong>Sepolia 테스트넷</strong>에서만 보입니다. 메인넷이 아닙니다!
        </p>
      </div>
    </div>
  );
};

const NFTManagePage = () => {
  const [provider, setProvider] = useState(null);
  const [currentChain, setCurrentChain] = useState(null);
  const [nft, setNft] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [isProviderReady, setIsProviderReady] = useState(false);

  const [fractionName, setFractionName] = useState('');
  const [fractionSymbol, setFractionSymbol] = useState('');
  const [totalFractions, setTotalFractions] = useState('');
  const [buyoutPrice, setBuyoutPrice] = useState('');
  const [isFractionalized, setIsFractionalized] = useState(false);
  const [floorPrice, setFloorPrice] = useState(null);

  useEffect(() => {
    const initProvider = async () => {
      try {
        console.log('🔌 Provider 초기화 시작...');
        
        if (!window.trustwallet && !window.ethereum) {
          throw new Error('Trust Wallet이 설치되어 있지 않습니다.');
        }
        
        const selectedProvider = window.trustwallet || window.ethereum;
        console.log('✅ Trust Wallet 감지됨');
        
        const ethersProvider = new ethers.BrowserProvider(selectedProvider);
        setProvider(ethersProvider);
        
        const network = await ethersProvider.getNetwork();
        const chainId = Number(network.chainId);
        
        console.log('📡 네트워크 정보:', { chainId, name: network.name });
        
        let chainInfo;
        if (chainId === 1) {
          chainInfo = {
            chainId: 1,
            name: 'Ethereum Mainnet',
            explorer: 'https://etherscan.io'
          };
        } else if (chainId === 11155111) {
          chainInfo = {
            chainId: 11155111,
            name: 'Sepolia Testnet',
            explorer: 'https://sepolia.etherscan.io'
          };
        } else {
          chainInfo = {
            chainId: chainId,
            name: network.name,
            explorer: `https://${network.name}.etherscan.io`
          };
        }
        
        setCurrentChain(chainInfo);
        setIsProviderReady(true);
        
        console.log('✅ Provider 초기화 완료:', chainInfo);
      } catch (err) {
        console.error('❌ Provider 초기화 실패:', err);
        setError('지갑을 연결할 수 없습니다. Trust Wallet을 설치하고 다시 시도해주세요.');
      }
    };
    
    initProvider();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nftData = params.get('nft');
    
    if (nftData) {
      try {
        const parsedNft = JSON.parse(decodeURIComponent(nftData));
        setNft(parsedNft);
        console.log('📦 NFT 데이터 로드:', parsedNft);
        
        if (parsedNft.type === 'fractional' && provider) {
          checkFractionalStatus(parsedNft.tokenId).then(fractionalized => {
            if (fractionalized) {
              setActiveTab('tokenInfo');
            } else {
              setActiveTab('fractionalize');
            }
          });
        } else if (parsedNft.type === 'soulbound') {
          setActiveTab('burn');
        }
      } catch (err) {
        console.error('NFT 데이터 파싱 실패:', err);
        setError('NFT 정보를 불러올 수 없습니다.');
      }
    }
  }, [provider]);

  const checkFractionalStatus = async (tokenId) => {
    try {
      const contract = await getContract(provider, 'fractional');
      const fractionalized = await contract.isFractionalized(tokenId);
      setIsFractionalized(fractionalized);
      
      try {
        const floor = await contract.floorPrice();
        const floorEth = ethers.formatEther(floor);
        setFloorPrice(floorEth);
        console.log(`🔍 NFT #${tokenId} 분할 상태:`, fractionalized);
        console.log(`💰 컨트랙트 최소 가격:`, floorEth, 'ETH');
      } catch (err) {
        console.warn('floorPrice 조회 실패:', err);
      }
      
      return fractionalized;
    } catch (err) {
      console.error('분할 상태 확인 실패:', err);
      return false;
    }
  };

  const convertIpfsUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('https://') || url.startsWith('http://')) return url;
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (url.startsWith('ipfs:/')) {
      return url.replace('ipfs:/', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (url.startsWith('Qm') || url.startsWith('bafy')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    return url;
  };

  const handleTransfer = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }
    
    if (!recipientAddress) {
      setError('받는 주소를 입력해주세요.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('올바른 이더리움 주소를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      const result = await transferNFT(
        provider,
        nft.type,
        from,
        recipientAddress,
        nft.tokenId
      );

      setTxHash(result.txHash);
      
      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('전송이 완료되었습니다!');
        window.close();
      }, 3000);

    } catch (err) {
      console.error('전송 실패:', err);
      setError(err.message || '전송에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBurn = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }

    if (!window.confirm('정말로 이 NFT를 소각하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const result = await burnNFT(provider, nft.type, nft.tokenId);
      setTxHash(result.txHash);

      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('소각이 완료되었습니다!');
        window.close();
      }, 3000);

    } catch (err) {
      console.error('소각 실패:', err);
      setError(err.message || '소각에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRedeem = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }
  
    if (!window.confirm('모든 조각을 소각하고 원본 NFT를 되찾으시겠습니까?')) {
      return;
    }
  
    setIsProcessing(true);
    setError(null);
    setTxHash(null);
  
    try {
      const contract = await getContract(provider, 'fractional');
      
      console.log('🔄 NFT 재결합 시작...');
      const tx = await contract.redeemNFT(nft.tokenId);
      
      console.log('✅ 트랜잭션 전송됨:', tx.hash);
      const receipt = await tx.wait();
      
      setTxHash(receipt.hash);
  
      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert('재결합 완료! 원본 NFT를 되찾았습니다!');
        window.close();
      }, 3000);
    } catch (err) {
      console.error('재결합 실패:', err);
      setError(err.message || 'NFT 재결합에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFractionalize = async () => {
    if (!provider) {
      setError('지갑이 연결되지 않았습니다.');
      return;
    }

    if (!fractionName || !fractionSymbol || !totalFractions || !buyoutPrice) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (Number(totalFractions) <= 0) {
      setError('총 조각 개수는 1 이상이어야 합니다.');
      return;
    }

    if (parseFloat(buyoutPrice) <= 0) {
      setError('매입 가격은 0보다 커야 합니다.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setTxHash(null);

    try {
      const contract = await getContract(provider, 'fractional');
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const buyoutPriceWei = ethers.parseEther(buyoutPrice);

      const contractAddress = contract.target || await contract.getAddress();
      
      console.log('NFT 분할 시작:', {
        tokenId: nft.tokenId,
        fractionName,
        fractionSymbol,
        totalFractions: Number(totalFractions),
        buyoutPrice: buyoutPriceWei.toString()
      });
      
      const nftContract = await getContract(provider, nft.type);
      
      const nftContractAddress = nftContract.target || await nftContract.getAddress();
      console.log('📍 NFT/Fractional 컨트랙트 주소:', nftContractAddress);
      
      const owner = await nftContract.ownerOf(nft.tokenId);
      console.log('✅ NFT 소유자:', owner);
      console.log('✅ 현재 주소:', address);
      console.log('✅ 소유자 일치:', owner.toLowerCase() === address.toLowerCase());
      
      const isApproved = await nftContract.isApprovedForAll(address, contractAddress);
      console.log('✅ Approve 상태:', isApproved);
      
      if (!isApproved && nftContractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
        console.log('⚠️ NFT가 컨트랙트에 approve되지 않았습니다. approve 진행...');
        const approveTx = await nftContract.setApprovalForAll(contractAddress, true);
        await approveTx.wait();
        console.log('✅ Approve 완료!');
      }

      console.log('🔍 컨트랙트 확인:');
      console.log('- fractionalizeNFT 함수 존재:', typeof contract.fractionalizeNFT === 'function');
      
      try {
        const floorPrice = await contract.floorPrice();
        const floorPriceEth = ethers.formatEther(floorPrice);
        console.log('💰 컨트랙트 최소 가격 (floorPrice):', floorPriceEth, 'ETH');
        console.log('💰 입력한 매입 가격 (buyoutPrice):', buyoutPrice, 'ETH');
        
        if (parseFloat(buyoutPrice) < parseFloat(floorPriceEth)) {
          throw new Error(`매입 가격이 최소 가격보다 낮습니다.\n최소 가격: ${floorPriceEth} ETH\n입력한 가격: ${buyoutPrice} ETH`);
        }
      } catch (e) {
        if (e.message.includes('최소 가격보다 낮습니다')) {
          throw e;
        }
        console.warn('- floorPrice 확인 실패:', e.message);
      }
      
      try {
        const alreadyFractionalized = await contract.isFractionalized(nft.tokenId);
        console.log('- 이미 분할됨:', alreadyFractionalized);
        if (alreadyFractionalized) {
          throw new Error('이 NFT는 이미 분할되었습니다.');
        }
      } catch (e) {
        if (e.message.includes('이미 분할되었습니다')) throw e;
        console.warn('- isFractionalized 함수 없음 또는 호출 실패');
      }
      
      console.log('📤 트랜잭션 전송 중...');
      
      try {
        const gasEstimate = await contract.fractionalizeNFT.estimateGas(
          nft.tokenId,
          fractionName,
          fractionSymbol,
          Number(totalFractions),
          buyoutPriceWei
        );
        console.log('✅ 예상 가스:', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ 가스 추정 실패:', gasError);
        
        if (gasError.data) {
          console.error('에러 데이터:', gasError.data);
        }
        if (gasError.error) {
          console.error('내부 에러:', gasError.error);
        }
        
        try {
          await contract.fractionalizeNFT.staticCall(
            nft.tokenId,
            fractionName,
            fractionSymbol,
            Number(totalFractions),
            buyoutPriceWei
          );
        } catch (staticError) {
          console.error('❌ StaticCall 에러:', staticError);
          
          if (staticError.data) {
            try {
              const errorData = staticError.data;
              console.error('상세 에러 데이터:', errorData);
              
              if (typeof errorData === 'string' && errorData.length > 10) {
                const selector = errorData.slice(0, 10);
                console.error('에러 선택자:', selector);
              }
            } catch {}
          }
          
          throw staticError;
        }
        
        throw gasError;
      }
      
      const tx = await contract.fractionalizeNFT(
        nft.tokenId,
        fractionName,
        fractionSymbol,
        Number(totalFractions),
        buyoutPriceWei
      );

      console.log('✅ 트랜잭션 전송됨:', tx.hash);
      console.log('⏳ 블록 확인 대기 중...');
      const receipt = await tx.wait();
      
      console.log('✅ 트랜잭션 확인됨!');
      setTxHash(receipt.hash);

      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'NFTFractionalized';
        } catch {
          return false;
        }
      });

      let fractionTokenAddress = null;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        fractionTokenAddress = parsed.args.fractionToken;
      }

      setTimeout(() => {
        window.opener?.postMessage({ type: 'NFT_UPDATED' }, '*');
        alert(`분할 완료!\n\nERC-20 토큰 주소:\n${fractionTokenAddress}\n\nTrust Wallet에 추가하여 조각을 확인하세요.`);
        window.close();
      }, 3000);

    } catch (err) {
      console.error('분할 실패:', err);
      setError(err.message || 'NFT 분할에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!nft) {
    return (
      <div className="manage-page">
        <div className="loading">NFT 정보를 불러오는 중...</div>
      </div>
    );
  }

  if (!isProviderReady) {
    return (
      <div className="manage-page">
        <div className="loading">
          <h2>지갑 연결 중...</h2>
          <p>잠시만 기다려주세요.</p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const isSoulbound = nft.type === 'soulbound';
  const isFractional = nft.type === 'fractional';

  return (
    <div className="manage-page">
      <div className="manage-header">
        <h1>NFT 관리</h1>
      </div>

      <div className="nft-preview-card">
        <div className="preview-image">
          {nft.metadata?.image ? (
            <img src={convertIpfsUrl(nft.metadata.image)} alt={nft.metadata.name} />
          ) : (
            <div className="no-image">이미지 없음</div>
          )}
        </div>
        <div className="preview-info">
          <h2>{nft.metadata?.name || `Token #${nft.tokenId}`}</h2>
          <p className="token-id">Token ID: #{nft.tokenId}</p>
          <div className="nft-badges">
            <span className={`nft-type ${nft.type}`}>
              {nft.type === 'soulbound' && 'Soulbound'}
              {nft.type === 'native' && 'Native NFT'}
              {nft.type === 'fractional' && 'Fractional'}
              {nft.type === 'dynamic' && 'Dynamic'}
              {nft.type === 'composable' && 'Composable'}
            </span>
            <span className="nft-chain">
              {nft.chain}
            </span>
            {isFractionalized && (
              <span className="nft-fractionalized">
                이미 분할됨
              </span>
            )}
          </div>
        </div>
      </div>

      {isSoulbound && (
        <div className="warning-banner">
          ⚠️ Soulbound Token은 전송할 수 없습니다. 소각만 가능합니다.
        </div>
      )}

      {isFractional && isFractionalized && (
        <div className="info-banner success">
          ✅ 이 NFT는 분할되었습니다! 아래 탭에서 ERC-20 토큰 정보를 확인하세요.
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs">
          {isFractional && !isFractionalized && (
            <button className={`tab ${activeTab === 'fractionalize' ? 'active' : ''}`} onClick={() => setActiveTab('fractionalize')}>분할(Split)</button>
          )}
          {!isSoulbound && !isFractionalized && (
            <button className={`tab ${activeTab === 'transfer' ? 'active' : ''}`} onClick={() => setActiveTab('transfer')}>전송(Transfer)</button>
          )}
          {!isFractionalized && (
            <button className={`tab ${activeTab === 'burn' ? 'active' : ''}`} onClick={() => setActiveTab('burn')}>소각(Burn)</button>
          )}
          {isFractional && isFractionalized && (
            <>
              <button className={`tab ${activeTab === 'tokenInfo' ? 'active' : ''}`} onClick={() => setActiveTab('tokenInfo')}>분할 토큰 정보</button>
              <button className={`tab ${activeTab === 'redeem' ? 'active' : ''}`} onClick={() => setActiveTab('redeem')}>재결합</button>
              <button className={`tab ${activeTab === 'buyout' ? 'active' : ''}`} onClick={() => setActiveTab('buyout')}>매입/투표</button>
            </>
          )}
        </div>

        <div className="tab-content">
          {activeTab === 'transfer' && !isSoulbound && !isFractionalized && (
            <div className="action-form">
              <div className="form-group">
                <label htmlFor="recipient">받는 주소</label>
                <input
                  id="recipient"
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isProcessing}
                />
                <small>NFT를 받을 이더리움 주소를 입력하세요</small>
              </div>

              <button
                onClick={handleTransfer}
                className="action-button transfer"
                disabled={isProcessing}
              >
                {isProcessing ? '전송 중...' : '전송하기'}
              </button>
            </div>
          )}

          {activeTab === 'burn' && !isFractionalized && (
            <div className="burn-section">
              <div className="warning-box">
                <p>⚠️ <strong>주의:</strong> NFT를 소각하면 영구적으로 삭제됩니다.</p>
                <p>이 작업은 되돌릴 수 없습니다.</p>
              </div>

              <button
                onClick={handleBurn}
                className="action-button burn"
                disabled={isProcessing}
              >
                {isProcessing ? '소각 중...' : '🔥 소각하기'}
              </button>
            </div>
          )}

          {activeTab === 'fractionalize' && isFractional && !isFractionalized && (
            <div className="action-form">
              <div className="form-group">
                <label htmlFor="fractionName">조각 토큰 이름</label>
                <input
                  id="fractionName"
                  type="text"
                  value={fractionName}
                  onChange={(e) => setFractionName(e.target.value)}
                  placeholder="예: Fractional Art Token"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fractionSymbol">조각 토큰 심볼</label>
                <input
                  id="fractionSymbol"
                  type="text"
                  value={fractionSymbol}
                  onChange={(e) => setFractionSymbol(e.target.value)}
                  placeholder="예: FART"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label htmlFor="totalFractions">총 조각 개수</label>
                <input
                  id="totalFractions"
                  type="number"
                  value={totalFractions}
                  onChange={(e) => setTotalFractions(e.target.value)}
                  placeholder="예: 10"
                  min="1"
                  disabled={isProcessing}
                />
                <small>이 개수만큼 ERC-20 토큰이 생성됩니다</small>
              </div>

              <div className="form-group">
                <label htmlFor="buyoutPrice">매입 가격 (ETH)</label>
                <input
                  id="buyoutPrice"
                  type="text"
                  value={buyoutPrice}
                  onChange={(e) => setBuyoutPrice(e.target.value)}
                  placeholder={floorPrice ? `최소 ${floorPrice} ETH` : "예: 100"}
                  disabled={isProcessing}
                />
                {floorPrice && parseFloat(floorPrice) > 10 && (
                  <div className="warning-box floor-price-warning">
                    <p className="warning-title">
                      ⚠️ <strong>컨트랙트 최소 가격이 매우 높게 설정되어 있습니다: {floorPrice} ETH</strong>
                    </p>
                    <p className="warning-text">
                      • 테스트용이므로 그냥 {floorPrice} 입력해서 테스트하세요<br/>
                      • 또는 컨트랙트 Owner가 <code>setFloorPrice</code> 함수로 낮춰야 합니다
                    </p>
                  </div>
                )}
                {floorPrice && parseFloat(floorPrice) <= 10 && (
                  <small className="floor-price-warning">
                    ⚠️ 최소 가격: <strong>{floorPrice} ETH</strong> 이상 입력해주세요
                  </small>
                )}
                {!floorPrice && (
                  <small>누군가 이 가격을 지불하면 전체 NFT를 매입할 수 있습니다</small>
                )}
              </div>

              {totalFractions && buyoutPrice && (
                <div className="price-info-box">
                  <strong>조각당 가격:</strong> {(parseFloat(buyoutPrice) / Number(totalFractions)).toFixed(6)} ETH
                </div>
              )}

              <button
                onClick={handleFractionalize}
                className="action-button fractionalize"
                disabled={isProcessing}
              >
                {isProcessing ? '분할 중...' : 'NFT 분할하기'}
              </button>
            </div>
          )}

          {activeTab === 'tokenInfo' && isFractional && isFractionalized && (
            <div className="token-info-section">
              <FractionTokenInfo nft={nft} provider={provider} />
            </div>
          )}

          {activeTab === 'redeem' && isFractional && isFractionalized && (
            <div className="redeem-section">
              <div className="info-box">
                <h3>🔄 NFT 재결합</h3>
                <p>모든 조각 토큰을 소각하고 원본 NFT를 되찾을 수 있습니다.</p>
                <p><strong>조건:</strong> 모든 조각(100%)을 보유해야 합니다.</p>
              </div>

              <div className="redeem-info">
                <p>💡 재결합하면:</p>
                <p>• 모든 HAPPY 토큰이 소각됩니다</p>
                <p>• 원본 NFT #{nft.tokenId}를 다시 소유하게 됩니다</p>
                <p>• 더 이상 분할 상태가 아닙니다</p>
              </div>

              <button onClick={handleRedeem} className="action-button redeem" disabled={isProcessing}>
                {isProcessing ? '재결합 중...' : '🔄 NFT 재결합하기'}
              </button>
            </div>
          )}

          {activeTab === 'buyout' && isFractional && isFractionalized && (
            <div className="vote-section">
              <div className="info-box">
                <h3>💰 매입 제안 & 투표</h3>
                <p>이 기능은 추후 구현 예정입니다.</p>
                <p>매입 제안을 하거나 다른 사람의 제안에 투표할 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {txHash && (
          <div className="success-message">
            <p>✅ 트랜잭션 성공!</p>
            <a
              href={`${currentChain?.explorer}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Explorer에서 보기 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTManagePage;