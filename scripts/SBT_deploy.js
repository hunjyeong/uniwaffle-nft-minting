import hre from "hardhat";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("Deploying Soulbound Token with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
    
    // 컨트랙트 이름 확인 - SoulboundToken 또는 SoulboundNFT
    const SoulboundToken = await hre.ethers.getContractFactory("SoulboundNFT"); // 이름 확인 필요
    
    const sbt = await SoulboundToken.deploy(
        "My Soulbound Token",      // 이름
        "SBT",                     // 심볼
        "https://gateway.pinata.cloud/ipfs/" // baseURI
    );
    
    console.log("Deploying... Please wait...");
    await sbt.waitForDeployment();
    const sbtAddress = await sbt.getAddress();
    
    console.log("\n✅ Soulbound Token deployed to:", sbtAddress);

    console.log("\n⏳ Waiting for contract to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
    
    console.log("\nContract Details:");
    console.log("   Name:", await sbt.name());
    console.log("   Symbol:", await sbt.symbol());
    
    // 네트워크 확인
    const network = await hre.ethers.provider.getNetwork();
    const chainId = '0x' + network.chainId.toString(16);
    
    console.log("\nSave this address to .env:");
    if (chainId === '0xaa36a7') {
        console.log(`REACT_APP_SEPOLIA_SOULBOUND_ADDRESS=${sbtAddress}`);
    } else if (chainId === '0x1') {
        console.log(`REACT_APP_MAINNET_SOULBOUND_ADDRESS=${sbtAddress}`);
    } else if (chainId === '0x89') {
        console.log(`REACT_APP_POLYGON_SOULBOUND_ADDRESS=${sbtAddress}`);
    } else if (chainId === '0xa4b1') {
        console.log(`REACT_APP_ARBITRUM_SOULBOUND_ADDRESS=${sbtAddress}`);
    } else if (chainId === '0xa') {
        console.log(`REACT_APP_OPTIMISM_SOULBOUND_ADDRESS=${sbtAddress}`);
    } else if (chainId === '0x2105') {
        console.log(`REACT_APP_BASE_SOULBOUND_ADDRESS=${sbtAddress}`);
    }
    
    console.log("\n⏳ Waiting for block confirmations...");
    await sbt.deploymentTransaction().wait(5);
    
    console.log("\n✅ Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });