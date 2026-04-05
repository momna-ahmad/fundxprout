// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./businessCampaign.sol";

contract CampaignFactory {
    BusinessCampaign[] public deployedCampaigns;

    // ✅ Add this event
    event CampaignCreated(address campaignAddress, address owner);

    function createCampaign(
        string memory _name,
        uint256 _fundingGoal,
        uint256 _durationInDays,
        uint256 _pricePerToken
    ) public {
        BusinessCampaign newCampaign = new BusinessCampaign(
            _name,
            _fundingGoal,
            _durationInDays,
            _pricePerToken
        );
        deployedCampaigns.push(newCampaign);

        // ✅ Emit so the frontend can read the deployed address (hafsa)
        emit CampaignCreated(address(newCampaign), msg.sender);
    }
}