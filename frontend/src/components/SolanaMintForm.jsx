import React, { useState, useEffect } from 'react';
import { useSolanaWallet } from '../hooks/useSolanaWallet';
import { useWeb3 } from '../hooks/useWeb3';
import './MintForm.css';

const SolanaMintForm = () => {
  const { account: ethAccount, disconnectWallet: disconnectEth } = useWeb3();

  const { 
    wallet, 
    connected, 
    publicKey, 
    connectWallet,
    uploadAndMintNFT  // Document 1의 함수 사용
  } = useSolanaWallet();
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    image: null,
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [mintedNFT, setMintedNFT] = useState(null);

  // Solana 페이지 진입 시 이더리움 지갑 자동 연결 해제
  useEffect(() => {
    if (ethAccount) {
      console.log('🔄 Solana 페이지 진입 - 이더리움 지갑 자동 연결 해제');
      disconnectEth();
    }
  }, []); // 페이지 진입 시 1회만 실행

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: '이미지 크기는 10MB 이하여야 합니다.' });
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!connected || !wallet) {
      setMessage({ type: 'error', text: '먼저 Phantom 지갑을 연결해주세요.' });
      return;
    }

    if (!formData.name || !formData.symbol || !formData.image) {
      setMessage({ type: 'error', text: '모든 필수 항목을 입력해주세요.' });
      return;
    }

    try {
      setMinting(true);
      setMessage({ type: 'info', text: 'NFT 민팅을 시작합니다...' });

      // Document 1의 uploadAndMintNFT 사용 (백엔드 API 방식)
      const result = await uploadAndMintNFT(
        formData.image,
        formData.name,
        formData.description,
        [] // attributes
      );

      setMintedNFT({
        name: formData.name,
        symbol: formData.symbol,
        mintAddress: result.mintAddress,
        imageUrl: result.imageUrl,
        explorerUrl: `https://explorer.solana.com/address/${result.mintAddress}?cluster=devnet`
      });

      setMessage({ 
        type: 'success', 
        text: `🎉 NFT "${formData.name}"이 성공적으로 민팅되었습니다!` 
      });

      // 폼 초기화
      setFormData({
        name: '',
        symbol: '',
        description: '',
        image: null,
      });
      setImagePreview(null);

    } catch (error) {
      console.error('Minting error:', error);
      setMessage({ 
        type: 'error', 
        text: `민팅 실패: ${error.message}` 
      });
    } finally {
      setMinting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      description: '',
      image: null,
    });
    setImagePreview(null);
    setMessage({ type: '', text: '' });
    setMintedNFT(null);
  };

  return (
    <div className="mint-form-container">
      <h2>Solana NFT 민팅</h2>
      
      {!connected && (
        <div className="warning-message">
          ⚠️ NFT를 민팅하려면 먼저 Phantom 지갑을 연결해주세요.
          <button 
            onClick={connectWallet} 
            className="connect-wallet-btn"
            style={{ marginLeft: '10px' }}
          >
            지갑 연결
          </button>
        </div>
      )}

      {connected && publicKey && (
        <div style={{ padding: '10px', background: '#e8f5e9', marginBottom: '20px' }}>
          ✅ 연결됨: {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
        </div>
      )}

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {mintedNFT && (
        <div className="success-box">
          <h3>✅ 민팅 성공!</h3>
          <div className="nft-info">
            <p><strong>이름:</strong> {mintedNFT.name}</p>
            <p><strong>심볼:</strong> {mintedNFT.symbol}</p>
            <p><strong>Mint 주소:</strong> {mintedNFT.mintAddress}</p>
            {mintedNFT.imageUrl && (
              <img src={mintedNFT.imageUrl} alt={mintedNFT.name} style={{ maxWidth: '200px', marginTop: '10px' }} />
            )}
            <a 
              href={mintedNFT.explorerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="explorer-link"
            >
              Solana Explorer에서 보기 →
            </a>
          </div>
          <button onClick={resetForm} className="reset-button">
            새로운 NFT 민팅하기
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mint-form">
        {/* 이미지 업로드 */}
        <div className="form-group">
          <label htmlFor="image">NFT 이미지 *</label>
          <div className="image-upload-area">
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, image: null }));
                    setImagePreview(null);
                  }}
                  className="remove-image"
                >
                  ✕ 제거
                </button>
              </div>
            ) : (
              <label htmlFor="image" className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <span>클릭하여 이미지 업로드</span>
                <span className="upload-hint">PNG, JPG, GIF (최대 10MB)</span>
              </label>
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              disabled={minting}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* NFT 이름 */}
        <div className="form-group">
          <label htmlFor="name">NFT 이름 *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="예: My Awesome Solana NFT"
            disabled={minting}
            required
          />
        </div>

        {/* 심볼 */}
        <div className="form-group">
          <label htmlFor="symbol">심볼 *</label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleInputChange}
            placeholder="예: MYNFT"
            maxLength={10}
            disabled={minting}
            required
          />
          <small>최대 10자, 대문자 권장</small>
        </div>

        {/* 설명 */}
        <div className="form-group">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="NFT에 대한 설명을 입력하세요..."
            rows={4}
            disabled={minting}
          />
        </div>

        {/* 제출 버튼 */}
        <button 
          type="submit" 
          className="submit-button"
          disabled={!connected || minting}
        >
          {minting ? '⏳ NFT 민팅 중...' : '🚀 NFT 민팅하기'}
        </button>
      </form>

      <div className="info-box">
        <h4>📌 참고사항</h4>
        <ul>
          <li>✨ 백엔드 API를 통해 안전하게 민팅</li>
          <li>Solana Devnet에서 민팅됩니다</li>
          <li><a href="https://solfaucet.com" target="_blank" rel="noopener noreferrer">SOL Faucet</a>에서 테스트 SOL을 받으세요</li>
        </ul>
      </div>
    </div>
  );
};

export default SolanaMintForm;