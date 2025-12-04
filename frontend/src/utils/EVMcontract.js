import { ethers } from 'ethers';
import {
  NATIVENFT_ABI,
  SOULBOUND_ABI,
  FRACTIONAL_ABI
} from '../config/contracts.js';

// 컨트랙트 주소 (체인별로 환경 변수에서 로드)
const CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  '0xaa36a7': {
    native: process.env.REACT_APP_SEPOLIA_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_SEPOLIA_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_SEPOLIA_FRACTIONAL_ADDRESS || ''
  },
  // Ethereum Mainnet
  '0x1': {
    native: process.env.REACT_APP_MAINNET_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_MAINNET_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_MAINNET_FRACTIONAL_ADDRESS || ''
  },
  // Polygon
  '0x89': {
    native: process.env.REACT_APP_POLYGON_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_POLYGON_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_POLYGON_FRACTIONAL_ADDRESS || ''
  },
  // Arbitrum
  '0xa4b1': {
    native: process.env.REACT_APP_ARBITRUM_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_ARBITRUM_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_ARBITRUM_FRACTIONAL_ADDRESS || ''
  },
  // Optimism
  '0xa': {
    native: process.env.REACT_APP_OPTIMISM_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_OPTIMISM_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_OPTIMISM_FRACTIONAL_ADDRESS || ''
  },
  // Base
  '0x2105': {
    native: process.env.REACT_APP_BASE_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_BASE_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_BASE_FRACTIONAL_ADDRESS || ''
  },
  // Base
  '0x14a34': {
    native: process.env.REACT_APP_BASE_SEPOLIA_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_BASE_SEPOLIA_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_BASE_SEPOLIA_FRACTIONAL_ADDRESS || ''
  }
};

// ABI 매핑
const getABI = (nftType) => {
  switch(nftType) {
    case 'native':
      return NATIVENFT_ABI;
    case 'soulbound':
      return SOULBOUND_ABI;
    case 'fractional':
      return FRACTIONAL_ABI;
    default:
      throw new Error('Invalid NFT type');
  }
};

/**
 * 컨트랙트 인스턴스 가져오기
 */
export const getContract = async (provider, nftType) => {
  try {
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);

    const contractAddress = CONTRACT_ADDRESSES[chainId]?.[nftType];
    
    if (!contractAddress || contractAddress === '') {
      throw new Error(`${chainId} 체인에서 ${nftType} 컨트랙트를 찾을 수 없습니다. 컨트랙트를 먼저 배포해주세요.`);
    }

    const abi = getABI(nftType);
    return new ethers.Contract(contractAddress, abi, signer);
  } catch (error) {
    console.error('컨트랙트 로드 실패:', error);
    throw error;
  }
};

/**
 * EVM 체인에서 NFT 민팅
 */
export const mintEvmNFT = async (provider, nftType, recipientAddress, tokenURI) => {
  try {
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);

    const contractAddress = CONTRACT_ADDRESSES[chainId]?.[nftType];
    
    if (!contractAddress || contractAddress === '') {
      throw new Error(`${chainId} 체인에서 ${nftType} 컨트랙트를 찾을 수 없습니다.`);
    }

    const abi = getABI(nftType);
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    console.log('민팅 시작:', {
      nftType,
      recipient: recipientAddress,
      tokenURI,
      contractAddress
    });
    
    console.log('mintWithURI 호출 중...');
    
    // 🔥 데이터 인코딩하고 0x 강제로 붙이기
    let data = contract.interface.encodeFunctionData('mintWithURI', [
      recipientAddress,
      tokenURI
    ]);
    
    // 0x 접두사가 없으면 추가
    if (!data.startsWith('0x')) {
      data = '0x' + data;
      console.log('0x 접두사 추가됨');
    }
    
    console.log('인코딩된 데이터:', data.slice(0, 20) + '...');
    
    // 수동으로 트랜잭션 전송
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: data
    });
    
    console.log('트랜잭션 전송됨:', tx.hash);
    console.log('확인 대기 중...');
    
    const receipt = await tx.wait();
    console.log('트랜잭션 완료:', receipt);
    
    // tokenId 추출
    let tokenId = null;
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (parsedLog && parsedLog.name === 'NFTMinted') {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch (e) {
        // 무시
      }
    }
    
    if (!tokenId && receipt.logs.length > 0) {
      try {
        const transferLog = receipt.logs.find(log => log.topics.length >= 4);
        if (transferLog) {
          tokenId = ethers.getBigInt(transferLog.topics[3]).toString();
        }
      } catch (e) {
        console.warn('tokenId 추출 실패');
      }
    }
    
    return {
      success: true,
      txHash: receipt.hash,
      tokenId: tokenId || 'Unknown',
      blockNumber: receipt.blockNumber
    };

  } catch (error) {
    console.error('EVM NFT 민팅 실패:', error);
    
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('트랜잭션이 거부되었습니다.');
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
      throw new Error('가스비가 부족합니다.');
    }
    
    if (error.message?.includes('Ownable') || error.message?.includes('owner')) {
      throw new Error('민팅 권한이 없습니다. 컨트랙트 소유자만 민팅할 수 있습니다.');
    }
    
    throw new Error(error.reason || error.message || '민팅에 실패했습니다.');
  }
};

/**
 * NFT 전송 (SBT는 불가)
 */
export const transferNFT = async (provider, nftType, from, to, tokenId) => {
  console.log('📦 NFT 전송 시작:', { nftType, from, to, tokenId });
  
  try {
    if (!provider) {
      throw new Error('Provider가 초기화되지 않았습니다.');
    }

    // 자기 자신에게 전송 방지
    if (from.toLowerCase() === to.toLowerCase()) {
      throw new Error('자기 자신에게는 전송할 수 없습니다.');
    }

    const contract = await getContract(provider, nftType);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    // console.log('=== 디버깅 정보 ===');
    // console.log('👤 현재 연결된 주소:', userAddress);
    // console.log('📄 컨트랙트 주소:', contract.target || contract.address);
    // console.log('📤 From:', from);
    // console.log('📥 To:', to);
    // console.log('🔢 Token ID:', tokenId);
    
    // 소유권 확인 (선택적)
    try {
      const owner = await contract.ownerOf(tokenId);
      console.log('🏷️ Token #' + tokenId + ' 소유자:', owner);
      console.log('✅ 소유자 일치 여부:', owner.toLowerCase() === userAddress.toLowerCase());
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`이 NFT의 소유자가 아닙니다.\n소유자: ${owner}\n현재 주소: ${userAddress}`);
      }
    } catch (error) {
      if (error.message.includes('소유자가 아닙니다')) {
        throw error;
      }
      console.warn('⚠️ ownerOf 호출 실패 (계속 진행):', error.message);
    }
    
    // 가스 추정
    try {
      console.log('⛽ 가스 추정 시도...');
      const gasEstimate = await contract.transferFrom.estimateGas(from, to, tokenId);
      console.log('⛽ 예상 가스:', gasEstimate.toString());
    } catch (gasError) {
      console.error('❌ 가스 추정 실패:', gasError);
      throw new Error('전송 권한이 없거나 NFT가 존재하지 않습니다.');
    }
    
    // 전송 트랜잭션 전송
    console.log('📤 전송 트랜잭션 전송 중...');
    const tx = await contract.transferFrom(from, to, tokenId);
    console.log('📝 트랜잭션 해시:', tx.hash);
    
    // 트랜잭션 확인 대기
    console.log('⏳ 트랜잭션 확인 대기 중...');
    try {
      const receipt = await tx.wait();
      console.log('✅ 전송 완료! Receipt:', receipt);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt: receipt
      };
    } catch (waitError) {
      console.warn('⚠️ Receipt 대기 중 에러 (트랜잭션은 전송됨):', waitError);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt: null
      };
    }
    
  } catch (error) {
    console.error('❌ NFT 전송 실패:', error);
    
    // 사용자 친화적 에러 메시지
    if (error.message.includes('자기 자신에게는 전송할 수 없습니다')) {
      throw error;
    } else if (error.message.includes('소유자가 아닙니다')) {
      throw error;
    } else if (error.message.includes('전송 권한이 없거나')) {
      throw error;
    } else if (error.code === 'ACTION_REJECTED') {
      throw new Error('사용자가 트랜잭션을 거부했습니다.');
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('가스비가 부족합니다.');
    } else if (error.code === 'CALL_EXCEPTION') {
      throw new Error('컨트랙트 실행 실패: NFT가 존재하지 않거나 권한이 없습니다.');
    } else if (error.reason) {
      throw new Error(`전송 실패: ${error.reason}`);
    }
    
    throw new Error('NFT 전송에 실패했습니다.');
  }
};
/**
 * NFT 소유자 확인
 */
export const getTokenOwner = async (provider, nftType, tokenId) => {
  try {
    const contract = await getContract(provider, nftType);
    return await contract.ownerOf(tokenId);
  } catch (error) {
    console.error('소유자 조회 실패:', error);
    throw error;
  }
};

/**
 * NFT 메타데이터 URI 가져오기
 */
export const getTokenURI = async (provider, nftType, tokenId) => {
  try {
    const contract = await getContract(provider, nftType);
    return await contract.tokenURI(tokenId);
  } catch (error) {
    console.error('Token URI 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자가 소유한 NFT 목록 가져오기
 */
export const getEvmNFTs = async (provider, ownerAddress, nftType) => {
  try {
    const contract = await getContract(provider, nftType);
    
    // tokensOfOwner 함수로 소유한 토큰 ID 목록 가져오기
    const tokens = await contract.tokensOfOwner(ownerAddress);
    const tokenIds = tokens.map(token => token.toString());
    
    const nfts = [];
    
    for (let tokenId of tokenIds) {
      try {
        const tokenURI = await contract.tokenURI(tokenId);
        
        nfts.push({
          tokenId: tokenId,
          tokenURI: tokenURI,
          type: nftType
        });
      } catch (err) {
        console.error(`Token ${tokenId} 메타데이터 로드 실패:`, err);
      }
    }
    
    return nfts;
    
  } catch (error) {
    console.error('EVM NFT 조회 실패:', error);
    throw error;
  }
};

/**
 * 특정 체인의 컨트랙트 주소 설정
 */
export const setContractAddress = (chainId, nftType, address) => {
  if (!CONTRACT_ADDRESSES[chainId]) {
    CONTRACT_ADDRESSES[chainId] = {};
  }
  CONTRACT_ADDRESSES[chainId][nftType] = address;
};

/**
 * 현재 설정된 컨트랙트 주소 가져오기
 */
export const getContractAddress = (chainId, nftType) => {
  return CONTRACT_ADDRESSES[chainId]?.[nftType];
};

/**
 * NFT 소각
 * @param {Object} provider - Ethers provider
 * @param {string} nftType - 'native', 'soulbound', 'fractional'
 * @param {string} tokenId - 토큰 ID
 * @returns {Object} 트랜잭션 결과
 */
export const burnNFT = async (provider, nftType, tokenId) => {
  console.log('🔥 NFT 소각 시작:', { nftType, tokenId });
  
  try {
    if (!provider) {
      throw new Error('Provider가 초기화되지 않았습니다.');
    }

    const contract = await getContract(provider, nftType);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    // console.log('=== 디버깅 정보 ===');
    // console.log('👤 현재 연결된 주소:', userAddress);
    // console.log('📄 컨트랙트 주소:', contract.target || contract.address);
    // console.log('🔢 Token ID:', tokenId);
    
    // 소유권 확인
    try {
      const owner = await contract.ownerOf(tokenId);
      console.log('🏷️ Token #' + tokenId + ' 소유자:', owner);
      console.log('✅ 소유자 일치 여부:', owner.toLowerCase() === userAddress.toLowerCase());
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`이 NFT의 소유자가 아닙니다.\n소유자: ${owner}\n현재 주소: ${userAddress}`);
      }
    } catch (error) {
      if (error.message.includes('소유자가 아닙니다')) {
        throw error;
      }
      console.error('ownerOf 호출 실패:', error);
      throw new Error('NFT가 존재하지 않거나 소유권을 확인할 수 없습니다.');
    }
    
    // burn 함수 확인
    console.log('🔍 burn 함수 존재:', typeof contract.burn === 'function');
    
    if (!contract.burn) {
      throw new Error('이 컨트랙트는 burn 기능을 지원하지 않습니다.');
    }
    
    // 가스 추정
    try {
      console.log('⛽ 가스 추정 시도...');
      const gasEstimate = await contract.burn.estimateGas(tokenId);
      console.log('⛽ 예상 가스:', gasEstimate.toString());
    } catch (gasError) {
      console.error('❌ 가스 추정 실패:', gasError);
      throw new Error('트랜잭션이 실패할 것으로 예상됩니다. 컨트랙트 권한을 확인해주세요.');
    }
    
    // 소각 트랜잭션 전송
    console.log('📤 소각 트랜잭션 전송 중...');
    const tx = await contract.burn(tokenId);
    console.log('📝 트랜잭션 해시:', tx.hash);
    
    // 트랜잭션 확인 대기 (에러 처리 강화)
    console.log('⏳ 트랜잭션 확인 대기 중...');
    try {
      const receipt = await tx.wait();
      console.log('✅ 소각 완료! Receipt:', receipt);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt: receipt
      };
    } catch (waitError) {
      // wait() 실패해도 트랜잭션은 이미 전송됨
      console.warn('⚠️ Receipt 대기 중 에러 발생 (트랜잭션은 전송되었습니다):', waitError);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt: null
      };
    }
    
  } catch (error) {
    console.error('❌ NFT 소각 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data
    });
    
    // 사용자 친화적 에러 메시지
    if (error.message.includes('소유자가 아닙니다')) {
      throw error;
    } else if (error.message.includes('존재하지 않거나')) {
      throw error;
    } else if (error.message.includes('burn 기능을 지원하지 않습니다')) {
      throw error;
    } else if (error.message.includes('실패할 것으로 예상')) {
      throw error;
    } else if (error.code === 'ACTION_REJECTED') {
      throw new Error('사용자가 트랜잭션을 거부했습니다.');
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('가스비가 부족합니다.');
    } else if (error.code === 'CALL_EXCEPTION') {
      throw new Error('컨트랙트 실행 실패: 권한이 없거나 함수 호출이 거부되었습니다.');
    } else if (error.reason) {
      throw new Error(`소각 실패: ${error.reason}`);
    }
    
    throw new Error('NFT 소각에 실패했습니다.');
  }
};