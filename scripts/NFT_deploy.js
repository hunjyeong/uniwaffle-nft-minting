import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying Native NFT with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const NativeNFT = await ethers.getContractFactory("NativeNFT");
    
    const nft = await NativeNFT.deploy(
        "My Native NFT",                              // name
        "MNFT",                                       // symbol
        "https://gateway.pinata.cloud/ipfs/",        // baseURI
        10000,                                        // maxSupply (0 = unlimited)
        ethers.parseEther("0")                        // mintPrice (0 ETH = free)
    );
    
    console.log("Deploying... Please wait...");
    await nft.waitForDeployment();
    const address = await nft.getAddress();
    
    console.log("\nNativeNFT deployed to:", address);
    console.log("\nContract Details:");
    console.log("   Name:", await nft.name());
    console.log("   Symbol:", await nft.symbol());
    console.log("   Max Supply:", await nft.maxSupply());
    console.log("   Mint Price:", ethers.formatEther(await nft.mintPrice()), "ETH");
    
    // 네트워크 확인
    const network = await ethers.provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);
    
    console.log("\nSave this address to .env:");
    if (chainId === '0xaa36a7') {
        console.log(`REACT_APP_SEPOLIA_NATIVE_ADDRESS=${address}`);
    } else if (chainId === '0x1') {
        console.log(`REACT_APP_MAINNET_NATIVE_ADDRESS=${address}`);
    } else if (chainId === '0x89') {
        console.log(`REACT_APP_POLYGON_NATIVE_ADDRESS=${address}`);
    } else if (chainId === '0xa4b1') {
        console.log(`REACT_APP_ARBITRUM_NATIVE_ADDRESS=${address}`);
    } else if (chainId === '0xa') {
        console.log(`REACT_APP_OPTIMISM_NATIVE_ADDRESS=${address}`);
    } else if (chainId === '0x2105') {
        console.log(`REACT_APP_BASE_NATIVE_ADDRESS=${address}`);
    }
    
    console.log("\n⏳ Waiting for block confirmations...");
    await nft.deploymentTransaction().wait(5); // 5개 블록 대기
    
    console.log("\nDeployment complete!");
    console.log("\nVerify on Etherscan:");
    if (chainId === '0x1') {
        console.log(`   https://etherscan.io/address/${address}`);
    } else if (chainId === '0xaa36a7') {
        console.log(`   https://sepolia.etherscan.io/address/${address}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });