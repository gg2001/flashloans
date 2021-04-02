import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";

import { Uniswap, Uniswap__factory } from "../typechain";
import { uniswapFactoryAddress } from "./constants/addresses";

async function main() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer: Wallet = <Wallet>accounts[0];

  const uniswapFactory: Uniswap__factory = (await ethers.getContractFactory(
    "contracts/Uniswap/Uniswap.sol:Uniswap",
    deployer,
  )) as Uniswap__factory;
  const uniswap: Uniswap = await uniswapFactory.deploy(uniswapFactoryAddress);

  console.log("Uniswap address:", uniswap.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
