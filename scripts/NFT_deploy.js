import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying Native NFT with account:", deployer.address);
    
    const NativeNFT = await ethers.getContractFactory("NativeNFT");
    
    const nft = await NativeNFT.deploy(
        "My Native NFT",           // 이름
        "TNFT",                          // 심볼
        "https://gateway.pinata.cloud/ipfs/",  // baseURI
        10000,                           // maxSupply (0 = 무제한)
        ethers.parseEther("0.001")       // mintPrice (0.001 ETH)
    );
    
    await nft.waitForDeployment();
    const address = await nft.getAddress();
    
    console.log("NativeNFT deployed to:", address);
    console.log("\nContract Details:");
    console.log("   Name:", await nft.name());
    console.log("   Symbol:", await nft.symbol());
    console.log("   Max Supply:", await nft.maxSupply());
    console.log("   Mint Price:", ethers.formatEther(await nft.mintPrice()), "ETH");
    
    console.log("\nSave this address to .env:");
    console.log(`   NATIVENFT_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });