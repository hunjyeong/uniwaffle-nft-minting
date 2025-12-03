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
export const transferNFT = async (provider, nftType, fromAddress, toAddress, tokenId) => {
  try {
    if (nftType === 'soulbound') {
      throw new Error('Soulbound Token은 전송할 수 없습니다.');
    }

    const contract = await getContract(provider, nftType);
    
    console.log('전송 시작:', { from: fromAddress, to: toAddress, tokenId });
    const tx = await contract.transferFrom(fromAddress, toAddress, tokenId);
    
    console.log('트랜잭션 대기 중...', tx.hash);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('전송 실패:', error);
    throw error;
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
  try {
    console.log('🔥 NFT 소각 시작:', { nftType, tokenId });

    const contract = await getContract(provider, nftType);

    // burn 함수 호출
    const tx = await contract.burn(tokenId);
    console.log('📤 소각 트랜잭션 전송됨:', tx.hash);

    const receipt = await tx.wait();
    console.log('✅ NFT 소각 완료!');

    return {
      success: true,
      txHash: receipt.hash,
      tokenId,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('❌ NFT 소각 실패:', error);
    
    // 에러 메시지 파싱
    let errorMessage = 'NFT 소각에 실패했습니다.';
    if (error.message.includes('caller is not owner') || error.message.includes('not owner')) {
      errorMessage = '토큰 소유자만 소각할 수 있습니다.';
    } else if (error.message.includes('nonexistent token')) {
      errorMessage = '존재하지 않는 토큰입니다.';
    } else if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      errorMessage = '트랜잭션이 거부되었습니다.';
    }
    
    throw new Error(errorMessage);
  }
};