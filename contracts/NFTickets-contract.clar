
;; NFTickets-contract
;; NFT-based event ticket system with resale restrictions, expiration dates, and fraud protection

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-OWNER-ONLY (err u100))
(define-constant ERR-NOT-TOKEN-OWNER (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-TICKET-EXPIRED (err u103))
(define-constant ERR-TRANSFER-RESTRICTED (err u104))
(define-constant ERR-INVALID-EVENT (err u105))
(define-constant ERR-EVENT-NOT-STARTED (err u106))
(define-constant ERR-ALREADY-USED (err u107))
(define-constant ERR-UNAUTHORIZED (err u108))

;; Data Variables
(define-data-var last-token-id uint u0)
(define-data-var contract-uri (optional (string-utf8 256)) (some u"https://nftickets.com/metadata"))

;; Data Maps
;; Event information
(define-map events
  uint
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
)

;; Ticket information
(define-map tickets
  uint
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
)

;; Token metadata
(define-map token-uris uint (optional (string-utf8 256)))

;; Event organizer permissions
(define-map event-organizers principal bool)

;; NFT Definition
(define-non-fungible-token nf-ticket uint)
