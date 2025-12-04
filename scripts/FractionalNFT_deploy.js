import hre from "hardhat";
const { ethers } = hre;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying Fractional NFT with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const FractionalNFT = await ethers.getContractFactory("FractionalNFT");
    
    const nft = await FractionalNFT.deploy(
        "My Fractional NFT",                          // name
        "FNFT",                                       // symbol
        "https://gateway.pinata.cloud/ipfs/",        // baseURI
        ethers.parseEther("100"),                    // floorPrice (NFT 최소 가격)
        1000                                          // fractionSupply (조각 개수)
    );
    
    console.log("Deploying... Please wait...");
    await nft.waitForDeployment();
    const address = await nft.getAddress();
    
    console.log("\nFractionalNFT deployed to:", address);

    console.log("\n⏳ Waiting for contract to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("\nContract Details:");
    console.log("   Name:", await nft.name());
    console.log("   Symbol:", await nft.symbol());
    console.log("   Floor Price:", ethers.formatEther(await nft.floorPrice()), "ETH");
    console.log("   Fraction Supply:", await nft.fractionSupply());
    console.log("   Price per Fraction:", ethers.formatEther(await nft.floorPrice() / await nft.fractionSupply()), "ETH");
    
    // 네트워크 확인
    const network = await ethers.provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);
    
    console.log("\nSave this address to .env:");
    if (chainId === '0xaa36a7') {
        console.log(`REACT_APP_SEPOLIA_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0x1') {
        console.log(`REACT_APP_MAINNET_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0x89') {
        console.log(`REACT_APP_POLYGON_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0xa4b1') {
        console.log(`REACT_APP_ARBITRUM_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0xa') {
        console.log(`REACT_APP_OPTIMISM_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0x2105') {
        console.log(`REACT_APP_BASE_FRACTIONAL_ADDRESS=${address}`);
    } else if (chainId === '0x14a34') {
        console.log(`REACT_APP_BASE_SEPOLIA_FRACTIONAL_ADDRESS=${address}`);
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