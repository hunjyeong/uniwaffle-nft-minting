import { useState, useEffect, createContext, useContext } from 'react';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const SolanaWalletContext = createContext();

export const SolanaWalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    const setupWallet = async () => {
      // Solana Connection 초기화 (Devnet)
      const conn = new Connection(
        clusterApiUrl('devnet'),
        'confirmed'
      );
      setConnection(conn);

      if (window.solana && window.solana.isPhantom) {
        setWallet(window.solana);

        // 자동 연결 시도
        // try {
        //   const response = await window.solana.connect({ onlyIfTrusted: true });
        //   setPublicKey(response.publicKey);
        //   setConnected(true);
        //   console.log('✅ 자동 연결됨:', response.publicKey.toString());
        // } catch (error) {
        //   console.log('자동 연결 안됨');
        // }

        // 지갑 연결 이벤트
        window.solana.on('connect', (pubKey) => {
          setPublicKey(pubKey);
          setConnected(true);
          console.log('✅ 지갑 연결됨:', pubKey.toString());
        });

        // 지갑 연결 해제 이벤트
        window.solana.on('disconnect', () => {
          setPublicKey(null);
          setConnected(false);
          console.log('지갑 연결 해제됨');
        });

        // 계정 변경 이벤트
        window.solana.on('accountChanged', (pubKey) => {
          if (pubKey) {
            setPublicKey(pubKey);
            console.log('✅ 계정 변경됨:', pubKey.toString());
          } else {
            setPublicKey(null);
            setConnected(false);
          }
        });
      }
    };

    setupWallet();

    return () => {
      if (window.solana) {
        window.solana.removeAllListeners('connect');
        window.solana.removeAllListeners('disconnect');
        window.solana.removeAllListeners('accountChanged');
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!wallet) {
      window.open('https://phantom.app/', '_blank');
      throw new Error('Phantom 지갑이 설치되지 않았습니다');
    }

    try {
      const response = await wallet.connect();
      setPublicKey(response.publicKey);
      setConnected(true);
      
      console.log('✅ 지갑 연결 완료:', response.publicKey.toString());
      return response.publicKey;
    } catch (error) {
      console.error('❌ 지갑 연결 실패:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
        setPublicKey(null);
        setConnected(false);
        console.log('✅ 지갑 연결 해제 완료');
      } catch (error) {
        console.error('❌ 지갑 연결 해제 실패:', error);
        throw error;
      }
    }
  };

  // 이미지를 Pinata에 업로드
  const uploadImageToPinata = async (imageFile, name = 'NFT Image') => {
    try {
      const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;
      
      if (!PINATA_JWT) {
        throw new Error('Pinata JWT 토큰이 설정되지 않았습니다. .env 파일을 확인하세요.');
      }

      console.log('🖼️  이미지 업로드 중...', name);

      const formData = new FormData();
      formData.append('file', imageFile);
      
      const pinataMetadata = JSON.stringify({
        name: name
      });
      formData.append('pinataMetadata', pinataMetadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata 업로드 실패: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const imageIpfsUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
      
      console.log('✅ 이미지 업로드 완료:', imageIpfsUrl);
      return {
        url: imageIpfsUrl,
        hash: data.IpfsHash
      };

    } catch (error) {
      console.error('❌ 이미지 업로드 실패:', error);
      throw error;
    }
  };

  // 메타데이터를 Pinata에 업로드
  const uploadMetadataToPinata = async (metadata, name = 'NFT Metadata') => {
    try {
      const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;
      
      if (!PINATA_JWT) {
        throw new Error('Pinata JWT 토큰이 설정되지 않았습니다.');
      }

      console.log('📝 메타데이터 업로드 중...', metadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pinataMetadata: { name },
          pinataContent: metadata
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Pinata 업로드 실패: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
      
      console.log('✅ 메타데이터 업로드 완료:', metadataUri);
      
      return {
        uri: metadataUri,
        hash: data.IpfsHash
      };

    } catch (error) {
      console.error('❌ 메타데이터 업로드 실패:', error);
      throw error;
    }
  };

  // NFT 메타데이터 업로드 (이미지 + 메타데이터만, 민팅은 백엔드에서)
  const uploadNFT = async (imageFile, name, description, attributes = []) => {
    try {
      if (!connected || !publicKey) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      console.log('📤 NFT 메타데이터 업로드 시작:', { name, description });

      // 1. 이미지 업로드
      const { url: imageUrl, hash: imageHash } = await uploadImageToPinata(
        imageFile, 
        `${name} - Image`
      );

      // 2. 메타데이터 생성 (Solana Metaplex 표준)
      const metadata = {
        name: name,
        symbol: 'UNFT',
        description: description,
        image: imageUrl,
        external_url: '',
        attributes: attributes,
        properties: {
          files: [
            {
              uri: imageUrl,
              type: imageFile.type
            }
          ],
          category: 'image',
          creators: [
            {
              address: publicKey.toString(),
              share: 100
            }
          ]
        }
      };

      // 3. 메타데이터 업로드
      const { uri: metadataUri, hash: metadataHash } = await uploadMetadataToPinata(
        metadata,
        `${name} - Metadata`
      );

      console.log('✅ NFT 메타데이터 업로드 완료:', { imageUrl, metadataUri });

      return {
        imageUrl,
        imageHash,
        metadataUri,
        metadataHash,
        metadata
      };

    } catch (error) {
      console.error('❌ NFT 메타데이터 업로드 실패:', error);
      throw error;
    }
  };

  // 백엔드 API를 통해 실제 NFT 민팅
  const mintNFT = async (metadataUri, name, symbol = 'UNFT') => {
    try {
      if (!connected || !publicKey) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      console.log('🎨 NFT 민팅 요청 중...', { metadataUri });

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

      const response = await fetch(`${API_BASE_URL}/api/solana/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadataUri,
          walletAddress: publicKey.toString(),
          name,
          symbol
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'NFT 민팅 실패');
      }

      const data = await response.json();
      console.log('✅ NFT 민팅 완료:', data);

      return data;

    } catch (error) {
      console.error('❌ NFT 민팅 실패:', error);
      throw error;
    }
  };

  // 전체 프로세스: 업로드 + 민팅
  const uploadAndMintNFT = async (imageFile, name, description, attributes = []) => {
    try {
      // 1. 메타데이터 업로드
      const uploadResult = await uploadNFT(imageFile, name, description, attributes);
      
      // 2. NFT 민팅
      const mintResult = await mintNFT(uploadResult.metadataUri, name);
      
      return {
        ...uploadResult,
        ...mintResult
      };

    } catch (error) {
      console.error('❌ NFT 업로드 및 민팅 실패:', error);
      throw error;
    }
  };

  // IPFS URL을 HTTP 게이트웨이 URL로 변환
  const convertIpfsToHttp = (url) => {
    if (!url) return '';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    
    if (url.startsWith('Qm') || url.startsWith('bafy')) {
      return `https://gateway.pinata.cloud/ipfs/${url}`;
    }
    
    return url;
  };

  const value = {
    wallet,
    publicKey,
    connected,
    connection,
    connectWallet,
    disconnectWallet,
    uploadImageToPinata,
    uploadMetadataToPinata,
    uploadNFT,
    mintNFT,
    uploadAndMintNFT,
    convertIpfsToHttp,
  };

  return (
    <SolanaWalletContext.Provider value={value}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

export const useSolanaWallet = () => {
  const context = useContext(SolanaWalletContext);
  if (!context) {
    throw new Error('useSolanaWallet must be used within SolanaWalletProvider');
  }
  return context;
};