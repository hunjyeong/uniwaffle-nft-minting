import hre from "hardhat";
const { ethers } = hre;
import { config } from 'dotenv';

config();

async function main() {
    const contractAddress = process.env.TRANSFERABLE_ADDRESS;
    
    const TransferableNFT = await ethers.getContractFactory("TransferableNFT");
    const nft = TransferableNFT.attach(contractAddress);
    
    const mintPrice = await nft.mintPrice();
    console.log(`💰 Mint Price: ${ethers.formatEther(mintPrice)} ETH`);
    
    console.log('🎨 Public minting...');
    const tx = await nft.publicMint({ value: mintPrice });
    const receipt = await tx.wait();
    
    const tokenId = receipt.logs[0].topics[3];
    const tokenIdDecimal = parseInt(tokenId, 16);
    
    console.log(`✅ Minted Token ID: ${tokenIdDecimal}`);
    console.log(`🔗 TX: ${tx.hash}`);
}

main().catch(console.error);