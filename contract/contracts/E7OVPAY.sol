// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;


contract E7OVPAY {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);
    event Payment(uint amount, uint when);
    constructor(uint _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
       

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }

    function payment() public payable {
        require(msg.value >= 0.001 ether, "Payment should be at least 0.001 ether");
        
        emit Payment(msg.value, block.timestamp);
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

}

