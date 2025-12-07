import { ethers } from 'ethers';
import {
  NATIVENFT_ABI,
  SOULBOUND_ABI,
  FRACTIONAL_ABI,
  DYNAMIC_ABI,
  COMPOSABLE_ABI
} from '../config/contracts.js';

// 컨트랙트 주소 (체인별로 환경 변수에서 로드)
const CONTRACT_ADDRESSES = {
  // Ethereum Sepolia
  '0xaa36a7': {
    native: process.env.REACT_APP_SEPOLIA_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_SEPOLIA_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_SEPOLIA_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_SEPOLIA_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_SEPOLIA_COMPOSABLE_ADDRESS || ''
  },
  // Ethereum Mainnet
  '0x1': {
    native: process.env.REACT_APP_MAINNET_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_MAINNET_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_MAINNET_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_MAINNET_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_MAINNET_COMPOSABLE_ADDRESS || ''
  },
  // Polygon
  '0x89': {
    native: process.env.REACT_APP_POLYGON_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_POLYGON_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_POLYGON_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_POLYGON_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_POLYGON_COMPOSABLE_ADDRESS || ''
  },
  // Arbitrum
  '0xa4b1': {
    native: process.env.REACT_APP_ARBITRUM_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_ARBITRUM_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_ARBITRUM_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_ARBITRUM_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_ARBITRUM_COMPOSABLE_ADDRESS || ''
  },
  // Optimism
  '0xa': {
    native: process.env.REACT_APP_OPTIMISM_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_OPTIMISM_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_OPTIMISM_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_OPTIMISM_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_OPTIMISM_COMPOSABLE_ADDRESS || ''
  },
  // Base
  '0x2105': {
    native: process.env.REACT_APP_BASE_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_BASE_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_BASE_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_BASE_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_BASE_COMPOSABLE_ADDRESS || ''
  },
  // Base Sepolia
  '0x14a34': {
    native: process.env.REACT_APP_BASE_SEPOLIA_NATIVE_ADDRESS || '',
    soulbound: process.env.REACT_APP_BASE_SEPOLIA_SOULBOUND_ADDRESS || '',
    fractional: process.env.REACT_APP_BASE_SEPOLIA_FRACTIONAL_ADDRESS || '',
    dynamic: process.env.REACT_APP_BASE_SEPOLIA_DYNAMIC_ADDRESS || '',
    composable: process.env.REACT_APP_BASE_SEPOLIA_COMPOSABLE_ADDRESS || ''
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
    case 'dynamic':
      return DYNAMIC_ABI;
    case 'composable':
      return COMPOSABLE_ABI;
    default:
      throw new Error('Invalid NFT type');
  }
};

/**
 * 컨트랙트 인스턴스 가져오기
 */
export const getContract = async (provider, nftType) => {
  try {
    if (!provider) {
      throw new Error('Provider가 제공되지 않았습니다.');
    }
    
    const signer = await provider.getSigner();
    
    // 네트워크 변경 오류 방지
    let chainId;
    try {
      const network = await provider.getNetwork();
      chainId = '0x' + network.chainId.toString(16);
    } catch (networkError) {
      if (networkError.code === 'NETWORK_ERROR') {
        throw new Error('NETWORK_CHANGING');
      }
      throw networkError;
    }

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
    
    // NFT 타입별로 다른 함수 호출
    let tx;
    
    if (nftType === 'fractional') {
      // FractionalNFT는 mint(address, string) 함수 사용
      console.log('mint 함수 호출 중 (fractional)...');
      tx = await contract.mint(recipientAddress, tokenURI);
    } else if (nftType === 'dynamic') {
      // DynamicNFT는 mint(address, string) 함수 사용
      console.log('mint 함수 호출 중 (dynamic)...');
      const mintPrice = await contract.mintPrice();
      tx = await contract.mint(recipientAddress, tokenURI, { value: mintPrice });
    } else if (nftType === 'composable') {
      // ComposableNFT는 mintParent 또는 mintChild 사용
      console.log('mintParent 함수 호출 중 (composable)...');
      const mintPrice = await contract.mintPrice();
      tx = await contract.mintParent(recipientAddress, "default", { value: mintPrice });
    } else {
      // Native, Soulbound는 mintWithURI 사용
      console.log('mintWithURI 함수 호출 중...');
      tx = await contract.mintWithURI(recipientAddress, tokenURI);
    }
    
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
        
        if (parsedLog && (parsedLog.name === 'NFTMinted' || parsedLog.name === 'SoulboundMinted' || parsedLog.name === 'Transfer')) {
          tokenId = parsedLog.args.tokenId?.toString();
          if (tokenId) break;
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
    
    // 소유권 확인
    try {
      const owner = await contract.ownerOf(tokenId);
      console.log('🏷️ Token #' + tokenId + ' 소유자:', owner);
      
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
    console.log(`🔍 ${nftType} NFT 조회 중...`);
    
    const contract = await getContract(provider, nftType);
    
    let tokenIds = [];
    
    // 방법 1: tokensOfOwner 시도
    try {
      if (contract.tokensOfOwner) {
        const tokens = await contract.tokensOfOwner(ownerAddress);
        tokenIds = tokens.map(token => token.toString());
        console.log(`✅ ${nftType} tokensOfOwner 성공:`, tokenIds.length, '개');
      } else {
        throw new Error('함수 없음');
      }
    } catch (tokensErr) {
      // CALL_EXCEPTION = tokensOfOwner 함수가 없거나 실행 실패
      if (tokensErr.code === 'CALL_EXCEPTION' || tokensErr.message.includes('함수 없음')) {
        console.log(`⚠️ ${nftType}: tokensOfOwner 없음, balanceOf 방식 사용`);
        
        try {
          // 방법 2: balanceOf 확인
          const balance = await contract.balanceOf(ownerAddress);
          const balanceNum = Number(balance);
          
          console.log(`📊 ${nftType} balance:`, balanceNum);
          
          if (balanceNum === 0) {
            console.log(`ℹ️ ${nftType}: 보유 NFT 없음`);
            return [];
          }
          
          // 방법 3: totalSupply 기반 스캔
          let maxScan = 100;
          try {
            const totalSupply = await contract.totalSupply();
            maxScan = Math.min(Number(totalSupply), 100);
            console.log(`📦 ${nftType} totalSupply:`, totalSupply.toString(), '→ 최대', maxScan, '개 스캔');
          } catch {
            console.log(`⚠️ totalSupply 없음, 100개까지만 스캔`);
          }
          
          // 병렬 스캔
          const promises = [];
          for (let i = 0; i < maxScan; i++) {
            promises.push(
              contract.ownerOf(i)
                .then(owner => owner.toLowerCase() === ownerAddress.toLowerCase() ? i.toString() : null)
                .catch(() => null)
            );
          }
          
          const results = await Promise.all(promises);
          tokenIds = results.filter(id => id !== null);
          
          console.log(`✅ ${nftType} 스캔 완료:`, tokenIds.length, '개 발견');
          
        } catch (scanErr) {
          console.error(`❌ ${nftType} 스캔 실패:`, scanErr.message);
          return [];
        }
      } else {
        throw tokensErr;
      }
    }

    // Fractional NFT: 분할된 NFT도 조회 (조각 보유 중인 것)
    if (nftType === 'fractional') {
      console.log('🔍 분할된 Fractional NFT 조회 중...');
      try {
        const totalSupply = await contract.totalSupply();
        const maxScan = Math.min(Number(totalSupply), 100);
        
        for (let i = 0; i < maxScan; i++) {
          try {
            const isFractionalized = await contract.isFractionalized(i);
            if (isFractionalized) {
              const fractionData = await contract.fractionalizedNFTs(i);
              const tokenAddress = fractionData.fractionToken;
              
              // ERC-20 잔액 확인
              const tokenAbi = ['function balanceOf(address) view returns (uint256)'];
              const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
              const balance = await tokenContract.balanceOf(ownerAddress);
              
              if (balance > 0n && !tokenIds.includes(i.toString())) {
                console.log(`✅ 분할된 NFT #${i} 발견 (조각 보유량: ${balance.toString()})`);
                tokenIds.push(i.toString());
              }
            }
          } catch (err) {
            // 개별 토큰 조회 실패는 무시
          }
        }
      } catch (err) {
        console.warn('⚠️ 분할 NFT 조회 실패:', err.message);
      }
    }
    
    if (tokenIds.length === 0) {
      return [];
    }
    
    // 메타데이터 가져오기
    const nfts = [];
    for (let tokenId of tokenIds) {
      try {
        let tokenURI = '';
        try {
          tokenURI = await contract.tokenURI(tokenId);
        } catch {
          console.warn(`Token ${tokenId} URI 없음`);
        }
        
        let metadata = { name: `Token #${tokenId}` };
        
        if (tokenURI) {
          try {
            let url = tokenURI;

            url = url.replace(/ipfs:\/\//g, '');

            const ipfsHashMatch = url.match(/(Qm[a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/);
            if (ipfsHashMatch) {
              url = 'https://gateway.pinata.cloud/ipfs/' + ipfsHashMatch[0];
            } else if (url.startsWith('http://') || url.startsWith('https://')) {
              // 이미 완전한 URL이면 그대로
            } else {
              // 그 외의 경우
              url = 'https://gateway.pinata.cloud/ipfs/' + url;
            }
            
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
              metadata = await response.json();
            }
          } catch {}
        }
        
        nfts.push({
          tokenId,
          tokenURI,
          type: nftType,
          metadata,
          contractAddress: contract.target
        });
      } catch {}
    }
    
    console.log(`✅ ${nftType} NFTs:`, nfts.length, '개');
    return nfts;
    
  } catch (error) {
    // 네트워크 전환 중
    if (error.message === 'NETWORK_CHANGING' || error.code === 'NETWORK_ERROR') {
      console.log(`⏸️ ${nftType}: 네트워크 전환 중, 스킵`);
      return [];
    }
    
    // 컨트랙트 미배포
    if (error.message.includes('찾을 수 없습니다')) {
      console.log(`${nftType} 컨트랙트가 이 체인에 배포되지 않았습니다.`);
      return [];
    }
    
    console.error(`EVM NFT 조회 실패:`, error);
    return [];
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
    
    // 소유권 확인
    try {
      const owner = await contract.ownerOf(tokenId);
      console.log('🏷️ Token #' + tokenId + ' 소유자:', owner);
      
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
    
    // 트랜잭션 확인 대기
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
      console.warn('⚠️ Receipt 대기 중 에러 발생 (트랜잭션은 전송되었습니다):', waitError);
      
      return {
        success: true,
        txHash: tx.hash,
        receipt: null
      };
    }
    
  } catch (error) {
    console.error('❌ NFT 소각 실패:', error);
    
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