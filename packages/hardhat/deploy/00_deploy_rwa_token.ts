import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * 部署 RWAToken 合约
 *
 * 参数:
 *   name          = "RWA ETF Gold"
 *   symbol        = "RWAG"
 *   initialSupply = 1,000,000 RWAG (with 18 decimals)
 *   admin         = deployer address
 */
const deployRWAToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 1,000,000 tokens with 18 decimals
  const initialSupply = hre.ethers.parseEther("1000000");

  console.log("\n📦 Deploying RWAToken...");
  console.log("   Name:           RWA ETF Gold");
  console.log("   Symbol:         RWAG");
  console.log("   Initial Supply: 1,000,000 RWAG");
  console.log("   Admin/Deployer:", deployer);

  const deployResult = await deploy("RWAToken", {
    from: deployer,
    args: ["RWA ETF Gold", "RWAG", initialSupply, deployer],
    log: true,
    autoMine: true,
  });

  console.log("\n✅ RWAToken deployed to:", deployResult.address);

  // Verify deployment by reading on-chain state
  const rwaToken = await hre.ethers.getContract<Contract>("RWAToken", deployer);
  const name = await rwaToken.name();
  const symbol = await rwaToken.symbol();
  const totalSupply = await rwaToken.totalSupply();
  const adminWhitelisted = await rwaToken.isWhitelisted(deployer);
  const whitelistCount = await rwaToken.getWhitelistCount();

  console.log("\n📊 Post-deploy verification:");
  console.log("   Token Name:       ", name);
  console.log("   Token Symbol:     ", symbol);
  console.log("   Total Supply:     ", hre.ethers.formatEther(totalSupply), symbol);
  console.log("   Admin Whitelisted:", adminWhitelisted);
  console.log("   Whitelist Count:  ", whitelistCount.toString());
  console.log("");
};

export default deployRWAToken;

// Tag for selective deployment: yarn deploy --tags RWAToken
deployRWAToken.tags = ["RWAToken"];
