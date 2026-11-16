# Security Specification — Tyme of Beauty Firestore Rules

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`sessions`, `messages`, `memories`, `docChunks`, `submissions`) belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. Subcollection documents cannot be orphaned: creating a `session`, `memory`, `docChunk`, or `submission` requires `/users/{userId}` to exist (`exists(...)`), and creating a `message` requires its parent `session` document to exist.
3. All document IDs (`userId`, `sessionId`, `messageId`, `memoryId`, `chunkId`, `submissionId`) must satisfy `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. All `createdAt` and `updatedAt` timestamps must match `request.time`; `createdAt` and `userId`/`uid`/`id` are immutable on update.
5. Every write strictly enforces `keys().hasAll(...) && keys().hasOnly(...)` and type + size bounds (`size() <= max`) to prevent shadow fields and resource exhaustion.
6. Every `allow list` rule strictly evaluates `resource.data.userId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write**: `request.auth == null` reading `/users/u1/sessions/s1`.
2. **Unverified email write**: `email_verified: false` creating `/users/u1`.
3. **Cross-user access (PII / private vector leak)**: User `u2` reading `/users/u1` or `/users/u1/docChunks/c1`.
4. **Identity spoofing**: User `u1` writing `/users/u1/sessions/s1` with `userId: "u2"`.
5. **Shadow field injection**: User `u1` creating `/users/u1` with an extra field `isAdmin: true`.
6. **Oversized ID poisoning**: User `u1` writing `/users/u1/memories/${'a'.repeat(200)}`.
7. **Timestamp forgery**: User `u1` creating `/users/u1/sessions/s1` with a past client timestamp instead of `request.time`.
8. **Immutable field mutation**: User `u1` updating `/users/u1/sessions/s1` to change `userId` or `createdAt`.
9. **Value type poisoning**: User `u1` writing `/users/u1/docChunks/c1` with `embedding: ["not-a-number"]` or `embedding: []`.
10. **Oversized string DoW attack**: User `u1` writing `/users/u1/sessions/s1/messages/m1` with `content` > 32,000 chars.
11. **Orphaned subcollection write**: User `u1` creating `/users/u1/sessions/s1/messages/m1` when `/users/u1/sessions/s1` does not exist.
12. **Unconstrained update key**: User `u1` updating `/users/u1/memories/mem1` attempting to modify `id` alongside `fact`.
