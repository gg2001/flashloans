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
        uint256 amount0Out,
        uint256 amount1Out,
        uint256 toAmount,
        bytes memory userData
    ) external {
        bytes memory data = abi.encode(toAmount, userData);
        pair.swap(amount0Out, amount1Out, address(this), data);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "only this contract may initiate");
        uint256 amount;
        address token;
        address repayToken;
        if (amount0 > 0) {
            amount = amount0;
            token = IUniswapV2Pair(msg.sender).token0();
            repayToken = IUniswapV2Pair(msg.sender).token1();
        } else if (amount1 > 0) {
            amount = amount1;
            token = IUniswapV2Pair(msg.sender).token1();
            repayToken = IUniswapV2Pair(msg.sender).token0();
        }
        require(msg.sender == uniswapFactory.getPair(token, repayToken), "only permissioned UniswapV2 pair can call");
        (uint256 repayAmount, bytes memory userData) = abi.decode(data, (uint256, bytes));

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the pair contract to pull the owed amount + flashFee
        if (repayAmount == 0) {
            IERC20(token).transfer(msg.sender, amount.add(amount.mul(3).div(997).add(1)));
        } else {
            IERC20(repayToken).transfer(msg.sender, repayAmount);
        }
    }
}
