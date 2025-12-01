import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying TransferableNFT with account:", deployer.address);
    
    const TransferableNFT = await ethers.getContractFactory("TransferableNFT");
    
    const nft = await TransferableNFT.deploy(
        "My Transferable NFT",           // 이름
        "TNFT",                          // 심볼
        "https://gateway.pinata.cloud/ipfs/",  // baseURI
        10000,                           // maxSupply (0 = 무제한)
        ethers.parseEther("0.001")       // mintPrice (0.001 ETH)
    );
    
    await nft.waitForDeployment();
    const address = await nft.getAddress();
    
    console.log("✅ TransferableNFT deployed to:", address);
    console.log("\n📋 Contract Details:");
    console.log("   Name:", await nft.name());
    console.log("   Symbol:", await nft.symbol());
    console.log("   Max Supply:", await nft.maxSupply());
    console.log("   Mint Price:", ethers.formatEther(await nft.mintPrice()), "ETH");
    
    console.log("\n💾 Save this address to .env:");
    console.log(`   TRANSFERABLE_NFT_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });