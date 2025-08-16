
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

;; Private Functions

;; Check if ticket has expired
(define-private (is-ticket-expired (ticket-id uint))
  (let ((ticket-data (unwrap! (map-get? tickets ticket-id) false)))
    (> block-height (get expiration-date ticket-data))
  )
)

;; Check if transfer is allowed based on event settings
(define-private (is-transfer-allowed (ticket-id uint) (from principal) (to principal))
  (let (
    (ticket-data (unwrap! (map-get? tickets ticket-id) false))
    (event-data (unwrap! (map-get? events (get event-id ticket-data)) false))
  )
    (and
      (not (is-ticket-expired ticket-id))
      (not (get is-used ticket-data))
      (or 
        (get resale-allowed event-data)
        (is-eq from (get organizer event-data))
        (is-eq to (get original-buyer ticket-data))
      )
    )
  )
)

;; Read-only Functions

;; Get last token ID
(define-read-only (get-last-token-id)
  (var-get last-token-id)
)

;; Get token URI
(define-read-only (get-token-uri (token-id uint))
  (map-get? token-uris token-id)
)

;; Get token owner
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? nf-ticket token-id))
)

;; Get contract URI
(define-read-only (get-contract-uri)
  (ok (var-get contract-uri))
)

;; Get ticket details
(define-read-only (get-ticket-details (ticket-id uint))
  (map-get? tickets ticket-id)
)

;; Get event details
(define-read-only (get-event-details (event-id uint))
  (map-get? events event-id)
)

;; Check if user is authorized organizer
(define-read-only (is-authorized-organizer (organizer principal))
  (default-to false (map-get? event-organizers organizer))
)

;; Public Functions

;; Authorize event organizer (admin only)
(define-public (authorize-organizer (organizer principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (map-set event-organizers organizer true))
  )
)

;; Create new event
(define-public (create-event 
  (event-id uint)
  (name (string-utf8 100))
  (venue (string-utf8 100))
  (event-date uint)
  (ticket-price uint)
  (max-tickets uint)
  (resale-allowed bool)
  (transfer-fee-percent uint)
)
  (begin
    (asserts! (is-authorized-organizer tx-sender) ERR-UNAUTHORIZED)
    (asserts! (is-none (map-get? events event-id)) ERR-INVALID-EVENT)
    (ok (map-set events event-id {
      organizer: tx-sender,
      name: name,
      venue: venue,
      event-date: event-date,
      ticket-price: ticket-price,
      max-tickets: max-tickets,
      tickets-minted: u0,
      resale-allowed: resale-allowed,
      transfer-fee-percent: transfer-fee-percent
    }))
  )
)

;; Mint ticket
(define-public (mint-ticket 
  (event-id uint)
  (to principal)
  (seat-number (optional (string-utf8 20)))
  (tier (string-utf8 50))
  (expiration-date uint)
)
  (let (
    (token-id (+ (var-get last-token-id) u1))
    (event-data (unwrap! (map-get? events event-id) ERR-INVALID-EVENT))
  )
    (begin
      (asserts! (is-eq tx-sender (get organizer event-data)) ERR-UNAUTHORIZED)
      (asserts! (< (get tickets-minted event-data) (get max-tickets event-data)) ERR-INVALID-EVENT)
      
      ;; Mint NFT
      (try! (nft-mint? nf-ticket token-id to))
      
      ;; Update last token ID
      (var-set last-token-id token-id)
      
      ;; Store ticket data
      (map-set tickets token-id {
        event-id: event-id,
        owner: to,
        seat-number: seat-number,
        tier: tier,
        purchase-price: (get ticket-price event-data),
        expiration-date: expiration-date,
        is-used: false,
        transfer-count: u0,
        original-buyer: to
      })
      
      ;; Update event tickets minted count
      (map-set events event-id (merge event-data {
        tickets-minted: (+ (get tickets-minted event-data) u1)
      }))
      
      ;; Set token URI
      (map-set token-uris token-id (some u"https://nftickets.com/metadata/"))
      
      (ok token-id)
    )
  )
)

;; Use ticket (mark as used)
(define-public (use-ticket (ticket-id uint))
  (let (
    (ticket-data (unwrap! (map-get? tickets ticket-id) ERR-NOT-FOUND))
    (event-data (unwrap! (map-get? events (get event-id ticket-data)) ERR-INVALID-EVENT))
  )
    (begin
      (asserts! (is-eq tx-sender (get organizer event-data)) ERR-UNAUTHORIZED)
      (asserts! (not (is-ticket-expired ticket-id)) ERR-TICKET-EXPIRED)
      (asserts! (not (get is-used ticket-data)) ERR-ALREADY-USED)
      (asserts! (>= block-height (get event-date event-data)) ERR-EVENT-NOT-STARTED)
      
      ;; Mark ticket as used
      (map-set tickets ticket-id (merge ticket-data {
        is-used: true
      }))
      
      (ok true)
    )
  )
)

;; Transfer ticket with restrictions
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (let (
    (ticket-data (unwrap! (map-get? tickets token-id) ERR-NOT-FOUND))
  )
    (begin
      (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
      (asserts! (is-transfer-allowed token-id sender recipient) ERR-TRANSFER-RESTRICTED)
      
      ;; Execute transfer
      (try! (nft-transfer? nf-ticket token-id sender recipient))
      
      ;; Update ticket owner and increment transfer count
      (map-set tickets token-id (merge ticket-data {
        owner: recipient,
        transfer-count: (+ (get transfer-count ticket-data) u1)
      }))
      
      (ok true)
    )
  )
)

;; Verify ticket authenticity - fraud protection
(define-read-only (verify-ticket (ticket-id uint))
  (let (
    (ticket-data (unwrap! (map-get? tickets ticket-id) ERR-NOT-FOUND))
    (owner (unwrap! (nft-get-owner? nf-ticket ticket-id) ERR-NOT-FOUND))
  )
    (ok {
      is-valid: (and (not (is-ticket-expired ticket-id)) (not (get is-used ticket-data))),
      owner: owner,
      ticket-data: ticket-data
    })
  )
)

;; Admin Functions

;; Set contract URI (admin only)
(define-public (set-contract-uri (new-uri (optional (string-utf8 256))))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
    (ok (var-set contract-uri new-uri))
  )
)

;; Burn expired or invalid tickets (admin only)
(define-public (burn (token-id uint))
  (let (
    (ticket-data (unwrap! (map-get? tickets token-id) ERR-NOT-FOUND))
    (owner (unwrap! (nft-get-owner? nf-ticket token-id) ERR-NOT-FOUND))
  )
    (begin
      (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-OWNER-ONLY)
      (try! (nft-burn? nf-ticket token-id owner))
      (map-delete tickets token-id)
      (map-delete token-uris token-id)
      (ok true)
    )
  )
)
