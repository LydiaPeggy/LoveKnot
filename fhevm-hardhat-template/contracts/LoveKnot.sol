// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract LoveKnot is ZamaEthereumConfig {
    mapping(address => euint32) public crushTargets;
    mapping(address => uint256) public lastSubmissionTime;
    mapping(address => uint256) public dailyAttempts;
    mapping(address => uint256) public lastAttemptReset;
    mapping(bytes32 => bool) public matchedPairs;
    address[] public users;
    mapping(address => bool) public isUserRegistered;
    mapping(address => mapping(address => euint32)) public matchResults;
    mapping(address => mapping(address => euint32[])) public messages;
    mapping(address => mapping(address => uint256)) public messageCounts;
    
    uint256 public constant SUBMISSION_COOLDOWN = 1 hours;
    uint256 public constant MAX_DAILY_ATTEMPTS = 10;
    uint256 public constant ONE_DAY = 24 hours;
    uint256 public constant MAX_MESSAGE_LENGTH = 100;
    
    event CrushSubmitted(address indexed user, euint32 target);
    event MatchFound(address indexed userA, address indexed userB, uint256 timestamp);
    event MessageSent(address indexed from, address indexed to, uint256 messageIndex, uint256 timestamp);
    
    function submitCrush(externalEuint32 targetUint32, bytes calldata inputProof) external {
        address user = msg.sender;
        
        require(
            block.timestamp >= lastSubmissionTime[user] + SUBMISSION_COOLDOWN,
            "LoveKnot: Cooldown period not elapsed"
        );
        
        if (block.timestamp >= lastAttemptReset[user] + ONE_DAY) {
            dailyAttempts[user] = 0;
            lastAttemptReset[user] = block.timestamp;
        }
        
        require(
            dailyAttempts[user] < MAX_DAILY_ATTEMPTS,
            "LoveKnot: Daily attempt limit reached"
        );
        
        euint32 encryptedTarget = FHE.fromExternal(targetUint32, inputProof);
        crushTargets[user] = encryptedTarget;
        lastSubmissionTime[user] = block.timestamp;
        dailyAttempts[user] += 1;
        
        if (!isUserRegistered[user]) {
            users.push(user);
            isUserRegistered[user] = true;
        }
        
        FHE.allowThis(encryptedTarget);
        FHE.allow(encryptedTarget, user);
        
        emit CrushSubmitted(user, encryptedTarget);
    }
    
    function checkMatch(address otherUser) external returns (euint32) {
        address user = msg.sender;
        
        require(user != otherUser, "LoveKnot: Cannot check match with yourself");
        require(isUserRegistered[user], "LoveKnot: User not registered");
        require(isUserRegistered[otherUser], "LoveKnot: Other user not registered");
        
        uint32 userUint32 = addressToUint32(user);
        uint32 otherUserUint32 = addressToUint32(otherUser);
        euint32 encryptedUserAddr = FHE.asEuint32(userUint32);
        euint32 encryptedOtherUserAddr = FHE.asEuint32(otherUserUint32);
        
        ebool matchA = FHE.eq(crushTargets[user], encryptedOtherUserAddr);
        ebool matchB = FHE.eq(crushTargets[otherUser], encryptedUserAddr);
        ebool mutualMatch = FHE.and(matchA, matchB);
        
        euint32 resultIfMatch = FHE.asEuint32(1);
        euint32 resultIfNoMatch = FHE.asEuint32(0);
        euint32 result = FHE.select(mutualMatch, resultIfMatch, resultIfNoMatch);
        
        FHE.allowThis(result);
        FHE.allow(result, user);
        matchResults[user][otherUser] = result;
        
        return result;
    }
    
    function getMatchResult(address user, address otherUser) external view returns (euint32) {
        return matchResults[user][otherUser];
    }
    
    function getCrushTarget(address user) external view returns (euint32) {
        return crushTargets[user];
    }
    
    function getRemainingAttempts(address user) external view returns (uint256) {
        if (block.timestamp >= lastAttemptReset[user] + ONE_DAY) {
            return MAX_DAILY_ATTEMPTS;
        }
        return MAX_DAILY_ATTEMPTS - dailyAttempts[user];
    }
    
    function getNextSubmissionTime(address user) external view returns (uint256) {
        return lastSubmissionTime[user] + SUBMISSION_COOLDOWN;
    }
    
    function getUserCount() external view returns (uint256) {
        return users.length;
    }
    
    function sendMessage(
        address to,
        externalEuint32[] calldata encryptedMessage,
        bytes calldata inputProof
    ) external {
        address from = msg.sender;
        
        require(from != to, "LoveKnot: Cannot send message to yourself");
        require(encryptedMessage.length > 0, "LoveKnot: Message cannot be empty");
        require(encryptedMessage.length <= MAX_MESSAGE_LENGTH, "LoveKnot: Message too long");
        
        if (!isUserRegistered[from]) {
            users.push(from);
            isUserRegistered[from] = true;
        }
        
        if (!isUserRegistered[to]) {
            users.push(to);
            isUserRegistered[to] = true;
        }
        
        for (uint256 i = 0; i < encryptedMessage.length; i++) {
            euint32 messageChunk = FHE.fromExternal(encryptedMessage[i], inputProof);
            messages[from][to].push(messageChunk);
            FHE.allowThis(messageChunk);
            FHE.allow(messageChunk, from);
            FHE.allow(messageChunk, to);
        }
        
        messageCounts[from][to] = messages[from][to].length;
        emit MessageSent(from, to, messageCounts[from][to] - 1, block.timestamp);
    }
    
    function getMessages(address from, address to) external view returns (euint32[] memory) {
        return messages[from][to];
    }
    
    function getMessageCount(address from, address to) external view returns (uint256) {
        return messageCounts[from][to];
    }
    
    function areMatched(address userA, address userB) external returns (euint32) {
        if (userA == userB || !isUserRegistered[userA] || !isUserRegistered[userB]) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            return zero;
        }
        euint32 result = matchResults[userA][userB];
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        return result;
    }
    
    function addressToUint32(address addr) internal pure returns (uint32) {
        uint256 addrUint = uint256(uint160(addr));
        return uint32(addrUint & 0xFFFFFFFF);
    }
}

