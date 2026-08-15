// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice Fully on-chain order book for 18-decimal campaign ERC-20 tokens.
 * Sell orders escrow tokens and buy orders escrow ETH. Matching, settlement,
 * and cancellation all happen in this contract; no database balance is trusted.
 */
contract EquitySecondaryMarketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum Side { Buy, Sell }

    struct Order {
        address trader;
        address token;
        Side side;
        uint256 pricePerToken; // wei per whole token (1e18 token units)
        uint256 amount;
        uint256 remaining;
        bool active;
    }

    uint256 public platformFeeBps = 200; // 2%
    address public feeTreasury;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed trader,
        address indexed token,
        Side side,
        uint256 pricePerToken,
        uint256 amount
    );
    event OrderMatched(uint256 indexed sellOrderId, uint256 indexed buyOrderId, uint256 amount, uint256 totalPrice);
    event OrderCancelled(uint256 indexed orderId, address indexed trader, uint256 returnedAmount);
    event FeeTreasuryUpdated(address indexed treasury);
    event PlatformFeeUpdated(uint256 feeBps);

    constructor(address _feeTreasury) Ownable(msg.sender) {
        require(_feeTreasury != address(0), "Invalid treasury");
        feeTreasury = _feeTreasury;
    }

    function createSellOrder(address token, uint256 amount, uint256 pricePerToken)
        external
        nonReentrant
        returns (uint256 orderId)
    {
        require(token != address(0), "Invalid token");
        require(amount > 0 && pricePerToken > 0, "Invalid order");
        require(_totalPrice(amount, pricePerToken) > 0, "Order value too small");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        orderId = _createOrder(msg.sender, token, Side.Sell, amount, pricePerToken);
    }

    function createBuyOrder(address token, uint256 amount, uint256 pricePerToken)
        external
        payable
        nonReentrant
        returns (uint256 orderId)
    {
        require(token != address(0), "Invalid token");
        require(amount > 0 && pricePerToken > 0, "Invalid order");
        uint256 totalPrice = _totalPrice(amount, pricePerToken);
        require(totalPrice > 0, "Order value too small");
        require(msg.value == totalPrice, "Incorrect ETH escrow");

        orderId = _createOrder(msg.sender, token, Side.Buy, amount, pricePerToken);
    }

    /** @notice Matches a compatible sell order with a buy order using the buy escrow. */
    function matchOrders(uint256 sellOrderId, uint256 buyOrderId, uint256 amount) external nonReentrant {
        Order storage sellOrder = orders[sellOrderId];
        Order storage buyOrder = orders[buyOrderId];

        require(sellOrder.active && buyOrder.active, "Inactive order");
        require(sellOrder.side == Side.Sell && buyOrder.side == Side.Buy, "Invalid order sides");
        require(sellOrder.token == buyOrder.token, "Token mismatch");
        require(buyOrder.pricePerToken >= sellOrder.pricePerToken, "Prices do not cross");
        require(amount > 0 && amount <= sellOrder.remaining && amount <= buyOrder.remaining, "Invalid fill amount");

        // The buyer's limit price is used so its exact ETH escrow always covers the fill.
        uint256 totalPrice = _totalPrice(amount, buyOrder.pricePerToken);
        sellOrder.remaining -= amount;
        buyOrder.remaining -= amount;
        if (sellOrder.remaining == 0) sellOrder.active = false;
        if (buyOrder.remaining == 0) buyOrder.active = false;

        uint256 fee = (totalPrice * platformFeeBps) / 10_000;
        IERC20(sellOrder.token).safeTransfer(buyOrder.trader, amount);
        _sendEth(feeTreasury, fee);
        _sendEth(sellOrder.trader, totalPrice - fee);

        emit OrderMatched(sellOrderId, buyOrderId, amount, totalPrice);
    }

    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.active, "Inactive order");
        require(order.trader == msg.sender, "Not order owner");

        uint256 remaining = order.remaining;
        order.remaining = 0;
        order.active = false;

        if (order.side == Side.Sell) {
            IERC20(order.token).safeTransfer(order.trader, remaining);
        } else {
            _sendEth(order.trader, _totalPrice(remaining, order.pricePerToken));
        }
        emit OrderCancelled(orderId, order.trader, remaining);
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

    function _createOrder(address trader, address token, Side side, uint256 amount, uint256 pricePerToken)
        private
        returns (uint256 orderId)
    {
        orderId = nextOrderId++;
        orders[orderId] = Order(trader, token, side, pricePerToken, amount, amount, true);
        emit OrderCreated(orderId, trader, token, side, pricePerToken, amount);
    }

    function _totalPrice(uint256 amount, uint256 pricePerToken) private pure returns (uint256) {
        return (amount * pricePerToken) / 1e18;
    }

    function _sendEth(address recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}
