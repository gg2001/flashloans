// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.5;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract Uniswap is IUniswapV2Callee {
    using SafeMath for uint256;

    IUniswapV2Factory public uniswapFactory;

    constructor(IUniswapV2Factory _uniswapFactory) {
        uniswapFactory = _uniswapFactory;
    }

    function flashLoan(
        IUniswapV2Pair pair,
        address token,
        address toToken,
        uint256 amount,
        uint256 toAmount,
        bytes memory userData
    ) external {
        uint256 amount0Out;
        uint256 amount1Out;
        if (token == pair.token0()) {
            amount0Out = amount;
        } else if (token == pair.token1()) {
            amount1Out = amount;
        }
        bytes memory data = abi.encode(token, toToken, toAmount, userData);
        pair.swap(amount0Out, amount1Out, address(this), data);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "only this contract may initiate");
        address token0 = IUniswapV2Pair(msg.sender).token0(); // fetch the address of token0
        address token1 = IUniswapV2Pair(msg.sender).token1();
        require(msg.sender == uniswapFactory.getPair(token0, token1), "only permissioned UniswapV2 pair can call");
        (address token, address toToken, uint256 toAmount, bytes memory userData) = abi.decode(data, (address, address, uint256, bytes));
        uint256 amount = amount0 > 0 ? amount0 : amount1;

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the pair contract to pull the owed amount + flashFee
        IERC20(toToken).transfer(msg.sender, toAmount.add(toAmount.mul(3).div(997).add(1)));
    }
}
