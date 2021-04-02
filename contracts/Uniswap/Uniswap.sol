// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.5;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract Uniswap is IUniswapV2Callee {
    using SafeMath for uint256;

    IUniswapV2Factory public immutable uniswapFactory;

    constructor(IUniswapV2Factory _uniswapFactory) {
        uniswapFactory = _uniswapFactory;
    }

    function flashLoan(
        IUniswapV2Pair pair,
        address token,
        address repayToken,
        uint256 amount0Out,
        uint256 amount1Out,
        uint256 repayAmount,
        bytes memory userData
    ) external {
        bytes memory data = abi.encode(token, repayToken, repayAmount, userData);
        pair.swap(amount0Out, amount1Out, address(this), data);
    }

    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        require(sender == address(this), "only this contract may initiate");
        (address token, address repayToken, uint256 repayAmount, bytes memory userData) =
            abi.decode(data, (address, address, uint256, bytes));
        require(msg.sender == uniswapFactory.getPair(token, repayToken), "only permissioned UniswapV2 pair can call");
        uint256 amount = amount0 > 0 ? amount0 : amount1;

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
