import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying Composable NFT with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const ComposableNFT = await ethers.getContractFactory("ComposableNFT");
    
    const nft = await ComposableNFT.deploy(
        "My Composable NFT",                          // name
        "CNFT",                                       // symbol
        "https://gateway.pinata.cloud/ipfs/",        // baseURI
        10000,                                        // maxSupply
        ethers.parseEther("0.05")                    // mintPrice
    );
    
    console.log("Deploying... Please wait...");
    await nft.waitForDeployment();
    const address = await nft.getAddress();
    
    console.log("\nComposableNFT deployed to:", address);

    console.log("\n⏳ Waiting for contract to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 3000));

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
        console.log(`REACT_APP_SEPOLIA_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0x1') {
        console.log(`REACT_APP_MAINNET_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0x89') {
        console.log(`REACT_APP_POLYGON_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0xa4b1') {
        console.log(`REACT_APP_ARBITRUM_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0xa') {
        console.log(`REACT_APP_OPTIMISM_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0x2105') {
        console.log(`REACT_APP_BASE_COMPOSABLE_ADDRESS=${address}`);
    } else if (chainId === '0x14a34') {
        console.log(`REACT_APP_BASE_SEPOLIA_COMPOSABLE_ADDRESS=${address}`);
    }
    
    console.log("\n⏳ Waiting for block confirmations...");
    await nft.deploymentTransaction().wait(5);
    
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