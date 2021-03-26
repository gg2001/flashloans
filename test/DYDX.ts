import { ethers, waffle, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

import { DYDX, ISoloMargin, IERC20, DYDX__factory } from "../typechain";

describe("DYDX", () => {
  const soloMarginAddress: string =
    "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e";
  const impersonateAccount = "0x0f4ee9631f4be0a63756515141281a3e2b293bbe";
  const tokenBlackList: Set<string> = new Set();
  tokenBlackList.add("0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"); // SAI

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
      <Wallet>accounts[0]
    )) as DYDX__factory;
    dydx = await dydxFactory.deploy(soloMarginAddress);

    flashFee = await dydx.flashFee();

    soloMargin = (await ethers.getContractAt(
      "contracts/DYDX/interfaces/ISoloMargin.sol:ISoloMargin",
      soloMarginAddress
    )) as ISoloMargin;
    numMarkets = (await soloMargin.getNumMarkets()).toNumber();
    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = await soloMargin.getMarketTokenAddress(
        marketId
      );
      soloMarginTokens.push(soloMarginToken);
    }
  });

  it("constructor should initialize state variables", async () => {
    const getSoloMargin: string = await dydx.soloMargin();
    expect(getSoloMargin).to.equal(soloMarginAddress);

    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = soloMarginTokens[marketId];
      const tokenAddressToMarketId: number = (
        await dydx.tokenAddressToMarketId(soloMarginToken)
      ).toNumber();
      expect(tokenAddressToMarketId).to.equal(marketId);
      const tokensRegistered: boolean = await dydx.tokensRegistered(
        soloMarginToken
      );
      expect(tokensRegistered).to.equal(true);
    }
  });

  it("should perform flash loan", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(
      impersonateAccount
    );
    for (let marketId: number = 0; marketId < numMarkets; marketId++) {
      const soloMarginToken: string = soloMarginTokens[marketId];
      if (tokenBlackList.has(soloMarginToken)) {
        continue;
      }
      const marginToken: IERC20 = (await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        soloMarginToken
      )) as IERC20;
      const maxFlashLoan: BigNumber = await marginToken.balanceOf(
        soloMarginAddress
      );
      marginToken
        .connect(impersonateAccountSigner)
        .transfer(dydx.address, flashFee);
      await dydx.flashLoan(
        soloMarginToken,
        maxFlashLoan,
        ethers.utils.formatBytes32String("")
      );
    }
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
