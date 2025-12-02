import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying FractionalNFT with account:", deployer.address);
    
    const FractionalNFT = await ethers.getContractFactory("FractionalNFT");
    
    // FractionalNFT 생성자 파라미터
    const fractionalNFT = await FractionalNFT.deploy(
        "Fractional NFT",                // 이름
        "FNFT",                          // 심볼
        "https://gateway.pinata.cloud/ipfs/"  // baseURI
    );
    
    await fractionalNFT.waitForDeployment();
    const address = await fractionalNFT.getAddress();
    
    console.log("FractionalNFT deployed to:", address);
    console.log("\nContract Details:");
    console.log("   Name:", await fractionalNFT.name());
    console.log("   Symbol:", await fractionalNFT.symbol());
    
    console.log("\nSave this address to .env:");
    console.log(`   REACT_APP_FRACTIONAL_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });