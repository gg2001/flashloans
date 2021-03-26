import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-gas-reporter";
import "@typechain/hardhat";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();
const ALCHEMY_MAINNET: string =
  "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY;
const COINMARKETCAP: string | undefined = process.env.COINMARKETCAP;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: ALCHEMY_MAINNET,
        blockNumber: 12088078,
      },
      chainId: 1337,
    },
  },
  solidity: {
    version: "0.7.5",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  mocha: {
    timeout: 120000,
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 100,
    coinmarketcap: COINMARKETCAP,
  },
};

export default config;
