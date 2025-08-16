# 🎫 NFTickets - Blockchain Event Ticketing System

[![Stacks](https://img.shields.io/badge/Built%20on-Stacks-blue)](https://stacks.co/)
[![Clarity](https://img.shields.io/badge/Language-Clarity-purple)](https://clarity-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive NFT-based event ticketing system built on the Stacks blockchain, featuring resale restrictions, expiration dates, fraud protection, and decentralized event management.

## 🌟 Features

### Core Functionality
- **NFT-Based Tickets**: Each ticket is a unique, verifiable NFT with metadata
- **Event Management**: Decentralized system for event organizers to create and manage events
- **Resale Controls**: Configurable restrictions on ticket transfers and secondary sales
- **Expiration System**: Automatic ticket invalidation based on block height/time
- **Fraud Protection**: Built-in verification mechanisms to prevent counterfeit tickets
- **Seat Management**: Optional seat number assignment and tier-based ticketing

### Security Features
- **Role-Based Access**: Multi-level permission system for organizers and administrators
- **Transfer Restrictions**: Smart contract enforced resale policies
- **Ownership Tracking**: Complete transfer history and original buyer records
- **Admin Controls**: Emergency functions for contract management

### Anti-Fraud Mechanisms
- **Ticket Verification**: Real-time authenticity checking
- **Usage Tracking**: Prevents double-spending of tickets
- **Expiration Enforcement**: Automatic invalidation of expired tickets
- **Transfer Counting**: Monitoring of ownership changes

## 🏗️ Architecture

### Smart Contract Structure

```
NFTickets Contract
├── Constants & Error Codes
├── Data Maps
│   ├── Events (organizer, venue, date, pricing)
│   ├── Tickets (ownership, metadata, status)
│   ├── Token URIs (metadata links)
│   └── Organizer Permissions
├── Private Functions
│   ├── Expiration Checking
│   └── Transfer Validation
├── Public Functions
│   ├── Event Management
│   ├── Ticket Minting
│   ├── Transfer Controls
│   └── Admin Functions
└── Read-Only Functions
    ├── Metadata Queries
    ├── Ownership Verification
    └── Ticket Validation
```

### Data Models

#### Event Structure
```clarity
{
  organizer: principal,
  name: (string-utf8 100),
  venue: (string-utf8 100),
  event-date: uint,
  ticket-price: uint,
  max-tickets: uint,
  tickets-minted: uint,
  resale-allowed: bool,
  transfer-fee-percent: uint
}
```

#### Ticket Structure
```clarity
{
  event-id: uint,
  owner: principal,
  seat-number: (optional (string-utf8 20)),
  tier: (string-utf8 50),
  purchase-price: uint,
  expiration-date: uint,
  is-used: bool,
  transfer-count: uint,
  original-buyer: principal
}
```

## 🚀 Quick Start

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) v1.0+
- [Node.js](https://nodejs.org/) v16+
- [Stacks CLI](https://docs.stacks.co/references/stacks-cli)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/NFTickets.git
   cd NFTickets
   ```

2. **Install dependencies**
   ```bash
   clarinet install
   ```

3. **Run tests**
   ```bash
   clarinet test
   ```

4. **Check contract syntax**
   ```bash
   clarinet check
   ```

### Development Setup

1. **Start Clarinet console**
   ```bash
   clarinet console
   ```

2. **Deploy to local testnet**
   ```bash
   clarinet integrate
   ```

## 📖 Usage Guide

### For Event Organizers

#### 1. Get Authorized
```clarity
;; Contract owner must authorize you as an organizer
(contract-call? .NFTickets-contract authorize-organizer tx-sender)
```

#### 2. Create an Event
```clarity
(contract-call? .NFTickets-contract create-event
  u1                                    ;; event-id
  u"Concert 2024"                       ;; name
  u"Madison Square Garden"              ;; venue
  u1000                                 ;; event-date (block height)
  u100                                  ;; ticket-price (μSTX)
  u5000                                 ;; max-tickets
  true                                  ;; resale-allowed
  u5                                    ;; transfer-fee-percent
)
```

#### 3. Mint Tickets
```clarity
(contract-call? .NFTickets-contract mint-ticket
  u1                                    ;; event-id
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM ;; buyer address
  (some u"A12")                         ;; seat-number (optional)
  u"VIP"                                ;; tier
  u2000                                 ;; expiration-date
)
```

#### 4. Use Tickets at Event
```clarity
;; Mark ticket as used when attendee arrives
(contract-call? .NFTickets-contract use-ticket u1)
```

### For Ticket Holders

#### 1. Check Ticket Details
```clarity
(contract-call? .NFTickets-contract get-ticket-details u1)
```

#### 2. Verify Ticket Authenticity
```clarity
(contract-call? .NFTickets-contract verify-ticket u1)
```

#### 3. Transfer Ticket (if allowed)
```clarity
(contract-call? .NFTickets-contract transfer
  u1                                    ;; token-id
  tx-sender                             ;; sender (you)
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG ;; recipient
)
```

### For Contract Administrators

#### 1. Authorize New Organizers
```clarity
(contract-call? .NFTickets-contract authorize-organizer
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
)
```

#### 2. Burn Invalid Tickets
```clarity
(contract-call? .NFTickets-contract burn u1)
```

## 🧪 Testing

The project includes comprehensive tests covering all major functionality:

### Test Categories
- **Authorization Tests**: Organizer permission management
- **Event Management**: Creation, validation, and limits
- **Ticket Lifecycle**: Minting, transfer, usage, expiration
- **Resale Restrictions**: Transfer controls and validation
- **Fraud Protection**: Verification and authenticity checks
- **Admin Functions**: Emergency controls and maintenance

### Running Tests
```bash
# Run all tests
clarinet test

# Run specific test file
clarinet test tests/NFTickets-contract_test.ts

# Run with verbose output
clarinet test --verbose
```

### Test Coverage
- ✅ Event creation and management
- ✅ Ticket minting and ownership
- ✅ Transfer restrictions enforcement
- ✅ Expiration date validation
- ✅ Fraud protection mechanisms
- ✅ Admin emergency functions
- ✅ Error handling and edge cases

## 📋 API Reference

### Public Functions

#### Event Management
| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `authorize-organizer` | Grant organizer permissions | `organizer: principal` | `(response bool uint)` |
| `create-event` | Create new event | `event-id, name, venue, date, price, max-tickets, resale-allowed, fee-percent` | `(response bool uint)` |

#### Ticket Operations
| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `mint-ticket` | Create new ticket NFT | `event-id, to, seat-number, tier, expiration-date` | `(response uint uint)` |
| `transfer` | Transfer ticket ownership | `token-id, sender, recipient` | `(response bool uint)` |
| `use-ticket` | Mark ticket as used | `ticket-id` | `(response bool uint)` |

#### Admin Functions
| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `burn` | Destroy invalid ticket | `token-id` | `(response bool uint)` |
| `set-contract-uri` | Update contract metadata | `new-uri` | `(response bool uint)` |

### Read-Only Functions

| Function | Description | Parameters | Returns |
|----------|-------------|------------|---------|
| `get-ticket-details` | Get ticket information | `ticket-id` | `(optional ticket-data)` |
| `get-event-details` | Get event information | `event-id` | `(optional event-data)` |
| `get-owner` | Get ticket owner | `token-id` | `(response (optional principal) uint)` |
| `verify-ticket` | Check ticket authenticity | `ticket-id` | `(response verification-data uint)` |
| `is-authorized-organizer` | Check organizer status | `organizer` | `bool` |

## 🔒 Security Considerations

### Access Control
- **Contract Owner**: Can authorize organizers and perform emergency functions
- **Event Organizers**: Can create events, mint tickets, and mark tickets as used
- **Ticket Holders**: Can transfer tickets (subject to restrictions) and view ticket details

### Validation Layers
1. **Permission Checks**: Role-based access control
2. **Data Validation**: Input sanitization and bounds checking
3. **State Validation**: Ticket expiration and usage status
4. **Transfer Validation**: Resale policy enforcement

### Anti-Fraud Measures
- **Unique Token IDs**: Each ticket has a unique, non-reusable identifier
- **Cryptographic Verification**: Blockchain-based ownership proof
- **Transfer History**: Complete audit trail of ownership changes
- **Expiration Enforcement**: Automatic invalidation of expired tickets

## 🚀 Deployment

### Testnet Deployment

1. **Configure Clarinet.toml**
   ```toml
   [network.testnet]
   stacks-node-rpc-address = "https://stacks-node-api.testnet.stacks.co"
   ```

2. **Deploy contract**
   ```bash
   clarinet deploy --testnet
   ```

### Mainnet Deployment

1. **Update configuration**
   ```toml
   [network.mainnet]
   stacks-node-rpc-address = "https://stacks-node-api.mainnet.stacks.co"
   ```

2. **Deploy to mainnet**
   ```bash
   clarinet deploy --mainnet
   ```

## 📊 Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| u100 | `ERR-OWNER-ONLY` | Function restricted to contract owner |
| u101 | `ERR-NOT-TOKEN-OWNER` | Caller does not own the specified token |
| u102 | `ERR-NOT-FOUND` | Requested resource does not exist |
| u103 | `ERR-TICKET-EXPIRED` | Ticket has passed its expiration date |
| u104 | `ERR-TRANSFER-RESTRICTED` | Transfer not allowed by event policy |
| u105 | `ERR-INVALID-EVENT` | Event does not exist or invalid parameters |
| u106 | `ERR-EVENT-NOT-STARTED` | Attempting to use ticket before event date |
| u107 | `ERR-ALREADY-USED` | Ticket has already been used |
| u108 | `ERR-UNAUTHORIZED` | Caller lacks required permissions |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards
- Follow Clarity best practices
- Include comprehensive tests
- Document public functions
- Use consistent naming conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://clarity-lang.org/)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [SIP-009 NFT Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-standard.md)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/NFTickets/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/NFTickets/discussions)
- **Discord**: [Stacks Discord](https://discord.gg/stacks)

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Core contract implementation
- ✅ Basic testing suite
- ✅ Event and ticket management

### Phase 2 (Upcoming)
- 🔄 Frontend web application
- 🔄 Mobile app integration
- 🔄 Payment processing integration
- 🔄 Advanced analytics dashboard

### Phase 3 (Future)
- 📅 Multi-chain support
- 📅 DAO governance integration
- 📅 Revenue sharing mechanisms
- 📅 Enterprise partnership tools

---

**Built with ❤️ on Stacks blockchain**
