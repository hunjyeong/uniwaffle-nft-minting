// utils/solanaContract.js
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createCreateMetadataAccountV3Instruction, PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from '@solana/spl-token';
  
// Solana RPC 엔드포인트
const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';
  
/**
 * Solana NFT 민팅 함수
 * @param {Object} provider - Phantom 지갑 provider (window.solana)
 * @param {string} recipientAddress - NFT를 받을 Solana 주소
 * @param {string} name - NFT 이름
 * @param {string} description - NFT 설명
 * @param {string} imageUri - IPFS 이미지 URI
 */
export const mintSolanaNFT = async (
    provider,
    recipientAddress,
    name,
    description,
    imageUri
) => {
    try {
        if (!provider || !provider.isPhantom) {
            throw new Error('Phantom 지갑이 연결되지 않았습니다.');
        }
    
        // Connection 생성
        const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
        
        // 지갑 공개키
        const walletPublicKey = provider.publicKey;
        const recipientPublicKey = recipientAddress 
            ? new PublicKey(recipientAddress)
            : walletPublicKey;
    
        console.log('Minting NFT on Solana...');
        console.log('Wallet:', walletPublicKey.toString());
        console.log('Recipient:', recipientPublicKey.toString());
    
        // 1. NFT Mint 생성 (SPL Token)
        const mint = await createMint(
            connection,
            {
            publicKey: walletPublicKey,
            signTransaction: provider.signTransaction.bind(provider),
            signAllTransactions: provider.signAllTransactions.bind(provider)
            },
            walletPublicKey, // mint authority
            null, // freeze authority (null = no freeze)
            0 // decimals (0 for NFT)
        );
    
        console.log('NFT Mint created:', mint.toString());
    
        // 2. 받는 사람의 토큰 계정 생성 또는 가져오기
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            {
            publicKey: walletPublicKey,
            signTransaction: provider.signTransaction.bind(provider),
            signAllTransactions: provider.signAllTransactions.bind(provider)
            },
            mint,
            recipientPublicKey
        );
  
        console.log('Token account:', tokenAccount.address.toString());
    
        // 3. NFT 민팅 (1개만)
        const mintSignature = await mintTo(
            connection,
            {
            publicKey: walletPublicKey,
            signTransaction: provider.signTransaction.bind(provider),
            signAllTransactions: provider.signAllTransactions.bind(provider)
            },
            mint,
            tokenAccount.address,
            walletPublicKey,
            1 // NFT는 1개만 발행
        );
    
        console.log('NFT minted, signature:', mintSignature);
    
        // 4. 메타데이터 계정 생성
        const metadataAddress = await PublicKey.findProgramAddress(
            [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer()
            ],
            TOKEN_METADATA_PROGRAM_ID
        );
    
        // 메타데이터 생성 인스트럭션
        const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
            {
            metadata: metadataAddress[0],
            mint: mint,
            mintAuthority: walletPublicKey,
            payer: walletPublicKey,
            updateAuthority: walletPublicKey
            },
            {
            createMetadataAccountArgsV3: {
                data: {
                name: name,
                symbol: 'NFT',
                uri: imageUri,
                sellerFeeBasisPoints: 0,
                creators: [
                    {
                    address: walletPublicKey,
                    verified: true,
                    share: 100
                    }
                ],
                collection: null,
                uses: null
                },
                isMutable: true,
                collectionDetails: null
            }
            }
        );
  
        // 트랜잭션 생성 및 전송
        const transaction = new Transaction().add(createMetadataInstruction);
        transaction.feePayer = walletPublicKey;
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;
    
        const signedTransaction = await provider.signTransaction(transaction);
        const metadataSignature = await connection.sendRawTransaction(
            signedTransaction.serialize()
        );
    
        await connection.confirmTransaction(metadataSignature);
    
        console.log('Metadata created, signature:', metadataSignature);
    
        return {
            success: true,
            txHash: metadataSignature,
            mintAddress: mint.toString(),
            tokenAccount: tokenAccount.address.toString(),
            metadataAddress: metadataAddress[0].toString()
        };
  
    } catch (error) {
        console.error('Solana NFT 민팅 실패:', error);
        throw error;
    }
};
  
/**
 * Solana NFT 조회
 * @param {Object} provider - Phantom 지갑 provider
 * @param {string} ownerAddress - 소유자 주소
 */
export const getSolanaNFTs = async (provider, ownerAddress) => {
    try {
        const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
        const ownerPublicKey = new PublicKey(ownerAddress);
    
        // 소유자의 모든 토큰 계정 가져오기
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            ownerPublicKey,
            {
            programId: TOKEN_PROGRAM_ID
            }
        );
    
        const nfts = [];
    
        for (const { account } of tokenAccounts.value) {
            const parsedInfo = account.data.parsed.info;
            
            // NFT는 amount가 1이고 decimals가 0
            if (parsedInfo.tokenAmount.decimals === 0 && 
                parsedInfo.tokenAmount.amount === '1') {
            
                const mintAddress = new PublicKey(parsedInfo.mint);
                
                // 메타데이터 주소 찾기
                const [metadataAddress] = await PublicKey.findProgramAddress(
                    [
                    Buffer.from('metadata'),
                    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                    mintAddress.toBuffer()
                    ],
                    TOKEN_METADATA_PROGRAM_ID
                );
        
                try {
                    const metadataAccount = await connection.getAccountInfo(metadataAddress);
                    
                    if (metadataAccount) {
                    // 메타데이터 파싱 (간단한 버전)
                    // 실제로는 @metaplex-foundation/mpl-token-metadata의 Metadata.deserialize 사용
                    nfts.push({
                        mint: mintAddress.toString(),
                        metadataAddress: metadataAddress.toString(),
                        tokenAccount: account.pubkey.toString()
                    });
                    }
                } catch (err) {
                    console.error('메타데이터 로드 실패:', err);
                }
            }
        }
  
        return nfts;
  
    } catch (error) {
        console.error('Solana NFT 조회 실패:', error);
        throw error;
    }
};