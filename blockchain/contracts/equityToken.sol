// blockchain/contracts/equityToken.sol
//this is the equity token contract that will be deployed for each business campaign. It is an ERC20 token that represents equity in the business. The BusinessCampaign contract will be the only contract that can mint new tokens, and it will do so based on the contributions made by investors.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EquityToken is ERC20 {
    address public campaignManager; // Stores the address of the BusinessCampaign contract that manages this token

    modifier onlyCampaign() {
        require(msg.sender == campaignManager, "Only the campaign contract can mint");
        _;}

    constructor(
        string memory name, 
        string memory symbol, 
        address _campaignManager
    ) ERC20(name, symbol) {
        campaignManager = _campaignManager;
    }

    // This function is hooked into and called by your BusinessCampaign contract
    function mintEquity(address to, uint256 amount) external onlyCampaign {
        _mint(to, amount); //save gas amount by not minting specific amount of tokens, instead minting based on the contribution amount in the BusinessCampaign contract
    }
}