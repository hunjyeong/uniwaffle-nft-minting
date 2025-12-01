import hre from "hardhat";
const { ethers } = hre;
import { uploadFile, uploadMetadata, createNFTMetadata } from './upload-to-ipfs-pinata.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log('🚀 Minting Transferable NFT...\n');
    
    const contractAddress = process.env.TRANSFERABLE_NFT_ADDRESS;
    // const recipientAddress = process.env.RECIPIENT_ADDRESS; // ← 수동 설정 대신 서명자 주소 사용

    // 서명자 주소 자동 가져오기
    const [signer] = await ethers.getSigners();
    const recipientAddress = await signer.getAddress();
    
    console.log(`👤 Minting to Signer: ${recipientAddress}\n`);
    
    if (!contractAddress) {
        throw new Error('❌ TRANSFERABLE_NFT_ADDRESS not found in .env');
    }
    
    // 이미지 업로드
    const imagePath = path.join(__dirname, '../assets/osdc_nft.png');
    console.log('📤 Uploading image...');
    const imageResult = await uploadFile(imagePath);
    
    // 메타데이터 생성
    const metadata = await createNFTMetadata(
        "Transferable OSDC NFT",
        "This NFT can be transferred and sold",
        imageResult.url,
        [
            { trait_type: "Type", value: "Transferable" },
            { trait_type: "Rarity", value: "Common" },
            { trait_type: "Edition", value: "1" }
        ]
    );
    
    console.log('📤 Uploading metadata...');
    const metadataResult = await uploadMetadata(metadata);
    
    // NFT 민팅
    const TransferableNFT = await ethers.getContractFactory("TransferableNFT");
    const nft = TransferableNFT.attach(contractAddress);
    
    console.log('🎨 Minting NFT...');
    const tx = await nft.mintWithURI(recipientAddress, metadataResult.url);
    const receipt = await tx.wait();
    
    const tokenId = receipt.logs[0].topics[3];
    const tokenIdDecimal = parseInt(tokenId, 16);
    
    console.log('\n🎉 ========================================');
    console.log('✅ NFT Minted Successfully!');
    console.log('🎉 ========================================');
    console.log(`\n📋 Token ID: ${tokenIdDecimal}`);
    console.log(`👤 Owner: ${recipientAddress}`);
    console.log(`🖼️  Image: https://gateway.pinata.cloud/ipfs/${imageResult.ipfsHash}`);  // ← 수정
    console.log(`📝 Metadata: https://gateway.pinata.cloud/ipfs/${metadataResult.ipfsHash}`);  // ← 수정
    console.log(`🔗 TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log(`\n🌊 OpenSea: https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenIdDecimal}`);
}

main()
    .then(() => process.exit(0))
    .catch(console.error);