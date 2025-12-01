import hre from "hardhat";
const { ethers } = hre;
import { config } from 'dotenv';

config();

async function main() {
    const contractAddress = process.env.TRANSFERABLE_ADDRESS;
    const toAddress = "0x80d48039fc26588396Fc59e3101EF4580979468d"; // ← 받을 주소 (다른 주소로 변경)
    
    if (!contractAddress) {
        console.error('❌ TRANSFERABLE_ADDRESS not found in .env');
        return;
    }
    
    const TransferableNFT = await ethers.getContractFactory("TransferableNFT");
    const nft = TransferableNFT.attach(contractAddress);
    
    const [signer] = await ethers.getSigners();
    const fromAddress = await signer.getAddress();
    
    // 소유한 토큰 확인
    const tokens = await nft.tokensOfOwner(fromAddress);
    
    if (tokens.length === 0) {
        console.log('❌ No tokens found for your address');
        console.log(`   Your address: ${fromAddress}`);
        
        // RECIPIENT_ADDRESS로 민팅했는지 확인
        const recipientAddress = process.env.RECIPIENT_ADDRESS;
        if (recipientAddress && recipientAddress !== fromAddress) {
            const recipientTokens = await nft.tokensOfOwner(recipientAddress);
            console.log(`\n💡 Tokens minted to RECIPIENT_ADDRESS: ${recipientTokens.length}`);
            console.log(`   RECIPIENT_ADDRESS: ${recipientAddress}`);
            console.log(`   Signer address: ${fromAddress}`);
            console.log('\n   These are different addresses!');
            console.log('   Update MNEMONIC in .env to match recipient address,');
            console.log('   or mint to signer address instead.');
        }
        return;
    }
    
    const tokenId = tokens[0];
    
    console.log(`📦 Transferring Token ID ${tokenId}`);
    console.log(`   From: ${fromAddress}`);
    console.log(`   To: ${toAddress}\n`);
    
    const tx = await nft.transferFrom(fromAddress, toAddress, tokenId);
    console.log('⏳ Waiting for confirmation...');
    await tx.wait();
    
    console.log('\n✅ Transfer successful!');
    console.log(`🔗 TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
    console.log(`\n🌊 OpenSea (New Owner): https://testnets.opensea.io/assets/sepolia/${contractAddress}/${tokenId}`);
}

main()
    .then(() => process.exit(0))
    .catch(console.error);