import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3';
import { getContract } from '../utils/contract';
import axios from 'axios';

const NFTDisplay = () => {
  const { account, provider, isConnected } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NFT 메타데이터 가져오기
  const fetchMetadata = async (tokenURI) => {
    try {
      const response = await axios.get(tokenURI);
      return response.data;
    } catch (err) {
      console.error('메타데이터 로드 실패:', err);
      return null;
    }
  };

  // 사용자의 NFT 목록 가져오기
  const loadNFTs = async () => {
    if (!isConnected || !provider) return;

    setLoading(true);
    setError(null);

    try {
      const allNFTs = [];

      // Soulbound NFT 조회
      try {
        const soulboundContract = await getContract(provider, 'soulbound');
        const soulboundTokens = await soulboundContract.tokensOfOwner(account);
        
        for (let tokenId of soulboundTokens) {
          const tokenURI = await soulboundContract.tokenURI(tokenId);
          const metadata = await fetchMetadata(tokenURI);
          
          allNFTs.push({
            tokenId: tokenId.toString(),
            type: 'soulbound',
            tokenURI,
            metadata
          });
        }
      } catch (err) {
        console.error('Soulbound NFT 조회 실패:', err);
      }

      // Transferable NFT 조회
      try {
        const transferableContract = await getContract(provider, 'transferable');
        const transferableTokens = await transferableContract.tokensOfOwner(account);
        
        for (let tokenId of transferableTokens) {
          const tokenURI = await transferableContract.tokenURI(tokenId);
          const metadata = await fetchMetadata(tokenURI);
          
          allNFTs.push({
            tokenId: tokenId.toString(),
            type: 'transferable',
            tokenURI,
            metadata
          });
        }
      } catch (err) {
        console.error('Transferable NFT 조회 실패:', err);
      }

      setNfts(allNFTs);
    } catch (err) {
      console.error('NFT 로드 실패:', err);
      setError('NFT를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 계정 변경 시 NFT 다시 로드
  useEffect(() => {
    if (isConnected && account) {
      loadNFTs();
    } else {
      setNfts([]);
    }
  }, [isConnected, account]);

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
        <h2>🖼️ 내 NFT</h2>
        <button onClick={loadNFTs} className="refresh-button" disabled={loading}>
          {loading ? '로딩 중...' : '🔄 새로고침'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">NFT를 불러오는 중...</div>
      ) : nfts.length === 0 ? (
        <p className="no-nfts">아직 NFT가 없습니다</p>
      ) : (
        <div className="nft-grid">
          {nfts.map((nft) => (
            <div key={`${nft.type}-${nft.tokenId}`} className="nft-card">
              <div className="nft-image">
                {nft.metadata?.image ? (
                  <img src={nft.metadata.image} alt={nft.metadata.name} />
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
                    {nft.type === 'soulbound' ? '🔒 Soulbound' : '🔄 Transferable'}
                  </span>
                  <span className="nft-token-id">#{nft.tokenId}</span>
                </div>

                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                  <div className="nft-attributes">
                    {nft.metadata.attributes.map((attr, index) => (
                      <div key={index} className="attribute">
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
    </div>
  );
};

export default NFTDisplay;