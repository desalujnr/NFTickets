
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const CONTRACT_NAME = 'NFTickets-contract';

Clarinet.test({
    name: "Can authorize event organizer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify organizer is authorized
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'is-authorized-organizer', [
            types.principal(organizer.address)
        ], deployer.address);
        
        assertEquals(result.result, 'true');
    },
});

Clarinet.test({
    name: "Can create event as authorized organizer",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        
        // First authorize organizer
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address)
        ]);
        
        // Create event
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1), // event-id
                types.utf8("Concert 2024"), // name
                types.utf8("Madison Square Garden"), // venue
                types.uint(1000), // event-date (block height)
                types.uint(100), // ticket-price
                types.uint(1000), // max-tickets
                types.bool(true), // resale-allowed
                types.uint(5) // transfer-fee-percent
            ], organizer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify event was created
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'get-event-details', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result.includes('Concert 2024'), true);
    },
});

Clarinet.test({
    name: "Cannot create event as unauthorized user",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const unauthorized = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], unauthorized.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u108)'); // ERR-UNAUTHORIZED
    },
});

Clarinet.test({
    name: "Can mint tickets for event",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        // Authorize organizer and create event
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address)
        ]);
        
        // Mint ticket
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1), // event-id
                types.principal(buyer.address), // to
                types.some(types.utf8("A12")), // seat-number
                types.utf8("VIP"), // tier
                types.uint(2000) // expiration-date
            ], organizer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)'); // Returns token ID 1
        
        // Verify ticket ownership
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'get-owner', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result.includes(buyer.address), true);
    },
});

Clarinet.test({
    name: "Can transfer ticket when resale allowed",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const newBuyer = accounts.get('wallet_3')!;
        
        // Setup: authorize, create event, mint ticket
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true), // resale allowed
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Transfer ticket
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'transfer', [
                types.uint(1), // token-id
                types.principal(buyer.address), // sender
                types.principal(newBuyer.address) // recipient
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify new ownership
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'get-owner', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result.includes(newBuyer.address), true);
    },
});

Clarinet.test({
    name: "Cannot transfer ticket when resale not allowed",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const newBuyer = accounts.get('wallet_3')!;
        
        // Setup with resale not allowed
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(false), // resale NOT allowed
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Attempt transfer (should fail)
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'transfer', [
                types.uint(1),
                types.principal(buyer.address),
                types.principal(newBuyer.address)
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // ERR-TRANSFER-RESTRICTED
    },
});

Clarinet.test({
    name: "Can use valid ticket",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        // Setup
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(100), // event date in past (block 100)
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Mine blocks to simulate time passing (event date)
        chain.mineEmptyBlockUntil(150);
        
        // Use ticket
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'use-ticket', [
                types.uint(1)
            ], organizer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify ticket is marked as used
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'get-ticket-details', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result.includes('is-used: true'), true);
    },
});

Clarinet.test({
    name: "Cannot use ticket before event starts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        // Setup with future event date
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000), // future event date
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Try to use ticket before event (should fail)
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'use-ticket', [
                types.uint(1)
            ], organizer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u106)'); // ERR-EVENT-NOT-STARTED
    },
});

Clarinet.test({
    name: "Can verify ticket authenticity",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        // Setup
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Verify ticket
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'verify-ticket', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result.includes('is-valid: true'), true);
        assertEquals(result.result.includes(buyer.address), true);
    },
});

Clarinet.test({
    name: "Cannot transfer expired ticket",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        const newBuyer = accounts.get('wallet_3')!;
        
        // Setup with early expiration
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(10) // expires at block 10
            ], organizer.address)
        ]);
        
        // Mine blocks past expiration
        chain.mineEmptyBlockUntil(15);
        
        // Try to transfer expired ticket (should fail)
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'transfer', [
                types.uint(1),
                types.principal(buyer.address),
                types.principal(newBuyer.address)
            ], buyer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // ERR-TRANSFER-RESTRICTED
    },
});

Clarinet.test({
    name: "Contract owner can burn tickets",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const organizer = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;
        
        // Setup
        let block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'authorize-organizer', [
                types.principal(organizer.address)
            ], deployer.address),
            Tx.contractCall(CONTRACT_NAME, 'create-event', [
                types.uint(1),
                types.utf8("Concert 2024"),
                types.utf8("Madison Square Garden"),
                types.uint(1000),
                types.uint(100),
                types.uint(1000),
                types.bool(true),
                types.uint(5)
            ], organizer.address),
            Tx.contractCall(CONTRACT_NAME, 'mint-ticket', [
                types.uint(1),
                types.principal(buyer.address),
                types.some(types.utf8("A12")),
                types.utf8("VIP"),
                types.uint(2000)
            ], organizer.address)
        ]);
        
        // Burn ticket
        block = chain.mineBlock([
            Tx.contractCall(CONTRACT_NAME, 'burn', [
                types.uint(1)
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Verify ticket no longer exists
        let result = chain.callReadOnlyFn(CONTRACT_NAME, 'get-owner', [
            types.uint(1)
        ], deployer.address);
        
        assertEquals(result.result, '(ok none)');
    },
});
