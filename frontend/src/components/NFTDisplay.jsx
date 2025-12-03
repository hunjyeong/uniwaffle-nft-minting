import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getEvmNFTs } from '../utils/EVMcontract';
import { CHAIN_TYPES } from '../config/chains';
import axios from 'axios';

const NFTDisplay = () => {
  const { account, provider, isConnected, currentChain } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NFT 메타데이터 가져오기
  const fetchMetadata = async (tokenURI) => {
    try {
      // ipfs:// URL을 HTTP 게이트웨이로 변환
      let uri = tokenURI;
      if (uri.startsWith('ipfs://')) {
        uri = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      }
      
      const response = await axios.get(uri);
      return response.data;
    } catch (err) {
      console.error('메타데이터 로드 실패:', err);
      return null;
    }
  };

  // IPFS URL을 HTTP로 변환하는 헬퍼 함수
  const convertIpfsUrl = (url) => {
    if (!url) return '';
    
    // 이미 https://로 시작하는 경우
    if (url.startsWith('https://')) {
      // 중복된 게이트웨이 URL 수정
      const duplicatePattern = /https:\/\/gateway\.pinata\.cloud\/ipfs\/https:\/\/gateway\.pinata\.cloud\/ipfs\//;
      if (duplicatePattern.test(url)) {
        return url.replace(duplicatePattern, 'https://gateway.pinata.cloud/ipfs/');
      }
      return url;
    }
    
    // ipfs:// 프로토콜을 HTTP로 변환
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    
    // Qm으로 시작하는 해시만 있는 경우
    if (url.startsWith('Qm')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    
    return url;
  };

  // EVM 체인의 NFT 로드
  const loadEvmNFTs = async () => {
    const allNFTs = [];

    try {
      console.log('🔍 Soulbound NFT 조회 중...');
      const soulboundNFTs = await getEvmNFTs(provider, account, 'soulbound');
      console.log('✅ Soulbound NFTs:', soulboundNFTs);
      
      for (let nft of soulboundNFTs) {
        const metadata = await fetchMetadata(nft.tokenURI);
        allNFTs.push({
          ...nft,
          metadata,
          chain: currentChain.name
        });
      }
    } catch (err) {
      console.error('❌ Soulbound Token 조회 실패:', err);
    }

    try {
      console.log('🔍 Native NFT 조회 중...');
      const nativeNFTs = await getEvmNFTs(provider, account, 'native');
      console.log('✅ Native NFTs:', nativeNFTs);
      
      for (let nft of nativeNFTs) {
        const metadata = await fetchMetadata(nft.tokenURI);
        allNFTs.push({
          ...nft,
          metadata,
          chain: currentChain.name
        });
      }
    } catch (err) {
      console.error('❌ Native NFT 조회 실패:', err);
    }

    try {
      console.log('🔍 Fractional NFT 조회 중...');
      const fractionalNFTs = await getEvmNFTs(provider, account, 'fractional');
      console.log('✅ Fractional NFTs:', fractionalNFTs);
      
      for (let nft of fractionalNFTs) {
        const metadata = await fetchMetadata(nft.tokenURI);
        allNFTs.push({
          ...nft,
          metadata,
          chain: currentChain.name
        });
      }
    } catch (err) {
      console.error('❌ Fractional NFT 조회 실패:', err);
    }

    return allNFTs;
  };

  // 사용자의 NFT 목록 가져오기
  const loadNFTs = useCallback(async () => {
    if (!isConnected || !provider) {
      console.log('⚠️ 지갑이 연결되지 않음');
      return;
    }

    console.log('🚀 NFT 로딩 시작...', {
      account,
      chain: currentChain?.name,
      chainType: currentChain?.type
    });

    setLoading(true);
    setError(null);

    try {
      let allNFTs = [];

      if (currentChain?.type === CHAIN_TYPES.EVM) {
        allNFTs = await loadEvmNFTs();
      } else {
        console.warn('⚠️ 지원하지 않는 체인 타입:', currentChain?.type);
        setError('현재 EVM 체인만 지원합니다.');
      }

      console.log('✅ 전체 NFT 로드 완료:', allNFTs);
      
      if (allNFTs.length === 0) {
        console.log('ℹ️ NFT가 없습니다');
      }
      
      setNfts(allNFTs);
    } catch (err) {
      console.error('❌ NFT 로드 실패:', err);
      setError('NFT를 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [isConnected, provider, account, currentChain]);

  // 계정 변경 시 NFT 다시 로드
  useEffect(() => {
    if (isConnected && account) {
      loadNFTs();
    } else {
      setNfts([]);
    }
  }, [isConnected, account, currentChain, loadNFTs]);

  if (!isConnected) {
    return (
      <div className="nft-display">
        <p className="no-nfts">지갑을 연결하여 NFT를 확인하세요</p>
      </div>
    );
  }

  return (
    <div className="nft-display">
      <div className="nft-header">
        <h2>My NFT</h2>
        <div className="header-info">
          {currentChain && (
            <span className="chain-badge">
              <span className="chain-icon">{currentChain.icon}</span>
              {currentChain.shortName}
            </span>
          )}
          <button onClick={loadNFTs} className="refresh-button" disabled={loading}>
            {loading ? '로딩 중...' : '🔄 새로고침'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">NFT를 불러오는 중...</div>
      ) : nfts.length === 0 ? (
        <p className="no-nfts">아직 NFT가 없습니다</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft, index) => (
            <div key={`${nft.type}-${nft.tokenId}-${index}`} className="nft-card">
              <div className="nft-image">
                {nft.metadata?.image ? (
                  <img 
                    src={convertIpfsUrl(nft.metadata.image)} 
                    alt={nft.metadata.name}
                    onError={(e) => {
                      console.error('이미지 로드 실패:', nft.metadata.image);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="no-image">이미지 로드 실패</div>';
                    }}
                  />
                ) : (
                  <div className="no-image">이미지 없음</div>
                )}
              </div>
              
              <div className="nft-info">
                <h3>{nft.metadata?.name || `Token #${nft.tokenId}`}</h3>
                <p className="nft-description">
                  {nft.metadata?.description || '설명 없음'}
                </p>
                
                <div className="nft-meta">
                  <span className={`nft-type ${nft.type}`}>
                    {nft.type === 'soulbound' && '🔒 Soulbound'}
                    {nft.type === 'native' && '🔄 Native NFT'}
                    {nft.type === 'fractional' && '💎 Fractional'}
                  </span>
                  <span className="nft-token-id">
                    #{nft.tokenId}
                  </span>
                </div>

                <div className="nft-chain">
                  <span className="chain-icon">{currentChain?.icon}</span>
                  <span>{nft.chain}</span>
                </div>

                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                  <div className="nft-attributes">
                    {nft.metadata.attributes.map((attr, idx) => (
                      <div key={idx} className="attribute">
                        <span className="attr-type">{attr.trait_type}</span>
                        <span className="attr-value">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .nft-display {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 20px;
        }

        .nft-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .nft-header h2 {
          margin: 0;
          font-size: 28px;
          color: #212529;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chain-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #e7f5ff;
          border: 2px solid #74c0fc;
          border-radius: 8px;
          font-weight: 600;
          color: #1864ab;
          font-size: 14px;
        }

        .chain-icon {
          font-size: 18px;
        }

        .refresh-button {
          padding: 10px 18px;
          background: white;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #adb5bd;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading, .no-nfts {
          text-align: center;
          padding: 60px 20px;
          color: #868e96;
          font-size: 16px;
        }

        .error-message {
          padding: 16px;
          background: #ffe0e0;
          color: #c92a2a;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .nft-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .nft-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .nft-image {
          width: 100%;
          height: 280px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .nft-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          color: #868e96;
          font-size: 14px;
        }

        .nft-info {
          padding: 20px;
        }

        .nft-info h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #212529;
        }

        .nft-description {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #868e96;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .nft-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .nft-type {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .nft-type.soulbound {
          background: #ffe0e0;
          color: #c92a2a;
        }

        .nft-type.native {
          background: #d3f9d8;
          color: #2b8a3e;
        }

        .nft-type.fractional {
          background: #e7f5ff;
          color: #1864ab;
        }

        .nft-token-id {
          font-family: monospace;
          font-size: 12px;
          color: #868e96;
        }

        .nft-chain {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 13px;
          color: #495057;
          margin-bottom: 12px;
        }

        .nft-attributes {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .attribute {
          flex: 1 1 calc(50% - 4px);
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 12px;
        }

        .attr-type {
          display: block;
          color: #868e96;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .attr-value {
          display: block;
          color: #495057;
        }
      `}</style>
    </div>
  );
};

export default NFTDisplay;