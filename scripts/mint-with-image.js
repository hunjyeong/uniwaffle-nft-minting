import hre from "hardhat";
const { ethers } = hre; 
import { uploadFile, uploadMetadata, createNFTMetadata } from './upload-to-ipfs-pinata.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

// ES Module에서 __dirname 사용하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🚀 Starting NFT minting process with image...\n');
    
    // ========================================
    // 1️⃣ 설정 확인
    // ========================================
    const contractAddress = process.env.SOULBOUND_ADDRESS;
    const recipientAddress = process.env.RECIPIENT_ADDRESS;
    
    if (!contractAddress) {
        throw new Error('❌ SOULBOUND_ADDRESS not found in .env');
    }
    if (!recipientAddress) {
        throw new Error('❌ RECIPIENT_ADDRESS not found in .env');
    }
    
    console.log('📋 Configuration:');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Recipient: ${recipientAddress}\n`);
    
    // ========================================
    // 2️⃣ 이미지 파일 경로 설정
    // ========================================
    const imagePath = path.join(__dirname, '../assets/osdc_nft.png');
    // const imagePath = path.join(__dirname, '../assets/degree.png');
    
    // 예시 1: 다른 이미지 사용
    // const imagePath = path.join(__dirname, '../assets/certificate.png');

    // 예시 2: 절대 경로 사용
    // const imagePath = '/Users/heoyunjeong/Downloads/my-image.png';
    
    console.log('📁 Image path:', imagePath);
    console.log('');
    
    // ========================================
    // 3️⃣ 이미지를 IPFS에 업로드
    // ========================================
    console.log('🚀 Step 1/4: Uploading image to IPFS...');
    const imageResult = await uploadFile(imagePath);
    console.log('');
    
    // ========================================
    // 4️⃣ NFT 메타데이터 생성
    // ========================================
    console.log('🚀 Step 2/4: Creating NFT metadata...');
    const metadata = await createNFTMetadata(
        "OSDC NFT",           // NFT 이름
        "무슨 이미지일까요",   // 설명
        imageResult.url,                          // IPFS 이미지 URL
        [                                         // 속성 (OpenSea에 표시됨)
            { trait_type: "University", value: "Hanyang University" },
            { trait_type: "Year", value: "2025" },
            { trait_type: "Major", value: "Computer Science" }
        ]
    );
    
    console.log('✅ Metadata created:');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('');
    
    // ========================================
    // 5️⃣ 메타데이터를 IPFS에 업로드
    // ========================================
    console.log('🚀 Step 3/4: Uploading metadata to IPFS...');
    const metadataResult = await uploadMetadata(metadata);
    console.log('');
    
    // ========================================
    // 6️⃣ NFT 민팅
    // ========================================
    console.log('🚀 Step 4/4: Minting SBT NFT...');
    
    const SoulboundToken = await ethers.getContractFactory("SoulboundToken");
    const sbt = SoulboundToken.attach(contractAddress);
    
    console.log('📤 Sending mint transaction...');
    const tx = await sbt.mintWithURI(recipientAddress, metadataResult.url);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    // 민팅된 토큰 ID 추출
    const tokenId = receipt.logs[0].topics[3]; // SoulboundMinted 이벤트에서 추출
    const tokenIdDecimal = parseInt(tokenId, 16);
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('✅ NFT Minted Successfully!');
    console.log('🎉 ========================================');
    console.log('');
    console.log('📋 NFT Details:');
    console.log(`   Token ID: ${tokenIdDecimal}`);
    console.log(`   Owner: ${recipientAddress}`);
    console.log(`   Image IPFS: ${imageResult.url}`);
    console.log(`   Metadata IPFS: ${metadataResult.url}`);
    console.log('');
    console.log('🔗 Transaction:');
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log('');
    console.log('🖼️  View on OpenSea (Testnet):');
    console.log(`   https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenIdDecimal}`);
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('');
        console.error('❌ ========================================');
        console.error('❌ Error occurred!');
        console.error('❌ ========================================');
        console.error(error);
        console.error('');
        process.exit(1);
    });