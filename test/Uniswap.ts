import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

import { Uniswap, IERC20, IUniswapV2Factory, IUniswapV2Pair, Uniswap__factory, ERC20 } from "../typechain";
import { uniswapFactoryAddress } from "../scripts/constants/addresses";

describe("Uniswap", () => {
  // an address with a WETH, DAI and USDC balance
  const impersonateAccountLoan: string = "0x0f4ee9631f4be0a63756515141281a3e2b293bbe";
  const impersonateAccountSwap: string = "0x2F0b23f53734252Bda2277357e97e1517d6B042A";
  const wethAddress: string = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const uniswapTokens: string[] = [
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  ];

  let accounts: Signer[];
  let uniswap: Uniswap;
  let uniswapV2Factory: IUniswapV2Factory;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const uniswapFactory: Uniswap__factory = (await ethers.getContractFactory(
      "contracts/Uniswap/Uniswap.sol:Uniswap",
      <Wallet>accounts[0],
    )) as Uniswap__factory;
    uniswap = await uniswapFactory.deploy(uniswapFactoryAddress);

    uniswapV2Factory = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory",
      uniswapFactoryAddress,
    )) as IUniswapV2Factory;
  });

  it("constructor should initialize state variables", async () => {
    const getUniswapFactory: string = await uniswap.uniswapFactory();
    expect(getUniswapFactory).to.equal(uniswapFactoryAddress);
  });

  it("should perform flash loan", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccountLoan],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccountLoan);
    for (const token of uniswapTokens) {
      const uniswapPairAddress = await uniswapV2Factory.getPair(token, wethAddress);
      const uniswapToken: IERC20 = (await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        token,
      )) as IERC20;
      const maxFlashLoan: BigNumber = (await uniswapToken.balanceOf(uniswapPairAddress)).sub(1);
      const flashFee: BigNumber = maxFlashLoan.mul(3).div(997).add(1);
      await uniswapToken.connect(impersonateAccountSigner).transfer(uniswap.address, flashFee);
      const uniswapBalance: BigNumber = await uniswapToken.balanceOf(uniswap.address);
      expect(uniswapBalance).to.equal(flashFee);
      await uniswap.flashLoan(
        uniswapPairAddress,
        uniswapToken.address,
        uniswapToken.address,
        maxFlashLoan,
        maxFlashLoan,
        ethers.utils.formatBytes32String(""),
      );
      const uniswapPairBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswapPairAddress);
      expect(uniswapPairBalancePostFlashLoan).to.equal(maxFlashLoan.add(flashFee).add(1));
      const uniswapBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswap.address);
      expect(uniswapBalancePostFlashLoan.toNumber()).to.equal(0);
    }
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccountLoan],
    });
  });

  it("should perform flash swap", async () => {
    const wethToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      wethAddress,
    )) as IERC20;
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccountLoan],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccountLoan);
    const token: string = uniswapTokens[0];
    const uniswapPairAddress = await uniswapV2Factory.getPair(token, wethAddress);
    const uniswapPair = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
      uniswapPairAddress,
    )) as IUniswapV2Pair;
    const uniswapToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      token,
    )) as IERC20;
    // const token0: string = await uniswapPair.token0();
    // console.log(token0);
    // const token1: string = await uniswapPair.token1();
    // console.log(token1);
    // const amountIn: BigNumber = ethers.utils.parseEther("100");
    // const { reserve0, reserve1 }: { reserve0: BigNumber; reserve1: BigNumber } = await uniswapPair.getReserves();
    // const reserveIn: BigNumber = token0 === wethAddress ? reserve0 : reserve1;
    // const reserveOut: BigNumber = token0 === token ? reserve0 : reserve1;
    // const amountInWithFee: BigNumber = amountIn.mul(997);
    // const numerator: BigNumber = amountInWithFee.mul(reserveOut);
    // const denominator: BigNumber = reserveIn.mul(1000).add(amountInWithFee);
    // const amountOut: BigNumber = numerator.div(denominator);
    // console.log(reserveIn.toString());
    // console.log(reserveOut.toString());
    // console.log(amountIn.toString());
    // console.log(amountOut.toString());
    // const impersonateBalance: BigNumber = await uniswapToken.balanceOf(impersonateAccountLoan);
    // console.log(impersonateBalance.toString());
    // console.log(amountOut.add(amountOut.mul(3).div(997).add(1)).toString());
    // await uniswapToken.connect(impersonateAccountSigner).transfer(uniswap.address, amountOut.add(amountOut.mul(3).div(997).add(2)));
    // const uniswapBalance: BigNumber = await uniswapToken.balanceOf(uniswap.address);
    // expect(uniswapBalance).to.equal(amountOut.add(amountOut.mul(3).div(997).add(2)));
    // await uniswap.flashLoan(
    //   uniswapPair.address,
    //   wethToken.address,
    //   uniswapToken.address,
    //   amountIn,
    //   amountOut.add(1),
    //   ethers.utils.formatBytes32String(""),
    // );
    // const uniswapPairBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswapPairAddress);
    // expect(uniswapPairBalancePostFlashLoan).to.equal(maxFlashLoan.add(flashFee).add(1));
    // const uniswapBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswap.address);
    // expect(uniswapBalancePostFlashLoan.toNumber()).to.equal(0);
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccountLoan],
    });
  });
});
