# LifeOS - Architecture Documentation

## Project Overview
LifeOS is a comprehensive life management system that helps users track and manage all aspects of their life through modular, extensible architecture with AI-powered insights.

## Architecture Decisions

### Date: 2025-10-13

#### 1. Architecture Pattern: Event-Driven Modular Monolith
**Decision:** Use modular monolith with event-driven communication
**Rationale:**
- Simpler deployment than microservices
- Easier to develop and debug
- Loose coupling through events
- Can be extracted to microservices later if needed
- Perfect for single-user/small-scale deployments

#### 2. Tech Stack
**Backend:**
- Node.js + TypeScript (v20+)
- Express (API server)
- PostgreSQL 15+ (structured data + JSONB for flexibility)
- Redis (caching + job queues)

**Frontend:**
- Next.js 14 (App Router)
- React 18+
- TailwindCSS
- TanStack Query (server state)
- Zustand (client state)

**API:**
- GraphQL (Apollo Server)
- REST fallback for simple operations
- WebSocket for real-time

**AI:**
- MCP (Model Context Protocol)
- Vector DB (ChromaDB/Pinecone)
- OpenAI/Anthropic for LLM

**Tooling:**
- Turborepo (monorepo management)
- Docker Compose (deployment)
- BullMQ (background jobs)
- Vitest (testing)
- ESLint + Prettier (code quality)

#### 3. Clean Architecture Layers
```
Presentation Layer (UI, API Controllers)
        ↓
Application Layer (Use Cases, Services)
        ↓
Domain Layer (Entities, Value Objects, Domain Events)
        ↓
Infrastructure Layer (Database, External APIs)
```

**Dependencies point inward** - Domain knows nothing about infrastructure

#### 4. Design Patterns Applied

**Module System:**
- Strategy Pattern: Modules implement IModule interface
- Factory Pattern: ModuleFactory creates and configures modules
- Registry Pattern: ModuleRegistry tracks loaded modules

**Event System:**
- Observer Pattern: Event bus with pub/sub
- Mediator Pattern: Event bus mediates module communication

**Data Access:**
- Repository Pattern: Abstract data access
- Unit of Work: Transaction management

**Domain Logic:**
- Domain-Driven Design (DDD): Aggregates, Entities, Value Objects
- CQRS (optional): Separate read/write for complex queries

**Cross-Cutting:**
- Decorator Pattern: Logging, caching, authorization
- Chain of Responsibility: Middleware pipeline

#### 5. SOLID Principles Implementation

**Single Responsibility:**
- Each module handles one domain
- Each class has one reason to change
- Separate read/write concerns

**Open/Closed:**
- Modules extend system without modifying core
- Event system allows new listeners without changing publishers

**Liskov Substitution:**
- All modules implement IModule interface
- Repository implementations interchangeable

**Interface Segregation:**
- Small, focused interfaces (IEventPublisher, IEventSubscriber)
- Modules only depend on interfaces they use

**Dependency Inversion:**
- Depend on abstractions (interfaces), not concrete implementations
- Core domain has no dependencies on infrastructure

## Project Structure

```
lifeOS/
├── packages/
│   ├── core/                    # Core framework (no dependencies on modules)
│   │   ├── src/
│   │   │   ├── domain/          # Shared domain entities
│   │   │   │   ├── entities/    # Task, User, etc.
│   │   │   │   ├── value-objects/ # Money, DateRange, RecurrencePattern
│   │   │   │   └── interfaces/  # Repository interfaces
│   │   │   ├── events/          # Event bus implementation
│   │   │   │   ├── EventBus.ts
│   │   │   │   ├── DomainEvent.ts
│   │   │   │   └── EventStore.ts
│   │   │   ├── module-system/   # Plugin architecture
│   │   │   │   ├── IModule.ts
│   │   │   │   ├── ModuleRegistry.ts
│   │   │   │   ├── ModuleLoader.ts
│   │   │   │   └── ModuleContext.ts
│   │   │   ├── ai/              # AI integration layer
│   │   │   │   └── mcp/         # MCP server interfaces
│   │   │   └── shared/          # Utilities, helpers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── modules/                 # All domain modules
│   │   ├── garden/
│   │   │   ├── src/
│   │   │   │   ├── domain/      # Garden-specific entities
│   │   │   │   ├── application/ # Use cases
│   │   │   │   ├── infrastructure/ # Repositories, adapters
│   │   │   │   ├── presentation/ # API routes, GraphQL schema
│   │   │   │   └── index.ts     # Module registration
│   │   │   ├── module.json      # Module manifest
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── house-maintenance/
│   │   ├── finance/
│   │   ├── email-integration/
│   │   ├── calendar/
│   │   └── agenda/              # Core orchestration module
│   │
│   ├── api/                     # Backend API server
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── graphql/
│   │   │   └── config/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                     # Frontend Next.js app
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── lib/
│       ├── package.json
│       └── tsconfig.json
│
├── tools/                       # Build tools, scripts
│   └── module-cli/              # CLI for scaffolding modules
├── docs/                        # Documentation
├── docker-compose.yml
├── package.json                 # Root package.json
├── turbo.json                   # Turborepo config
└── tsconfig.base.json          # Base TypeScript config
```

## Module System Design

### Module Interface
```typescript
interface IModule {
  // Metadata
  name: string
  version: string

  // Lifecycle
  initialize(context: ModuleContext): Promise<void>
  shutdown(): Promise<void>

  // Capabilities
  getRoutes(): Route[]
  getGraphQLSchema(): GraphQLSchema
  getUIComponents(): ComponentRegistry
  getEventHandlers(): EventHandlerMap
  getMigrations(): Migration[]
}
```

### Module Manifest (module.json)
```json
{
  "name": "garden",
  "version": "1.0.0",
  "description": "Garden and plant management",
  "author": "LifeOS",
  "permissions": [
    "calendar.read",
    "notifications.send"
  ],
  "dependencies": {
    "core": "^1.0.0",
    "agenda": "^1.0.0"
  },
  "events": {
    "subscribes": ["CalendarSynced", "WeatherUpdated"],
    "publishes": ["TaskDue", "PlantNeedsAttention"]
  }
}
```

## Event System Design

### Event Structure
```typescript
interface DomainEvent {
  id: string                      // Unique event ID
  type: string                    // Event type (e.g., "TaskCreated")
  source: string                  // Module that published
  timestamp: Date                 // When it occurred
  payload: unknown                // Event data
  metadata: Record<string, any>   // Additional context
  version: number                 // Event schema version
}
```

### Event Bus Features
- Synchronous and asynchronous delivery
- Event persistence (event sourcing for audit trail)
- Dead letter queue for failed handlers
- Event replay capability
- Type-safe event subscriptions

## Data Model Strategy

### Core Tables
```sql
-- Universal task entity
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  due_date TIMESTAMP,
  recurrence JSONB,
  module_source VARCHAR(50) NOT NULL,
  metadata JSONB,              -- Module-specific data
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Event store for event sourcing
CREATE TABLE events (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  payload JSONB NOT NULL,
  metadata JSONB,
  version INTEGER NOT NULL
);

-- Module registry
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  version VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB,
  installed_at TIMESTAMP DEFAULT NOW()
);
```

### Module-Specific Tables
Each module can define its own tables with foreign keys to core entities.

Example for Garden module:
```sql
CREATE TABLE garden_plants (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  name VARCHAR(100) NOT NULL,
  scientific_name VARCHAR(100),
  planting_date DATE,
  location_id UUID REFERENCES garden_areas(id),
  status VARCHAR(20)
);
```

## Development Phases

### Phase 1: Core Framework (Current)
- [x] Project structure
- [ ] Event bus implementation
- [ ] Module system implementation
- [ ] Shared domain entities
- [ ] Basic API server
- [ ] Database setup

### Phase 2: First Domain Module
- [ ] Garden module (prove architecture)
- [ ] Module development kit (CLI)
- [ ] Testing framework

### Phase 3: Orchestration
- [ ] Agenda module
- [ ] Cross-module task management
- [ ] Scheduling system

### Phase 4: Integration Modules
- [ ] Email parser module
- [ ] Calendar sync module
- [ ] External API integrations

### Phase 5: AI Layer
- [ ] MCP server implementation
- [ ] Vector database integration
- [ ] Insight generation
- [ ] Natural language interface

### Phase 6: Polish & Community
- [ ] Module marketplace
- [ ] Documentation
- [ ] Community module support

## Best Practices & Guidelines

### Code Quality
1. **TypeScript strict mode** enabled
2. **No any types** without explicit justification
3. **Exhaustive error handling** with typed errors
4. **Unit test coverage** minimum 80%
5. **Integration tests** for critical flows
6. **Code reviews** mandatory

### Naming Conventions
- **Classes:** PascalCase (e.g., `EventBus`, `TaskRepository`)
- **Interfaces:** PascalCase with I prefix (e.g., `IModule`, `IEventPublisher`)
- **Variables/Functions:** camelCase (e.g., `handleEvent`, `taskRepository`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Files:** kebab-case (e.g., `event-bus.ts`, `task-repository.ts`)

### Git Workflow
- **Branch naming:** `feature/`, `bugfix/`, `refactor/`
- **Commit messages:** Conventional commits format
- **PR requirements:** Tests passing, code review approved

### Documentation
- **JSDoc comments** for public APIs
- **README** in each package
- **Architecture Decision Records** (ADRs) for major decisions
- **API documentation** auto-generated from code

## Security Considerations

1. **Module Isolation:** Modules can only access their own data + shared core entities
2. **Permission System:** Modules declare required permissions, user grants access
3. **Data Encryption:** Sensitive data (credentials, API keys) encrypted at rest
4. **Input Validation:** All user inputs validated and sanitized
5. **Rate Limiting:** Per-module API rate limits
6. **Audit Trail:** Event sourcing provides complete audit log

## Performance Considerations

1. **Database Indexing:** Proper indexes on frequently queried fields
2. **Caching Strategy:** Redis for frequently accessed data
3. **Lazy Loading:** Modules loaded on-demand
4. **Background Jobs:** Long-running tasks in job queue
5. **GraphQL DataLoader:** Batch and cache database queries

## Clean Code Infrastructure ✅

### Error Handling System
Following best practices for robust error handling:

**1. Structured Error Hierarchy** (`packages/core/src/shared/errors/`)
```
BaseError (abstract)
├── NotFoundError
├── ValidationError
├── BusinessRuleError
└── DatabaseError
```

**Design Principles Applied:**
- ✅ **Single Responsibility**: Each error type has one purpose
- ✅ **Immutable**: All error properties are readonly
- ✅ **Serializable**: Can be logged and sent over network
- ✅ **Context-rich**: Includes metadata for debugging
- ✅ **User-friendly**: Separate user-facing messages from internal details
- ✅ **Type-safe**: ErrorCode enum prevents typos

**Example Usage:**
```typescript
// Throwing errors
throw new NotFoundError('Task', taskId);
throw new ValidationError('Invalid input', [
  { field: 'title', message: 'Title is required' }
]);
throw new BusinessRuleError(
  'Cannot complete cancelled task',
  'TASK_ALREADY_CANCELLED'
);

// All errors include:
// - Error code (for programmatic handling)
// - HTTP status code
// - Context (metadata)
// - Timestamp
// - Stack trace
```

### Result Type for Functional Error Handling
Railway Oriented Programming pattern (`packages/core/src/shared/result/`)

**Benefits:**
- ✅ **Explicit error handling**: No hidden exceptions
- ✅ **Type-safe**: Compiler enforces error handling
- ✅ **Composable**: Chain operations with map/flatMap
- ✅ **No try-catch**: Errors are values, not exceptions

**Example Usage:**
```typescript
// Instead of throwing
function findTask(id: string): Result<Task, NotFoundError> {
  const task = await repository.findById(id);
  if (!task) {
    return Result.fail(new NotFoundError('Task', id));
  }
  return Result.ok(task);
}

// Usage
const result = await findTask('123');
if (result.isOk()) {
  console.log(result.value); // Task
} else {
  console.error(result.error); // NotFoundError
}

// Chaining operations
const transformed = result
  .map(task => task.title)
  .map(title => title.toUpperCase());
```

### Repository Pattern
Pure interfaces with no implementation details (`packages/core/src/domain/interfaces/`)

**Design Principles:**
- ✅ **Dependency Inversion**: Domain depends on interfaces, not implementations
- ✅ **Separation of Concerns**: Data access is separate from business logic
- ✅ **No leaky abstractions**: Domain entities, not database models
- ✅ **Transaction support**: Built-in transaction handling
- ✅ **Result-based**: All methods return Result<T, E>

**Example:**
```typescript
interface ITaskRepository {
  findById(id: string): Promise<Result<Task, BaseError>>;
  create(task: Task): Promise<Result<Task, BaseError>>;
  update(task: Task): Promise<Result<Task, BaseError>>;
  // No SQL, no ORM details visible here!
}
```

### File Organization
Following "Screaming Architecture" - structure reveals intent:

```
packages/core/src/
├── domain/                  # Business logic
│   ├── entities/           # One file per entity
│   │   └── Task.ts        # ~250 lines, focused
│   ├── value-objects/      # Immutable values
│   │   ├── Money.ts
│   │   └── RecurrencePattern.ts
│   └── interfaces/         # Contracts only
│       └── ITaskRepository.ts
│
├── shared/                  # Reusable infrastructure
│   ├── errors/             # One file per error type
│   │   ├── BaseError.ts
│   │   ├── NotFoundError.ts
│   │   ├── ValidationError.ts
│   │   └── ErrorCode.ts   # Centralized codes
│   └── result/
│       └── Result.ts       # Functional error handling
```

**File Size Guidelines:**
- ✅ **Small files**: Each file < 300 lines
- ✅ **Single concern**: One class/interface per file
- ✅ **Clear names**: File name = class name
- ✅ **Grouped by feature**: Not by type

## Next Steps
1. ✅ Create project structure
2. ✅ Set up TypeScript configurations
3. ✅ Implement Event Bus
4. ✅ Implement Module System
5. ✅ Create shared domain entities
6. ✅ Create error handling infrastructure
7. ✅ Create Result type for functional error handling
8. ✅ Create repository interfaces
9. Configure ORM (Prisma)
10. Implement repositories with ORM
11. Create use case layer
12. Create API layer

---

Last updated: 2025-10-13

## Garden Module Implementation (Phase 1 Complete)

### Date: 2025-10-13

#### Architecture Overview
The Garden module demonstrates the complete application of clean architecture principles:

**Layer Breakdown:**
```
Presentation Layer (HTTP/API)
  ├── Controllers: GardenTaskController, PlantController, GardenAreaController
  ├── Routes: gardenTaskRoutes, plantRoutes, gardenAreaRoutes, gardenRoutes (master)
  └── Middleware: validateRequest with Zod schemas

Application Layer (Business Logic)
  ├── Use Cases: 7 use cases (Create*, Record*)
  ├── DTOs: TaskDTO, PlantDTO, GardenAreaDTO with mappers
  └── Validation: Zod schemas for all endpoints

Domain Layer (Core Business)
  ├── Entities: GardenTask, Plant, GardenArea (rich domain models)
  ├── Value Objects: GrowthStage, Season, WeatherDependency, etc.
  └── Interfaces: IGardenTaskRepository, IPlantRepository, IGardenAreaRepository

Infrastructure Layer (External)
  ├── Repositories: 3 implementations with Prisma
  ├── Mappers: Prisma ↔ Domain translation
  └── Database: Extended Prisma schema with 3 tables
```

#### Key Architectural Decisions

**1. Rich Domain Models**
- **Decision:** Put business logic in domain entities, not services
- **Rationale:**
  - `Plant.needsWatering()` - entity knows its own state
  - `GardenArea.needsMaintenance()` - encapsulates business rules
  - `GardenTask.isOverdue()` - domain logic stays in domain
- **Benefit:** No anemic domain model anti-pattern

**2. Use Case Pattern**
- **Decision:** Create separate use case for each operation
- **Examples:**
  - RecordWateringUseCase
  - RecordFertilizingUseCase
  - RecordPruningUseCase
  - RecordHarvestUseCase
  - RecordMaintenanceUseCase
- **Rationale:**
  - Single Responsibility Principle
  - Each use case ~110-130 lines
  - Easy to test in isolation
  - Business logic centralized
- **Pattern:**
  ```typescript
  class RecordWateringUseCase {
    async execute(plantId, date) {
      // 1. Get entity
      // 2. Validate business rules
      // 3. Call domain method
      // 4. Persist
      // 5. Publish event
      // 6. Return result
    }
  }
  ```

**3. Thin Controllers**
- **Decision:** Controllers only coordinate HTTP ↔ Use Cases
- **Rationale:**
  - No business logic in controllers
  - ~30 lines per method
  - Only parse request → call use case → return response
- **Example:**
  ```typescript
  async recordWatering(req, res) {
    const { id } = req.params;
    const useCase = new RecordWateringUseCase(repo, eventBus);
    const result = await useCase.execute(id);
    if (result.isFail()) { next(result.error); return; }
    res.json(DtoMapper.toResponseDTO(result.value));
  }
  ```

**4. Event-Driven Communication**
- **Decision:** Publish domain events for all significant actions
- **Events Published:**
  - PlantCreated, PlantWatered, PlantFertilized, PlantPruned, PlantHarvested
  - GardenAreaCreated, GardenAreaMaintained
  - GardenTaskCreated, GardenTaskCompleted
- **Rationale:**
  - Loose coupling between modules
  - Audit trail via event store
  - Easy to add new reactions without changing existing code
  - Event sourcing foundation

**5. Validation Strategy**
- **Decision:** Three layers of validation
  1. **Zod schemas** (HTTP layer) - catch bad requests early
  2. **Use case validation** (Application layer) - business rules
  3. **Entity validation** (Domain layer) - invariants
- **Example:**
  ```typescript
  // 1. Zod schema validates format
  name: z.string().min(2).max(200)
  
  // 2. Use case validates business rules
  if (plant.plantedDate > harvestDate) {
    return Result.fail(new BusinessRuleError(...));
  }
  
  // 3. Entity validates invariants
  if (!this._name || this._name.trim().length === 0) {
    throw new Error('Name required');
  }
  ```

**6. Repository Implementation**
- **Decision:** Use Prisma ORM, wrap in Result types
- **Rationale:**
  - Type-safe database access
  - No raw SQL in repositories
  - All operations return Result<T, Error>
  - Mappers handle Prisma ↔ Domain translation
- **Pattern:**
  ```typescript
  async findById(id): Promise<Result<Plant, BaseError>> {
    try {
      const prismaPlant = await this.prisma.gardenPlant.findUnique({ where: { id } });
      if (!prismaPlant) return Result.fail(new NotFoundError('Plant', id));
      return Result.ok(PlantMapper.toDomain(prismaPlant));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find plant', error));
    }
  }
  ```

**7. Module System Integration**
- **Decision:** Create GardenModule implementing IModule
- **Rationale:**
  - Self-contained module with manifest
  - Lifecycle hooks (initialize, shutdown)
  - Declarative event subscriptions
  - Health check endpoint
  - UI component registry
- **Implementation:**
  - Manifest declares capabilities
  - Initialize subscribes to events
  - Shutdown cleans up resources
  - getEventHandlers() returns handler map

#### API Design Decisions

**1. RESTful Resource Structure**
```
/api/garden
  ├── /tasks       (Garden tasks CRUD + complete)
  ├── /plants      (Plants CRUD + care actions)
  └── /areas       (Garden areas CRUD + maintenance)
```

**2. Action Endpoints**
- **Pattern:** POST /resource/:id/action
- **Examples:**
  - POST /plants/:id/water
  - POST /plants/:id/fertilize
  - POST /plants/:id/prune
  - POST /plants/:id/harvest
  - POST /areas/:id/maintenance
  - POST /tasks/:id/complete
- **Rationale:** Clear intent, not just CRUD

**3. Query Parameters**
```
GET /plants?needsWatering=true
GET /areas?needsMaintenance=true
GET /tasks?isOverdue=true&priority=high
```
- Domain logic in entities
- Query in repository
- Filter logic uses entity methods

#### Code Quality Metrics

**File Size Discipline:**
- Entities: ~250-400 lines (rich domain models)
- Use Cases: ~110-130 lines (single operation)
- Controllers: ~170-210 lines (~30 lines/method)
- Repositories: ~250-370 lines (all CRUD + queries)
- Mappers: ~100-190 lines (pure translation)
- All files < 400 lines ✅

**SOLID Compliance:**
- Single Responsibility: ✅ Each class has one job
- Open/Closed: ✅ Extend via new use cases/entities
- Liskov Substitution: ✅ All repos implement interfaces
- Interface Segregation: ✅ Small, focused interfaces
- Dependency Inversion: ✅ Depend on abstractions

**Pattern Consistency:**
- Every use case follows same 6-step pattern
- Every repository method returns Result<T, E>
- Every controller method ~30 lines
- Every entity has business logic methods
- Every DTO mapper has same structure

#### Module Statistics
- **40+ files created**
- **~6,500 lines of code**
- **22 API endpoints**
- **7 use cases**
- **3 controllers**
- **3 repositories**
- **3 domain entities**
- **9 DTOs with mappers**
- **3 validation schemas**
- **10+ domain events**
- **100% TypeScript strict mode**
- **Full JSDoc documentation**

#### Lessons Learned

**What Worked Well:**
1. Result type eliminates try-catch blocks
2. Use case pattern keeps business logic organized
3. Thin controllers prevent bloat
4. Rich domain models reduce service layer complexity
5. Event-driven design enables extensibility
6. Zod schemas provide runtime type safety
7. Small files easy to understand and maintain

**Patterns to Continue:**
1. Create use case for each operation
2. Keep controllers thin (~30 lines/method)
3. Put business logic in entities
4. Use Result types everywhere
5. Validate at 3 levels (HTTP, use case, entity)
6. Publish events for significant actions
7. Keep files < 400 lines

**Next Module Template:**
When implementing next module (House Maintenance, Finance, etc.):
1. Copy Garden module structure
2. Replace domain entities
3. Implement repositories with same patterns
4. Create use cases following 6-step pattern
5. Keep controllers thin
6. Add validation schemas
7. Publish domain events
8. Implement IModule interface

---

Last updated: 2025-10-13
