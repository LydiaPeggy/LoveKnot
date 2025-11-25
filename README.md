# LoveKnot

A privacy-preserving decentralized application built with FHEVM (Fully Homomorphic Encryption Virtual Machine) that enables users to submit encrypted crush targets and discover mutual matches without revealing their preferences until a match is found.

## Overview

LoveKnot is a blockchain-based matching platform that leverages fully homomorphic encryption to protect user privacy. Users can submit encrypted crush targets, check for mutual matches, and send encrypted messages to matched users, all while keeping their preferences private until a match occurs.

## Features

- **Encrypted Crush Submission**: Submit crush targets using fully homomorphic encryption
- **Mutual Match Detection**: Check for mutual matches without revealing individual preferences
- **Encrypted Messaging**: Send encrypted messages to matched users
- **Rate Limiting**: Cooldown periods and daily attempt limits to prevent abuse
- **Privacy-First**: All sensitive data remains encrypted on-chain

## Project Structure

```
LoveKnot/
├── fhevm-hardhat-template/    # Smart contracts and deployment scripts
│   ├── contracts/             # Solidity smart contracts
│   │   └── LoveKnot.sol       # Main contract
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
└── loveknot-frontend/         # Next.js frontend application
    ├── app/                   # Next.js app directory
    ├── components/            # React components
    ├── hooks/                 # Custom React hooks
    ├── fhevm/                 # FHEVM integration utilities
    └── scripts/               # Build and utility scripts
```

## Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Hardhat**: For local development and testing
- **MetaMask** or compatible Web3 wallet

## Installation

### Smart Contracts

1. Navigate to the contracts directory:
   ```bash
   cd fhevm-hardhat-template
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   ```

4. Compile contracts:
   ```bash
   npm run compile
   ```

5. Run tests:
   ```bash
   npm run test
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd loveknot-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate ABI files:
   ```bash
   npm run genabi
   ```

4. Run development server (with mock):
   ```bash
   npm run dev:mock
   ```

   Or run with real relayer:
   ```bash
   npm run dev
   ```

## Development

### Local Development

1. Start a local Hardhat node:
   ```bash
   cd fhevm-hardhat-template
   npx hardhat node
   ```

2. Deploy contracts to local network:
   ```bash
   npx hardhat deploy --network localhost
   ```

3. Start frontend with mock relayer:
   ```bash
   cd loveknot-frontend
   npm run dev:mock
   ```

### Testing

Run contract tests:
```bash
cd fhevm-hardhat-template
npm run test
```

Run frontend build check:
```bash
cd loveknot-frontend
npm run check:static
npm run build
```

## Deployment

### Deploy to Sepolia Testnet

1. Deploy contracts:
   ```bash
   cd fhevm-hardhat-template
   npx hardhat deploy --network sepolia
   ```

2. Update frontend ABI and addresses:
   ```bash
   cd loveknot-frontend
   npm run genabi
   ```

3. Build frontend:
   ```bash
   npm run build
   ```

## Smart Contract Functions

- `submitCrush()`: Submit an encrypted crush target
- `checkMatch()`: Check for mutual match with another user
- `sendMessage()`: Send encrypted message to another user
- `getMatchResult()`: Retrieve match result between two users
- `getMessages()`: Retrieve messages between two users

## Security Considerations

- All sensitive data is encrypted using FHEVM
- Rate limiting prevents abuse
- Cooldown periods between submissions
- Daily attempt limits

## License

This project is licensed under the BSD-3-Clause-Clear License.

## Support

For issues and questions, please open an issue on GitHub.
