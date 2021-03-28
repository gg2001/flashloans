import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";

import { Aave, Aave__factory } from "../typechain";
import { lendingPoolProviderAddress } from "./constants/addresses";

async function main() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Wallet = <Wallet>accounts[0];

  const aaveFactory: Aave__factory = (await ethers.getContractFactory(
    "contracts/Aave/Aave.sol:Aave",
    deployer,
  )) as Aave__factory;
  const aave: Aave = await aaveFactory.deploy(lendingPoolProviderAddress);

  console.log("Aave address:", aave.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
