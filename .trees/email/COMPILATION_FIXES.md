# Email Integration Module - Compilation Fixes

## Status: 🔧 In Progress

Total Errors: ~40
- Critical: 25 (blocking compilation)
- Warnings: 8 (unused imports)
- Type Issues: 7

---

## Fix Priority

### 🔴 P0 - Critical (Must Fix First)

1. **Repository Interface Mismatches** (10 errors)
   - `findByEmail()` - Interface expects 1 param, impl has 2
   - `findBySubscriptionId()` - Interface expects `Promise<EmailAccount | null>`, impl returns `Promise<Result<>>`
   - `findAllActive()` - Interface expects `Promise<EmailAccount[]>`, impl returns `Promise<Result<>>`
   - `exists()` - Interface expects `Promise<boolean>`, impl returns `Promise<Result<>>`

2. **Event Publishing Missing Fields** (2 errors)
   - GmailHistorySyncUseCase.ts:389 - Missing `id`, `timestamp`, `version`
   - SyncEmailsUseCase.ts:218 - Missing `id`, `timestamp`, `version`

3. **ParsedMail Type Missing** (1 error)
   - SmtpProvider.ts:321 - `ParsedMail` not imported from mailparser

### 🟡 P1 - Important (Fix After P0)

4. **Duplicate Exports** (2 errors)
   - `EmailMetadata` exported twice
   - `SmtpCredentials` exported twice

5. **EmailAccount.create() Parameter Mismatch** (1 error)
   - EmailAccountPrismaMapper.ts:51 - `isActive` not in create params

6. **BullMQ API Changes** (4 errors)
   - `timeout` option doesn't exist
   - Queue event listeners API changed

### 🟢 P2 - Nice to Have (Warnings)

7. **Unused Imports** (4 warnings)
   - DisconnectAccountUseCase - NotFoundError unused
   - GetEmailUseCase - NotFoundError unused
   - SyncEmailsUseCase - NotFoundError unused
   - EmailSyncJob - messageId unused

8. **Implicit Any Types** (3 warnings)
   - SmtpProvider.ts:334 - `att` parameter
   - EmailSyncQueue.ts - job and error parameters

9. **DatabaseError Constructor** (20+ errors)
   - All `new DatabaseError(message, error)` calls
   - Should be `new DatabaseError(message, error as Error)`

---

## Execution Plan

1. ✅ Add ExternalServiceError to core
2. ✅ Add IEventPublisher to core
3. ✅ Fix imapflow imports
4. ✅ Install @types/mailparser
5. ⏳ Fix repository interfaces
6. ⏳ Fix event publishing
7. ⏳ Fix ParsedMail import
8. ⏳ Fix duplicate exports
9. ⏳ Fix EmailAccount.create
10. ⏳ Fix BullMQ types
11. ⏳ Remove unused imports
12. ⏳ Fix implicit any types
13. ⏳ Fix DatabaseError casts
14. ✅ Recompile and verify

---

Last updated: 2025-10-19
