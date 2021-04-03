import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

import { DYDX, ISoloMargin, IERC20, DYDX__factory } from "../typechain";
import { soloMarginAddress } from "../scripts/constants/addresses";

describe("DYDX", () => {
  // an address with a WETH, DAI and USDC balance
  const impersonateAccount = "0x0f4ee9631f4be0a63756515141281a3e2b293bbe";
  // skip deprecated tokens
  const tokenBlackList: Set<string> = new Set([
    "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359", // SAI
  ]);

  let accounts: Signer[];
  let dydx: DYDX;
  let soloMargin: ISoloMargin;
  let numMarkets: number;
  let flashFee: BigNumber;
  const soloMarginTokens: string[] = [];

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const dydxFactory: DYDX__factory = (await ethers.getContractFactory(
      "contracts/DYDX/DYDX.sol:DYDX",
      <Wallet>accounts[0],
    )) as DYDX__factory;
    dydx = await dydxFactory.deploy(soloMarginAddress);

    flashFee = await dydx.flashFee();

    soloMargin = (await ethers.getContractAt(
      "contracts/DYDX/interfaces/ISoloMargin.sol:ISoloMargin",
      soloMarginAddress,
    )) as ISoloMargin;
    numMarkets = (await soloMargin.getNumMarkets()).toNumber();
    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = await soloMargin.getMarketTokenAddress(marketId);
      soloMarginTokens.push(soloMarginToken);
    }
  });

  it("constructor should initialize state variables", async () => {
    const getSoloMargin: string = await dydx.soloMargin();
    expect(getSoloMargin).to.equal(soloMarginAddress);

    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = soloMarginTokens[marketId];
      const tokenAddressToMarketId: number = (await dydx.tokenAddressToMarketId(soloMarginToken)).toNumber();
      expect(tokenAddressToMarketId).to.equal(marketId);
    }
  });

  it("should perform flash loan", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = soloMarginTokens[marketId];
      if (tokenBlackList.has(soloMarginToken)) {
        continue;
      }
      const marginToken: IERC20 = (await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        soloMarginToken,
      )) as IERC20;
      const maxFlashLoan: BigNumber = await marginToken.balanceOf(soloMarginAddress);
      await marginToken.connect(impersonateAccountSigner).transfer(dydx.address, flashFee);
      const dydxBalance: BigNumber = await marginToken.balanceOf(dydx.address);
      expect(dydxBalance).to.equal(flashFee);
      await dydx.flashLoan(marginToken.address, maxFlashLoan, "0x");
      const soloBalancePostFlashLoan: BigNumber = await marginToken.balanceOf(soloMarginAddress);
      expect(soloBalancePostFlashLoan).to.equal(maxFlashLoan.add(flashFee));
      const dydxBalancePostFlashLoan: BigNumber = await marginToken.balanceOf(dydx.address);
      expect(dydxBalancePostFlashLoan.toNumber()).to.equal(0);
    }
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
