import hre from "hardhat";

async function main() {
    const contractAddress = "0xBfC7c1e9928DF24803369f49478Dfa0333055f17";
    const [signer] = await hre.ethers.getSigners();
    
    console.log("Minting with account:", signer.address);
    
    const SBT = await hre.ethers.getContractAt("SoulboundToken", contractAddress);
    
    // 민팅
    const recipient = signer.address; // 자신에게 민팅
    console.log("Minting to:", recipient);
    
    const tx = await SBT.mint(recipient);
    await tx.wait();
    
    console.log("Minted successfully!");
    console.log("Transaction:", tx.hash);
    
    // 토큰 정보 확인
    const totalSupply = await SBT.totalSupply();
    const hasMinted = await SBT.hasMinted(recipient);
    const owner = await SBT.ownerOf(0);
    
    console.log("\n=== Token Info ===");
    console.log("Total Supply:", totalSupply.toString());
    console.log("Has Minted:", hasMinted);
    console.log("Owner of Token #0:", owner);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
