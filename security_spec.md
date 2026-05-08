# Security Specification - FlashStudy

## Data Invariants
1. A user can only read/write their own profile (`/users/{userId}`).
2. A user can only read/write decks within their own path (`/users/{userId}/decks/{deckId}`).
3. Every deck must have a `creatorId` that matches the authenticated user's UID.
4. Timestamps (`updatedAt`, `lastStudied`) must be validated against `request.time` where applicable.

## The "Dirty Dozen" Payloads

1. **Identity Theft (Profile):** Try to write to `/users/another-uid` as `test-uid`.
2. **Identity Theft (Deck):** Try to write to `/users/another-uid/decks/deck-1` as `test-uid`.
3. **Shadow Update (Profile):** Add a `isVerified: true` field to profile.
4. **Shadow Update (Deck):** Add `isGlobal: true` field to a deck.
5. **Orphaned Deck:** Create a deck in `test-uid`'s collection but with `creatorId: 'someone-else'`.
6. **Integrity Breach:** Set `progress` to `1.5` (outside 0-1 range).
7. **Resource Poisoning:** Send a 1MB string as a deck name.
8. **Malicious ID:** Use `../../secrets` as a `deckId`.
9. **Unverified Write:** Attempt write with `email_verified: false` (if strict verification is required).
10. **Immutable Field Attack:** Try to change `createdAt` on an existing deck.
11. **Type Mismatch:** Send an integer for `name`.
12. **Status Shortcut:** Increment `progress` without updating `lastStudied`.

## Test Plan
- Use `firebase-rules-test` plugin.
- Verify `PERMISSION_DENIED` for all malicious payloads.
- Verify `ALLOW` for valid operations on own data.
