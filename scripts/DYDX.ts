import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";

import { DYDX, DYDX__factory } from "../typechain";
import { soloMarginAddress } from "./constants/addresses";

async function main() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Wallet = <Wallet>accounts[0];

  const dydxFactory: DYDX__factory = (await ethers.getContractFactory(
    "contracts/DYDX/DYDX.sol:DYDX",
    deployer,
  )) as DYDX__factory;
  const dydx: DYDX = await dydxFactory.deploy(soloMarginAddress);

  console.log("DYDX address:", dydx.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
