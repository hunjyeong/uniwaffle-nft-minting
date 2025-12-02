import hre from "hardhat";

async function main() {
    const contractAddress = "0xBfC7c1e9928DF24803369f49478Dfa0333055f17";
    const [signer] = await hre.ethers.getSigners();
    
    const SBT = await hre.ethers.getContractAt("SoulboundToken", contractAddress);
    
    console.log("Testing SBT transfer restriction...");
    
    try {
        // 다른 주소로 전송 시도 (실패해야 정상)
        const otherAddress = "0x90E1B54e1f4bDdA829734c7B5b6B86f893B785ae";
        await SBT.transferFrom(signer.address, otherAddress, 0);
        console.log("ERROR: Transfer succeeded (should have failed!)");
    } catch (error) {
        console.log("SUCCESS: Transfer blocked as expected");
        console.log("Error message:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
