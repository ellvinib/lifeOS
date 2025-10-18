# Email Integration Module - Complete Implementation Plan

**Date:** 2025-10-18
**Status:** 📋 **Planning Complete - Ready for Implementation**

---

## 🎯 Goal

Complete the Outlook email integration for LifeOS by implementing:
1. ✅ Account connection (DONE)
2. ⚠️ Database persistence (TODO)
3. ⚠️ Email sync workflow (TODO)
4. ⚠️ Background job processing (TODO)
5. ⚠️ Module integration (TODO)

---

## 📊 Implementation Phases

### **Phase 1: Database Foundation** (Tasks 1-3)

**Critical Path** - Everything else depends on this!

**Task 1:** Create Prisma schema for `email_accounts` table
- Fields: id, userId, provider, email, emailName, isActive, lastSyncedAt, providerData (JSON), encryptedCredentials, timestamps
- Indexes: userId, provider, subscriptionId (in providerData)
- Estimated: 30 minutes

**Task 2:** Create Prisma schema for `emails` table (metadata only)
- Fields: id, accountId, providerMessageId, provider, from, fromName, to[], subject, snippet, hasAttachments, timestamp, labels[], timestamps
- Indexes: accountId, providerMessageId, timestamp, from
- Unique: (accountId, providerMessageId)
- Estimated: 30 minutes

**Task 3:** Run Prisma migration
- `npx prisma migrate dev --name add_email_integration`
- Verify with Prisma Studio
- Estimated: 15 minutes

**Phase 1 Total:** ~75 minutes

---

### **Phase 2: Repository Layer** (Tasks 4-9)

**Depends on:** Phase 1 (Prisma schema)

**Task 4:** Create Email domain entity
- Rich domain model with business logic
- Methods: isFromDomain(), containsKeyword(), isOlderThan(), needsProcessing()
- Immutable value object pattern
- ~250 lines
- Estimated: 60 minutes

**Task 5:** Create IEmailRepository interface
- Repository pattern interface
- Methods: findById, findByAccount, create, update, delete, search
- Result<T, E> return types
- ~80 lines
- Estimated: 30 minutes

**Task 6:** Create Prisma ↔ Domain mappers for EmailAccount
- EmailAccountPrismaMapper.toDomain()
- EmailAccountPrismaMapper.toPersistence()
- Handle JSON serialization for providerData
- ~100 lines
- Estimated: 45 minutes

**Task 7:** Implement EmailAccountRepository with Prisma
- All CRUD operations
- Query methods: findBySubscriptionId, findByUser, findAllActive
- Error wrapping: Prisma errors → Result<T, E>
- ~300 lines
- Estimated: 90 minutes

**Task 8:** Create Prisma ↔ Domain mappers for Email
- EmailPrismaMapper.toDomain()
- EmailPrismaMapper.toPersistence()
- Handle array fields (to, labels)
- ~100 lines
- Estimated: 45 minutes

**Task 9:** Implement EmailRepository with Prisma
- All CRUD operations
- Query methods: findByAccount, searchByFilters
- Pagination support
- ~250 lines
- Estimated: 90 minutes

**Phase 2 Total:** ~360 minutes (~6 hours)

---

### **Phase 3: Application Layer** (Tasks 10-12)

**Depends on:** Phase 2 (Repositories + Email entity)

**Task 10:** Create Email DTOs and mappers
- EmailDTO, EmailListResponseDTO
- EmailMapper.fromEntity(), toResponseDTO()
- ~80 lines
- Estimated: 30 minutes

**Task 11:** Create SyncEmailsUseCase
- Workflow:
  1. Get account from repository
  2. Get provider (OutlookProvider)
  3. Fetch email metadata since last sync
  4. For each email:
     - Create Email entity
     - Save to repository
     - Publish EmailReceived event
  5. Update account.lastSyncedAt
- ~200 lines
- Estimated: 90 minutes

**Task 12:** Create GetEmailUseCase (lazy loading)
- Check repository for metadata
- Fetch full content from provider
- Cache in Redis (1-hour TTL)
- Return full EmailContent
- ~120 lines
- Estimated: 60 minutes

**Phase 3 Total:** ~180 minutes (~3 hours)

---

### **Phase 4: Background Jobs** (Tasks 13-15)

**Depends on:** Phase 3 (SyncEmailsUseCase)

**Task 13:** Setup BullMQ queue configuration
- Create email-sync queue
- Configure Redis connection
- Setup worker concurrency (5 concurrent jobs)
- Error handling and retry logic
- ~80 lines
- Estimated: 45 minutes

**Task 14:** Create EmailSyncJob worker
- Process email-sync jobs
- Call SyncEmailsUseCase
- Handle job failures (retry with exponential backoff)
- Log job metrics
- ~100 lines
- Estimated: 60 minutes

**Task 15:** Update OutlookWebhookHandler to use queue
- Replace direct sync call with queue.add()
- Return HTTP 202 immediately (non-blocking)
- Pass messageId to job payload
- ~20 lines changed
- Estimated: 15 minutes

**Phase 4 Total:** ~120 minutes (~2 hours)

---

### **Phase 5: Module Integration** (Tasks 16-19)

**Depends on:** All previous phases

**Task 16:** Create EmailIntegrationModule main class
- Implement IModule interface
- Lifecycle: initialize(), shutdown()
- Provide: getRoutes(), getEventHandlers(), healthCheck()
- ~200 lines
- Estimated: 90 minutes

**Task 17:** Setup dependency injection container
- Factory pattern for creating instances
- Wire all dependencies:
  - Prisma client
  - Repositories
  - Connection managers
  - Use cases
  - Controllers
  - Webhook handlers
  - Job workers
- ~150 lines
- Estimated: 60 minutes

**Task 18:** Wire EventBus integration
- Publish EmailReceived events in SyncEmailsUseCase
- Include metadata in event payload
- Test event reception in Finance module
- ~30 lines
- Estimated: 30 minutes

**Task 19:** Create module manifest (module.json)
- Name, version, description
- Dependencies (core)
- Events (publishes: EmailReceived, AccountConnected)
- Permissions (email.read, network.access)
- ~30 lines
- Estimated: 15 minutes

**Phase 5 Total:** ~195 minutes (~3.5 hours)

---

### **Phase 6: Testing** (Tasks 20-24)

**Depends on:** Phase 5 (Complete implementation)

**Task 20:** Unit tests for Email entity
- Test isFromDomain(), containsKeyword(), isOlderThan()
- Test entity creation and validation
- ~100 lines
- Estimated: 45 minutes

**Task 21:** Unit tests for repositories
- Mock Prisma client
- Test CRUD operations
- Test error handling
- ~200 lines
- Estimated: 90 minutes

**Task 22:** Unit tests for SyncEmailsUseCase
- Mock repository, provider, eventBus
- Test sync workflow
- Test error scenarios
- ~150 lines
- Estimated: 60 minutes

**Task 23:** Integration test for webhook → queue → sync
- Mock webhook POST
- Verify job added to queue
- Verify sync executed
- Verify event published
- ~100 lines
- Estimated: 60 minutes

**Task 24:** E2E test for complete Outlook flow
- Connect account (mock OAuth)
- Receive webhook
- Sync emails
- Verify metadata stored
- ~150 lines
- Estimated: 90 minutes

**Phase 6 Total:** ~345 minutes (~6 hours)

---

### **Phase 7: Documentation** (Task 25)

**Task 25:** Update documentation
- Add complete usage examples
- Add deployment guide
- Add troubleshooting section
- Update API reference
- Estimated: 60 minutes

---

## 📈 Total Effort Estimate

| Phase | Tasks | Time Estimate |
|-------|-------|---------------|
| **Phase 1: Database** | 3 | ~1.5 hours |
| **Phase 2: Repositories** | 6 | ~6 hours |
| **Phase 3: Application Layer** | 3 | ~3 hours |
| **Phase 4: Background Jobs** | 3 | ~2 hours |
| **Phase 5: Module Integration** | 4 | ~3.5 hours |
| **Phase 6: Testing** | 5 | ~6 hours |
| **Phase 7: Documentation** | 1 | ~1 hour |
| **TOTAL** | **25 tasks** | **~23 hours** |

**Realistic Timeline:** 3-4 full working days

---

## 🔗 Task Dependencies

```
Phase 1 (Database)
  ↓
Phase 2 (Repositories)
  ↓
Phase 3 (Application Layer)
  ↓
Phase 4 (Background Jobs)
  ↓
Phase 5 (Module Integration)
  ↓
Phase 6 (Testing)
  ↓
Phase 7 (Documentation)
```

**Critical Path:**
1. Prisma schema (blocks everything)
2. Repositories (blocks use cases)
3. SyncEmailsUseCase (blocks jobs)
4. Jobs (blocks module integration)

**Can be done in parallel:**
- Email entity (during repository implementation)
- DTOs (during use case implementation)
- Module manifest (anytime)

---

## ✅ Completion Criteria

### **Functional Requirements**
- ✅ User can connect Outlook account via API
- ✅ Webhook receives Microsoft Graph notifications
- ✅ Email metadata synced to database automatically
- ✅ EmailReceived event published to EventBus
- ✅ Finance module can subscribe and process emails
- ✅ User can list connected accounts
- ✅ User can disconnect account
- ✅ Subscription auto-renewal works (daily job)

### **Non-Functional Requirements**
- ✅ Webhook responds in < 200ms (non-blocking)
- ✅ Email sync completes in < 5 seconds for 50 emails
- ✅ Storage: ~200 bytes per email (metadata only)
- ✅ API quota usage: < 100 calls/day per account
- ✅ Test coverage: > 80%
- ✅ Zero downtime during subscription renewal

### **Architecture Requirements**
- ✅ Clean architecture (4 layers)
- ✅ SOLID principles applied
- ✅ Result<T, E> error handling
- ✅ Event-driven communication
- ✅ Background worker pattern
- ✅ Lazy loading pattern

---

## 🚧 Known Challenges

### **1. Credential Encryption**
**Issue:** Currently using JSON.stringify (INSECURE)
**Solution:** Implement proper encryption with KMS or vault
**Priority:** HIGH
**Effort:** 2-3 hours

### **2. OAuth Token Refresh**
**Issue:** Access tokens expire, need refresh mechanism
**Solution:** Implement token refresh job
**Priority:** MEDIUM
**Effort:** 2 hours

### **3. Webhook URL in Development**
**Issue:** Microsoft requires HTTPS public URL
**Solution:** Use ngrok or cloudflare tunnel for development
**Priority:** MEDIUM
**Effort:** 30 minutes

### **4. EventBus Type Safety**
**Issue:** Events are weakly typed (unknown payload)
**Solution:** Create typed event classes
**Priority:** LOW
**Effort:** 1 hour

---

## 🔄 Iterative Implementation Strategy

### **Iteration 1: Minimal Viable Product (MVP)**
**Goal:** Basic email sync working end-to-end
**Tasks:** 1-15, 18 (skip tests initially)
**Effort:** ~15 hours
**Deliverable:** Can connect account, receive webhook, sync emails

### **Iteration 2: Module Integration**
**Goal:** Proper module with DI and events
**Tasks:** 16-19
**Effort:** ~3.5 hours
**Deliverable:** EmailIntegrationModule works in LifeOS

### **Iteration 3: Testing & Quality**
**Goal:** Production-ready quality
**Tasks:** 20-24
**Effort:** ~6 hours
**Deliverable:** >80% test coverage, CI/CD ready

### **Iteration 4: Documentation & Polish**
**Goal:** Developer-friendly
**Tasks:** 25
**Effort:** ~1 hour
**Deliverable:** Complete documentation

---

## 📝 Notes

- **Database migrations:** Run in development first, then staging, then production
- **Redis:** Required for BullMQ and caching
- **Prisma Client:** Regenerate after schema changes (`npx prisma generate`)
- **Microsoft Graph API:** Rate limits are per-user, not per-app
- **Webhook validation:** Test with ngrok before production deployment

---

## 🎯 Success Metrics

After completion, we should be able to:

1. **Connect Outlook account** in < 5 seconds
2. **Receive webhook** within 1-2 seconds of email arrival
3. **Sync 100 emails** in < 10 seconds
4. **Store metadata** using < 20 KB per 100 emails
5. **Process events** in Finance module within 5 seconds
6. **Auto-renew subscriptions** without downtime
7. **Handle 10,000 emails/day** per account without issues

---

**Last Updated:** 2025-10-18
**Ready to Start:** YES ✅
**Estimated Completion:** 3-4 working days
