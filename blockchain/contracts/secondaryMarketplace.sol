// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice On-chain settlement contract for orders stored and matched in Supabase.
 * Sellers retain tokens in their own wallet. They approve this contract when
 * listing; a buyer executes settlement only after an off-chain order match.
 */
contract EquitySecondaryMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public platformFeeBps = 200; // 2%
    address public feeTreasury;
    mapping(bytes32 => bool) public settledTrades;

    event TradeSettled(
        bytes32 indexed tradeId,
        address indexed token,
        address indexed buyer,
        address seller,
        uint256 tokenAmount,
        uint256 totalPrice,
        uint256 platformFee
    );
    event FeeTreasuryUpdated(address indexed treasury);
    event PlatformFeeUpdated(uint256 feeBps);

    constructor(address _feeTreasury) Ownable(msg.sender) {
        require(_feeTreasury != address(0), "Invalid treasury");
        feeTreasury = _feeTreasury;
    }

    /**
     * @dev The buyer calls this with exactly `amount * pricePerToken / 1e18` ETH.
     * The seller must have already approved this contract for `amount` tokens.
     * `tradeId` should be the bytes32 ID generated from the Supabase trade UUID.
     */
    function settleTrade(
        bytes32 tradeId,
        address token,
        address seller,
        uint256 amount,
        uint256 pricePerToken
    ) external payable nonReentrant {
        require(token != address(0) && seller != address(0), "Invalid address");
        require(amount > 0 && pricePerToken > 0, "Invalid trade");
        require(!settledTrades[tradeId], "Trade already settled");

        uint256 totalPrice = (amount * pricePerToken) / 1e18;
        require(totalPrice > 0 && msg.value == totalPrice, "Incorrect ETH value");

        uint256 fee = (totalPrice * platformFeeBps) / 10_000;
        settledTrades[tradeId] = true;
        IERC20(token).safeTransferFrom(seller, msg.sender, amount);
        _sendEth(feeTreasury, fee);
        _sendEth(seller, totalPrice - fee);

        emit TradeSettled(tradeId, token, msg.sender, seller, amount, totalPrice, fee);
    }

    function setFeeTreasury(address treasury) external onlyOwner {
        require(treasury != address(0), "Invalid treasury");
        feeTreasury = treasury;
        emit FeeTreasuryUpdated(treasury);
    }

    function setPlatformFeeBps(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1_000, "Fee too high");
        platformFeeBps = feeBps;
        emit PlatformFeeUpdated(feeBps);
    }

    function _sendEth(address recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}
