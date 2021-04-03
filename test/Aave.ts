import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

import { Aave, ILendingPool, ILendingPoolAddressesProvider, IERC20, Aave__factory } from "../typechain";
import { lendingPoolProviderAddress } from "../scripts/constants/addresses";

describe("Aave", () => {
  const lendingPoolTokens: string[] = [
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  ];
  // an address with a WETH, DAI and USDC balance
  const impersonateAccount = "0x0f4ee9631f4be0a63756515141281a3e2b293bbe";

  let accounts: Signer[];
  let aave: Aave;
  let lendingPoolAddressesProvider: ILendingPoolAddressesProvider;
  let lendingPool: ILendingPool;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const aaveFactory: Aave__factory = (await ethers.getContractFactory(
      "contracts/Aave/Aave.sol:Aave",
      <Wallet>accounts[0],
    )) as Aave__factory;
    aave = await aaveFactory.deploy(lendingPoolProviderAddress);

    lendingPoolAddressesProvider = (await ethers.getContractAt(
      "contracts/Aave/interfaces/ILendingPoolAddressesProvider.sol:ILendingPoolAddressesProvider",
      lendingPoolProviderAddress,
    )) as ILendingPoolAddressesProvider;

    const lendingPoolAddress: string = await lendingPoolAddressesProvider.getLendingPool();
    lendingPool = (await ethers.getContractAt(
      "contracts/Aave/interfaces/ILendingPool.sol:ILendingPool",
      lendingPoolAddress,
    )) as ILendingPool;
  });

  it("constructor should initialize state variables", async () => {
    const getAddressesProvider: string = await aave.ADDRESSES_PROVIDER();
    expect(getAddressesProvider).to.equal(lendingPoolProviderAddress);

    const getLendingPool: string = await aave.LENDING_POOL();
    expect(getLendingPool).to.equal(lendingPool.address);
  });

  it("should perform flash loan", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    for (const token of lendingPoolTokens) {
      const lendingPoolToken: IERC20 = (await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        token,
      )) as IERC20;
      const aTokenAddress: string = (await lendingPool.getReserveData(lendingPoolToken.address))[7];
      const maxFlashLoan: BigNumber = await lendingPoolToken.balanceOf(aTokenAddress);
      const flashFee = maxFlashLoan.mul(9).div(10000);
      await lendingPoolToken.connect(impersonateAccountSigner).transfer(aave.address, flashFee);
      const aaveBalance: BigNumber = await lendingPoolToken.balanceOf(aave.address);
      expect(aaveBalance).to.equal(flashFee);
      await aave.flashLoan([lendingPoolToken.address], [maxFlashLoan], [0], "0x");
      const lendingPoolBalancePostFlashLoan: BigNumber = await lendingPoolToken.balanceOf(aTokenAddress);
      expect(lendingPoolBalancePostFlashLoan).to.equal(maxFlashLoan.add(flashFee));
      const aaveBalancePostFlashLoan: BigNumber = await lendingPoolToken.balanceOf(aave.address);
      expect(aaveBalancePostFlashLoan.toNumber()).to.equal(0);
    }
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
