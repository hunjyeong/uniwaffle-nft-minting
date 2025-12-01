import hre from "hardhat";

async function main() {
    const contractAddress = "0xBfC7c1e9928DF24803369f49478Dfa0333055f17";
    const SBT = await hre.ethers.getContractAt("SoulboundToken", contractAddress);
    
    const tokenId = 0;
    
    console.log("=== Token #" + tokenId + " Info ===");
    console.log("Owner:", await SBT.ownerOf(tokenId));
    console.log("Token URI:", await SBT.tokenURI(tokenId));
    console.log("Total Supply:", (await SBT.totalSupply()).toString());
}

main().catch(console.error);
