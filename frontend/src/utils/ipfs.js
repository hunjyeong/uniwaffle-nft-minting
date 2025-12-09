// frontend/src/utils/ipfs.js
import axios from 'axios';

// 백엔드 API URL (개발 환경)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * NFT를 로컬 및 Pinata IPFS에 업로드
 * @param {File} imageFile - 이미지 파일
 * @param {string} name - NFT 이름
 * @param {string} description - NFT 설명
 * @param {object} metadata - 추가 메타데이터 (선택사항, Dynamic NFT용)
 * @returns {Promise<object>} { tokenURI, metadataHash }
 */
export const uploadNFT = async (imageFile, name, description, metadata = null) => {
  try {
    console.log('📤 NFT 업로드 시작:', { name, description });

    // FormData 생성
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('name', name);
    formData.append('description', description);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // 백엔드 API로 업로드 요청
    const response = await axios.post(`${API_BASE_URL}/api/nft/upload-nft`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const result = response.data;
    
    console.log('✅ 업로드 완료:', result);
    console.log(`💾 로컬 저장: ${result.local.metadataFilename}`);
    console.log(`🌐 IPFS TokenURI: ${result.ipfs.tokenURI}`);

    // tokenURI 반환
    return {
      tokenURI: result.ipfs.tokenURI,
      metadataHash: result.ipfs.metadataHash
    };

  } catch (error) {
    console.error('❌ NFT 업로드 실패:', error);
    throw new Error(
      error.response?.data?.details || 
      error.message || 
      'NFT 업로드에 실패했습니다.'
    );
  }
};

/**
 * IPFS URL을 HTTP 게이트웨이 URL로 변환 (ipfs.io 사용)
 * @param {string} url - IPFS URL
 * @returns {string} HTTP URL
 */
export const convertIpfsToHttp = (url) => {
  if (!url) return '';
  
  // 이미 HTTP/HTTPS URL이면 ipfs.io로 변환
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 이미 ipfs.io를 사용하고 있으면 그대로
    if (url.includes('ipfs.io')) {
      return url;
    }
    // 다른 게이트웨이면 해시 추출 후 ipfs.io로 변환
    const hashMatch = url.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/);
    if (hashMatch) {
      return `https://ipfs.io/ipfs/${hashMatch[0]}`;
    }
    return url;
  }
  
  // ipfs:// 프로토콜 제거하고 ipfs.io 사용
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }
  
  // Qm 또는 bafy로 시작하는 해시
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${url}`;
  }
  
  return url;
};

/**
 * 이미지만 Pinata에 업로드 (Dynamic NFT 이미지 변경용)
 * @param {File} imageFile - 이미지 파일
 * @param {string} name - 이미지 이름 (선택사항)
 * @returns {Promise<string>} IPFS URL (ipfs://...)
 */
export const uploadImageToPinata = async (imageFile, name = 'NFT Image') => {
  try {
    const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;
    
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT 토큰이 설정되지 않았습니다. .env 파일을 확인하세요.');
    }

    console.log('🖼️  이미지만 업로드 중...', name);

    const imageFormData = new FormData();
    imageFormData.append('file', imageFile);
    
    const pinataMetadata = JSON.stringify({
      name: name
    });
    imageFormData.append('pinataMetadata', pinataMetadata);

    const imageUploadResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      imageFormData,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'multipart/form-data'
        },
        maxBodyLength: Infinity
      }
    );

    const imageIpfsHash = imageUploadResponse.data.IpfsHash;
    const imageIpfsUrl = `ipfs://${imageIpfsHash}`;
    
    console.log('✅ 이미지 업로드 완료:', imageIpfsUrl);
    return imageIpfsUrl;

  } catch (error) {
    console.error('❌ 이미지 업로드 실패:', error);
    
    if (error.response) {
      throw new Error(`Pinata 업로드 실패: ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Pinata 서버에 연결할 수 없습니다. 네트워크를 확인하세요.');
    } else {
      throw new Error(error.message || '이미지 업로드에 실패했습니다.');
    }
  }
};

/**
 * 메타데이터만 Pinata에 업로드 (Dynamic NFT용)
 * @param {object} metadata - 메타데이터 객체
 * @param {string} name - 메타데이터 이름 (선택사항)
 * @returns {Promise<object>} { ipfsUrl, hash }
 */
export const uploadMetadataToPinata = async (metadata, name = 'NFT Metadata') => {
  try {
    const PINATA_JWT = process.env.REACT_APP_PINATA_JWT;
    
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT 토큰이 설정되지 않았습니다.');
    }

    console.log('📝 메타데이터만 업로드 중...', metadata);

    const metadataUploadResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json'
        },
        pinataMetadata: {
          name: name
        }
      }
    );

    const metadataIpfsHash = metadataUploadResponse.data.IpfsHash;
    const metadataIpfsUrl = `ipfs://${metadataIpfsHash}`;
    
    console.log('✅ 메타데이터 업로드 완료:', metadataIpfsUrl);
    
    return {
      ipfsUrl: metadataIpfsUrl,
      hash: metadataIpfsHash
    };

  } catch (error) {
    console.error('❌ 메타데이터 업로드 실패:', error);
    
    if (error.response) {
      throw new Error(`Pinata 업로드 실패: ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Pinata 서버에 연결할 수 없습니다.');
    } else {
      throw new Error(error.message || '메타데이터 업로드에 실패했습니다.');
    }
  }
};

/**
 * 로컬 메타데이터 업데이트 (Dynamic NFT용)
 * @param {string} oldHash - 기존 메타데이터 해시
 * @param {object} newMetadata - 새 메타데이터
 * @param {string} newHash - 새 메타데이터 해시
 * @returns {Promise<boolean>} 성공 여부
 */
export const updateLocalMetadata = async (oldHash, newMetadata, newHash) => {
  try {
    console.log('📝 로컬 메타데이터 업데이트:', { oldHash, newHash });
    
    const response = await axios.put(
      `${API_BASE_URL}/api/nft/nft-metadata/${oldHash}`,
      {
        newMetadata,
        newHash
      },
      { timeout: 5000 }
    );
    
    if (response.data.success) {
      console.log('✅ 로컬 메타데이터 업데이트 완료');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ 로컬 메타데이터 업데이트 실패:', error);
    return false;
  }
};

/**
 * 로컬에 저장된 NFT 파일 목록 가져오기
 */
export const getLocalNFTFiles = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/nft/nft-files`);
    return response.data.files;
  } catch (error) {
    console.error('로컬 NFT 파일 목록 조회 실패:', error);
    return [];
  }
};