// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.5;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ISoloMargin } from "./interfaces/ISoloMargin.sol";
import { ICallee } from "./interfaces/ICallee.sol";
import { DYDXDataTypes } from "./libraries/DYDXDataTypes.sol";

/// @author Ganesh Gautham Elango
/// @title dYdX flash loan contract
contract DYDX is ICallee {
    using SafeMath for uint256;

    ISoloMargin public immutable soloMargin;
    mapping(address => uint256) public tokenAddressToMarketId;

    // 2 wei flash loan fee
    uint256 public constant flashFee = 2;

    /// @param _soloMargin dYdX SoloMargin address
    constructor(address _soloMargin) {
        soloMargin = ISoloMargin(_soloMargin);
        // Setup state variables
        uint256 numMarkets = ISoloMargin(_soloMargin).getNumMarkets();
        for (uint256 marketId = 0; marketId < numMarkets; marketId++) {
            address token = ISoloMargin(_soloMargin).getMarketTokenAddress(marketId);
            tokenAddressToMarketId[token] = marketId;
        }
    }

    /// @dev Initiates flash loan
    /// @param token The loan currency
    /// @param amount The amount of tokens lent
    /// @param userData A data parameter to be passed on to the `receiver` for any custom use
    function flashLoan(
        address token,
        uint256 amount,
        bytes memory userData
    ) external {
        // dYdX operations for performing a flash loan
        DYDXDataTypes.ActionArgs[] memory operations = new DYDXDataTypes.ActionArgs[](3);
        operations[0] = getWithdrawAction(token, amount);
        // Encode arbitrary data to be sent to callFunction
        operations[1] = getCallAction(abi.encode(token, amount, userData));
        operations[2] = getDepositAction(token, amount.add(flashFee));
        // dYdX account info
        DYDXDataTypes.AccountInfo[] memory accountInfos = new DYDXDataTypes.AccountInfo[](1);
        // This contract
        accountInfos[0] = DYDXDataTypes.AccountInfo({ owner: address(this), number: 1 });
        // Perform flash loan
        soloMargin.operate(accountInfos, operations);
    }

    /// @dev DYDX flash loan callback. Receives the token amount and gives it back + a flashFee.
    /// @param sender The msg.sender to Solo
    /// @param accountInfo The account from which the data is being sent
    /// @param data Arbitrary data given by the sender
    function callFunction(
        address sender,
        DYDXDataTypes.AccountInfo memory accountInfo,
        bytes memory data
    ) external override {
        require(msg.sender == address(soloMargin), "Callback only from SoloMargin");
        require(sender == address(this), "FlashLoan only from this contract");
        // Decode arbitrary data sent from sender
        (address token, uint256 amount, bytes memory userData) = abi.decode(data, (address, uint256, bytes));

        // This contract now has the funds requested
        // Your logic goes here

        // Approve the SoloMargin contract to pull the owed amount + flashFee
        IERC20(token).approve(address(soloMargin), amount.add(flashFee));
    }

    function getWithdrawAction(address token, uint256 amount) internal view returns (DYDXDataTypes.ActionArgs memory) {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Withdraw,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: false,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: amount
                }),
                primaryMarketId: tokenAddressToMarketId[token],
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: "" // NULL_DATA
            });
    }

    function getDepositAction(address token, uint256 repaymentAmount)
        internal
        view
        returns (DYDXDataTypes.ActionArgs memory)
    {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Deposit,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: true,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: repaymentAmount
                }),
                primaryMarketId: tokenAddressToMarketId[token],
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: "" // NULL_DATA
            });
    }

    function getCallAction(bytes memory data_) internal view returns (DYDXDataTypes.ActionArgs memory) {
        return
            DYDXDataTypes.ActionArgs({
                actionType: DYDXDataTypes.ActionType.Call,
                accountId: 0,
                amount: DYDXDataTypes.AssetAmount({
                    sign: false,
                    denomination: DYDXDataTypes.AssetDenomination.Wei,
                    ref: DYDXDataTypes.AssetReference.Delta,
                    value: 0
                }),
                primaryMarketId: 0, // NULL_MARKET_ID
                secondaryMarketId: 0, // NULL_MARKET_ID
                otherAddress: address(this),
                otherAccountId: 0, // NULL_ACCOUNT_ID
                data: data_
            });
    }
}
