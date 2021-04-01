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

    constructor(IUniswapV2Factory _factory) {
        uniswapFactory = _factory;
    }

    function flashLoan(
        address token,
        address toToken,
        uint256 amount,
        bytes memory userData
    ) external returns (bool) {
        IUniswapV2Pair pair = IUniswapV2Pair(uniswapFactory.getPair(token, toToken));
        uint256 amount0Out;
        uint256 amount1Out;
        if (token == pair.token0()) {
            amount0Out = amount;
        } else if (token == pair.token1()) {
            amount1Out = amount;
        }
        bytes memory data = abi.encode(token, toToken, userData);
        pair.swap(amount0Out, amount1Out, address(this), data);
        return true;
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "only this contract may initiate");
        (address token, address toToken, bytes memory userData) = abi.decode(data, (address, address, bytes));
        require(msg.sender == uniswapFactory.getPair(token, toToken), "only permissioned UniswapV2 pair can call");
        uint256 amount = amount0 > 0 ? amount0 : amount1;

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the pair contract to pull the owed amount + flashFee
        IERC20(toToken).transfer(msg.sender, amount.add(amount.mul(3).div(997).add(1)));
    }
}
