// blockchain/contracts/TestERC20.sol
// this is a simple ERC20 token contract used for testing purposes. It allows anyone to mint tokens to any address, which is useful for simulating token transfers and balances in a test environment. This contract is not intended for production use and should not be deployed on mainnet.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
