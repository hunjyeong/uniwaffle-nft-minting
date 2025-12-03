import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../hooks/useWeb3.js';
import { uploadNFT } from '../utils/ipfs.js';
import { mintEvmNFT } from '../utils/EVMcontract.js';
import { CHAIN_TYPES } from '../config/chains.js';
import './MintForm.css';

const MintForm = () => {
  const { account, provider, isConnected, isCorrectNetwork, currentChain } = useWeb3();
  
  const [nftType, setNftType] = useState('native');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  
  const [isMinting, setIsMinting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mintResult, setMintResult] = useState(null);
  const [error, setError] = useState(null);

  const isButtonDisabled = isMinting || !isConnected || !isCorrectNetwork;

  // 체인 변경 시 상태 초기화
  useEffect(() => {
    console.log('🔄 체인 변경 감지:', currentChain?.name);
    setMintResult(null);
    setError(null);
  }, [currentChain?.id]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      setImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMint = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('먼저 지갑을 연결해주세요.');
      return;
    }
    
    if (!isCorrectNetwork) {
      setError(`${currentChain?.name} 네트워크로 전환해주세요.`);
      return;
    }

    if (!name || !description || !imageFile) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    const recipient = recipientAddress || account;
    setIsMinting(true);
    setError(null);
    setMintResult(null);
    setUploadProgress('');

    try {
      setUploadProgress('이미지를 IPFS에 업로드 중...');
      const tokenURI = await uploadNFT(imageFile, name, description);
      
      setUploadProgress('업로드 완료! 민팅 중...');
      
      let result;
      if (currentChain?.type === CHAIN_TYPES.EVM) {
        result = await mintEvmNFT(provider, nftType, recipient, tokenURI);
      } else {
        throw new Error('지원하지 않는 블록체인입니다.');
      }
      
      setMintResult({
        ...result,
        tokenURI,
        recipient,
        nftType,
        chain: currentChain.name
      });
      
      setUploadProgress('');
      setName('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setRecipientAddress('');
      
    } catch (err) {
      console.error('민팅 실패:', err);
      setError(err.message || '민팅에 실패했습니다.');
      setUploadProgress('');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="mint-form-container">
      <h2>NFT Minting</h2>
      
      {currentChain && (
        <div className="chain-badge" key={currentChain.id}>
          <span>{currentChain.name}에서 민팅</span>
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="warning-message">
          ⚠️ 올바른 네트워크로 전환해주세요
        </div>
      )}
      
      <form onSubmit={handleMint} className="mint-form">
        <div className="form-group">
          <label>NFT Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="native"
                checked={nftType === 'native'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Native NFT</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="soulbound"
                checked={nftType === 'soulbound'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Soulbound Token</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="fractional"
                checked={nftType === 'fractional'}
                onChange={(e) => setNftType(e.target.value)}
              />
              <span>Fractional NFT</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">NFT Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: OSDC Certificate"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="NFT에 대한 설명을 입력하세요"
            rows="3"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">이미지</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="recipient">
            받을 주소 (선택사항)
            <span className="hint">비워두면 자신에게 민팅됩니다</span>
          </label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
          />
        </div>

        {uploadProgress && (
          <div className="progress-message">
            {uploadProgress}
          </div>
        )}

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {mintResult && (
          <div className="success-message">
            <h3>민팅 성공! 🎉</h3>
            <p><strong>체인:</strong> {mintResult.chain}</p>
            {mintResult.tokenId && (
              <p><strong>Token ID:</strong> {mintResult.tokenId}</p>
            )}
            <p><strong>받는 주소:</strong> {mintResult.recipient}</p>
            <p>
              <strong>트랜잭션:</strong>{' '}
              <a 
                href={`${currentChain?.explorer}/tx/${mintResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explorer에서 보기 →
              </a>
            </p>
          </div>
        )}

        <button 
          type="submit" 
          className="mint-button"
          disabled={isButtonDisabled}
        >
          {isMinting ? '민팅 중...' : '민팅하기'}
        </button>
      </form>
    </div>
  );
};

export default MintForm;