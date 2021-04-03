import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

import { Uniswap, IERC20, IUniswapV2Factory, IUniswapV2Pair, Uniswap__factory } from "../typechain";
import { uniswapFactoryAddress } from "../scripts/constants/addresses";

describe("Uniswap", () => {
  // an address with a WETH, DAI and USDC balance
  const impersonateAccount: string = "0x0f4ee9631f4be0a63756515141281a3e2b293bbe";
  const wethAddress: string = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const uniswapTokens: string[] = [
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    wethAddress,
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
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    for (const token of uniswapTokens) {
      const uniswapToken: IERC20 = (await ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
        token,
      )) as IERC20;
      const uniswapPairAddress = await uniswapV2Factory.getPair(
        token,
        token !== wethAddress ? wethAddress : uniswapTokens[0],
      );
      const uniswapPair = (await ethers.getContractAt(
        "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
        uniswapPairAddress,
      )) as IUniswapV2Pair;
      // Get maximum possible flash loan
      const maxFlashLoan: BigNumber = (await uniswapToken.balanceOf(uniswapPair.address)).sub(1);
      // Calculate flash loan fee
      const flashFee: BigNumber = maxFlashLoan.mul(3).div(997).add(1);
      // Transfer fee to contract
      await uniswapToken.connect(impersonateAccountSigner).transfer(uniswap.address, flashFee);
      const uniswapBalance: BigNumber = await uniswapToken.balanceOf(uniswap.address);
      expect(uniswapBalance).to.equal(flashFee);

      // flash loan logic
      const token0: string = await uniswapPair.token0();
      const token1: string = await uniswapPair.token1();
      let amount0Out: BigNumber = maxFlashLoan;
      let amount1Out: BigNumber = BigNumber.from(0);
      let tokenInput: string = token0;
      let repayTokenInput: string = token1;
      if (uniswapToken.address === token1) {
        amount0Out = BigNumber.from(0);
        amount1Out = maxFlashLoan;
        tokenInput = token1;
        repayTokenInput = token0;
      }
      await uniswap.flashLoan(
        uniswapPair.address,
        tokenInput,
        repayTokenInput,
        amount0Out,
        amount1Out,
        BigNumber.from(0),
        "0x",
      );

      const uniswapPairBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswapPair.address);
      expect(uniswapPairBalancePostFlashLoan).to.equal(maxFlashLoan.add(flashFee).add(1));
      const uniswapBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswap.address);
      expect(uniswapBalancePostFlashLoan.toNumber()).to.equal(0);
    }
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });

  it("should perform flash swap", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const wethToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      wethAddress,
    )) as IERC20;
    const token: string = uniswapTokens[0];
    const uniswapPairAddress = await uniswapV2Factory.getPair(token, wethToken.address);
    const uniswapPair = (await ethers.getContractAt(
      "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol:IUniswapV2Pair",
      uniswapPairAddress,
    )) as IUniswapV2Pair;
    const uniswapToken: IERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      token,
    )) as IERC20;
    const amountOut = ethers.utils.parseEther("100");
    // Get amount in
    const token0: string = await uniswapPair.token0();
    const token1: string = await uniswapPair.token1();
    const { reserve0, reserve1 }: { reserve0: BigNumber; reserve1: BigNumber } = await uniswapPair.getReserves();
    const reserveIn: BigNumber = token0 === token ? reserve0 : reserve1;
    const reserveOut: BigNumber = token0 === wethToken.address ? reserve0 : reserve1;
    const numerator: BigNumber = reserveIn.mul(amountOut).mul(1000);
    const denominator: BigNumber = reserveOut.sub(amountOut).mul(997);
    const amountIn: BigNumber = numerator.div(denominator).add(1);
    // Transfer amount to contract
    await uniswapToken.connect(impersonateAccountSigner).transfer(uniswap.address, amountIn);
    const uniswapBalance: BigNumber = await uniswapToken.balanceOf(uniswap.address);
    expect(uniswapBalance).to.equal(amountIn);

    // Flash swap logic
    let amount0Out: BigNumber = amountOut;
    let amount1Out: BigNumber = BigNumber.from(0);
    let tokenInput: string = token0;
    let repayTokenInput: string = token1;
    if (wethToken.address === token1) {
      amount0Out = BigNumber.from(0);
      amount1Out = amountOut;
      tokenInput = token1;
      repayTokenInput = token0;
    }
    await uniswap.flashLoan(uniswapPair.address, tokenInput, repayTokenInput, amount0Out, amount1Out, amountIn, "0x");

    const uniswapTokenBalancePostFlashLoan: BigNumber = await uniswapToken.balanceOf(uniswap.address);
    expect(uniswapTokenBalancePostFlashLoan.toNumber()).to.equal(0);
    const uniswapWethBalancePostFlashLoan: BigNumber = await wethToken.balanceOf(uniswap.address);
    expect(uniswapWethBalancePostFlashLoan).to.equal(amountOut);
    const {
      reserve0: reserve0Post,
      reserve1: reserve1Post,
    }: { reserve0: BigNumber; reserve1: BigNumber } = await uniswapPair.getReserves();
    expect(reserve0Post).to.equal(reserve0.add(amountIn));
    expect(reserve1Post).to.equal(reserve1.sub(amountOut));
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
