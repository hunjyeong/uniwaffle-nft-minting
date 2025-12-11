// frontend/src/utils/solana/mintNFT.js
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { uploadNFT as uploadToPinata } from '../ipfs';

/**
 * Solana NFT 민팅 (Umi 사용)
 * @param {Object} wallet - Phantom 지갑
 * @param {Object} nftData - NFT 메타데이터 { name, symbol, description }
 * @param {File} imageFile - 이미지 파일
 * @returns {Object} 민팅된 NFT 정보
 */
export const mintNFT = async (wallet, nftData, imageFile) => {
  try {
    console.log('🚀 Solana NFT 민팅 시작 (Umi)');

    // 1. 기존 백엔드로 Pinata 업로드
    console.log('📤 Pinata에 업로드 중...');
    const uploadResult = await uploadToPinata(
      imageFile,
      nftData.name,
      nftData.description || ''
    );
    
    const metadataUri = uploadResult.tokenURI;
    console.log('✅ Pinata 업로드 완료:', metadataUri);

    // 2. Umi 인스턴스 생성
    const umi = createUmi(clusterApiUrl('devnet'))
      .use(walletAdapterIdentity(wallet));

    // 3. NFT Mint 주소 생성
    const mint = generateSigner(umi);
    
    console.log('⚡ NFT 민팅 중...');

    // 4. NFT 생성
    await createNft(umi, {
      mint,
      name: nftData.name,
      symbol: nftData.symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5), // 5% 로열티
    }).sendAndConfirm(umi);

    console.log('✅ NFT 민팅 완료!');
    console.log('  - Mint Address:', mint.publicKey);

    return {
      success: true,
      mintAddress: mint.publicKey,
      name: nftData.name,
      symbol: nftData.symbol,
      uri: metadataUri,
      imageUrl: uploadResult.ipfs.imageUrl,
      explorerUrl: `https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`,
    };
    
  } catch (error) {
    console.error('❌ NFT 민팅 실패:', error);
    
    if (error.message?.includes('User rejected')) {
      throw new Error('사용자가 트랜잭션을 거부했습니다.');
    }
    
    if (error.message?.includes('insufficient')) {
      throw new Error('SOL 잔액이 부족합니다. https://solfaucet.com 에서 테스트 SOL을 받으세요.');
    }
    
    throw new Error(`민팅 실패: ${error.message}`);
  }
};

/**
 * 사용자의 NFT 목록 가져오기
 * @param {Object} wallet - Phantom 지갑
 * @returns {Array} NFT 목록
 */
export const getUserNFTs = async (wallet) => {
  try {
    console.log('🔍 Solana NFT 조회 중...');
    
    if (!wallet?.publicKey) {
      throw new Error('지갑이 연결되지 않았습니다.');
    }

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPublicKey = new PublicKey(wallet.publicKey.toString());

    console.log('👛 조회 중인 지갑:', wallet.publicKey.toString());

    // 1. 지갑의 모든 토큰 계정 가져오기
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    console.log(`📦 ${tokenAccounts.value.length}개의 토큰 계정 발견`);

    // 2. NFT 필터링 (amount가 1이고 decimals가 0인 토큰)
    const nftAccounts = tokenAccounts.value.filter(account => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
      const decimals = account.account.data.parsed.info.tokenAmount.decimals;
      return amount === 1 && decimals === 0;
    });

    console.log(`🎨 ${nftAccounts.length}개의 NFT 발견`);

    if (nftAccounts.length === 0) {
      return [];
    }

    // 3. 각 NFT의 메타데이터 가져오기
    const nftsWithMetadata = await Promise.all(
      nftAccounts.map(async (account) => {
        try {
          const mintAddress = account.account.data.parsed.info.mint;
          
          // Metaplex 메타데이터 계정 주소 유도
          const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
          const [metadataPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from('metadata'),
              METADATA_PROGRAM_ID.toBuffer(),
              new PublicKey(mintAddress).toBuffer(),
            ],
            METADATA_PROGRAM_ID
          );

          // 메타데이터 계정 가져오기
          const metadataAccount = await connection.getAccountInfo(metadataPDA);
          
          if (!metadataAccount) {
            console.warn(`메타데이터를 찾을 수 없음: ${mintAddress}`);
            return null;
          }

          // 메타데이터 파싱 (간단한 버전)
          const metadata = parseMetadata(metadataAccount.data);
          
          // URI에서 JSON 메타데이터 가져오기
          let jsonMetadata = {
            description: '',
            image: '',
          };

          if (metadata.uri) {
            try {
              const response = await fetch(metadata.uri.trim());
              if (response.ok) {
                jsonMetadata = await response.json();
              }
            } catch (fetchError) {
              console.warn('JSON 메타데이터 fetch 실패:', fetchError);
            }
          }

          return {
            mintAddress: mintAddress,
            name: metadata.name || 'Unnamed NFT',
            symbol: metadata.symbol || '',
            description: jsonMetadata.description || '',
            uri: metadata.uri || '',
            image: jsonMetadata.image || '',
            explorerUrl: `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`,
          };
        } catch (error) {
          console.error('NFT 처리 중 오류:', error);
          return null;
        }
      })
    );

    // null 제거
    const validNFTs = nftsWithMetadata.filter(nft => nft !== null);
    
    console.log(`✅ ${validNFTs.length}개의 NFT 메타데이터 로드 완료`);
    
    return validNFTs;
    
  } catch (error) {
    console.error('❌ NFT 조회 실패:', error);
    throw new Error(`NFT 조회 실패: ${error.message}`);
  }
};

/**
 * 메타데이터 파싱 헬퍼 함수
 */
const parseMetadata = (data) => {
  try {
    // Metaplex 메타데이터 구조 파싱
    let offset = 1; // key (1 byte)
    offset += 32; // update authority (32 bytes)
    offset += 32; // mint (32 bytes)
    
    // name 읽기
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;
    
    // symbol 읽기
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;
    
    // uri 읽기
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');
    
    return { name, symbol, uri };
  } catch (error) {
    console.error('메타데이터 파싱 오류:', error);
    return { name: '', symbol: '', uri: '' };
  }
};

/**
 * NFT 전송
 * @param {Object} wallet - Phantom 지갑
 * @param {string} mintAddress - NFT 민트 주소
 * @param {string} recipientAddress - 수신자 주소
 */
export const transferNFT = async (wallet, mintAddress, recipientAddress) => {
  try {
    console.log('📤 NFT 전송 시작');
    console.log('  - Mint:', mintAddress);
    console.log('  - To:', recipientAddress);

    // SPL Token 프로그램을 사용한 NFT 전송
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    
    // TODO: SPL Token transfer 구현
    console.log('⚠️  NFT 전송 기능은 구현 예정입니다.');

    return {
      success: true,
      transactionUrl: `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`,
    };
    
  } catch (error) {
    console.error('❌ NFT 전송 실패:', error);
    throw new Error(`전송 실패: ${error.message}`);
  }
};