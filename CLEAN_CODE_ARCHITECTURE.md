# LifeOS - Clean Code Architecture Guide

## Overview

This document describes the clean code architecture implemented in LifeOS, following industry best practices, SOLID principles, and separation of concerns.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - Controllers (thin, no business logic)                    │
│  - Middleware (error handling, validation, auth)            │
│  - Routes                                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  - Use Cases (business logic orchestration)                 │
│  - DTOs (data transfer objects)                             │
│  - Event handlers                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  - Entities (Task, etc.)                                    │
│  - Value Objects (Money, RecurrencePattern)                 │
│  - Repository Interfaces (contracts only)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  - Repository Implementations (Prisma)                      │
│  - Database Client                                          │
│  - Mappers (Domain ↔ Prisma, Domain ↔ DTO)                │
└─────────────────────────────────────────────────────────────┘
```

**Key Rule:** Dependencies point INWARD. Inner layers know nothing about outer layers.

---

## Error Handling

### Structured Error Hierarchy

```typescript
BaseError (abstract)
├── NotFoundError          // 404
├── ValidationError        // 400
├── BusinessRuleError      // 422
└── DatabaseError          // 500
```

### Usage Example

```typescript
// Throwing errors
throw new NotFoundError('Task', taskId);
throw new ValidationError('Invalid input', [
  { field: 'title', message: 'Title is required' }
]);

// All errors include:
// - Error code (programmatic)
// - HTTP status code
// - Context (metadata)
// - Timestamp
// - Stack trace
```

### Result Type (Railway Oriented Programming)

Instead of throwing exceptions, use `Result<T, E>`:

```typescript
// Function returns Result
function findTask(id: string): Promise<Result<Task, BaseError>> {
  if (!found) {
    return Result.fail(new NotFoundError('Task', id));
  }
  return Result.ok(task);
}

// Usage
const result = await findTask('123');
if (result.isOk()) {
  console.log(result.value); // Task
} else {
  console.error(result.error); // BaseError
}

// Chaining (functional style)
const titleResult = result
  .map(task => task.title)
  .map(title => title.toUpperCase())
  .valueOr('UNKNOWN');
```

**Benefits:**
- ✅ Explicit error handling (no hidden exceptions)
- ✅ Type-safe (compiler enforces error handling)
- ✅ Composable (chain operations)
- ✅ Testable (no try-catch blocks)

---

## Repository Pattern

### Interface (Domain Layer)

```typescript
// packages/core/src/domain/interfaces/ITaskRepository.ts
interface ITaskRepository {
  findById(id: string): Promise<Result<Task, BaseError>>;
  create(task: Task): Promise<Result<Task, BaseError>>;
  // ... other methods
}
```

**Key Points:**
- ✅ Pure interface (no implementation details)
- ✅ Domain language (no SQL, no ORM terms)
- ✅ Returns domain entities (not database models)
- ✅ Uses Result type (no exceptions)

### Implementation (Infrastructure Layer)

```typescript
// packages/api/src/infrastructure/repositories/TaskRepository.ts
class TaskRepository implements ITaskRepository {
  private readonly prisma: PrismaClient;

  async findById(id: string): Promise<Result<Task, BaseError>> {
    try {
      const prismaTask = await this.prisma.task.findUnique({ where: { id } });
      if (!prismaTask) {
        return Result.fail(new NotFoundError('Task', id));
      }
      const task = TaskMapper.toDomain(prismaTask);
      return Result.ok(task);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find task', error));
    }
  }
}
```

**Key Points:**
- ✅ Hides Prisma details from domain
- ✅ Converts Prisma models to domain entities via mapper
- ✅ Catches ALL errors and wraps in Result
- ✅ Never throws exceptions

---

## Mappers (Translation Layer)

### TaskMapper (Prisma ↔ Domain)

```typescript
// packages/api/src/infrastructure/mappers/TaskMapper.ts
class TaskMapper {
  // Prisma model → Domain entity
  static toDomain(prismaTask: PrismaTask): Task {
    return new Task({
      id: prismaTask.id,
      title: prismaTask.title,
      // ... map all fields
    });
  }

  // Domain entity → Prisma input
  static toPrismaCreate(task: Task): PrismaCreateInput {
    return {
      id: task.id,
      title: task.title,
      // ... map all fields
    };
  }
}
```

### TaskDTOMapper (Domain ↔ API)

```typescript
// packages/api/src/application/dtos/TaskDTOMapper.ts
class TaskDTOMapper {
  // Domain entity → Response DTO
  static toResponseDTO(task: Task): TaskResponseDTO {
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate?.toISOString() ?? null,
      // ... map all fields
    };
  }

  // Request DTO → Domain entity
  static fromCreateDTO(dto: CreateTaskRequestDTO): Task {
    return new Task({
      title: dto.title,
      // ... map all fields
    });
  }
}
```

**Why Two Mappers?**
- Infrastructure mapper: Hides ORM details
- DTO mapper: Hides domain details from API
- Allows both to evolve independently

---

## Use Cases (Application Layer)

Use cases contain business logic. They:
1. Validate business rules
2. Coordinate repositories
3. Publish domain events
4. Return Results

### Example: CreateTaskUseCase

```typescript
class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(task: Task): Promise<Result<Task, BaseError>> {
    // 1. Validate business rules
    if (task.title.length < 3) {
      return Result.fail(new ValidationError('Title too short'));
    }

    // 2. Persist
    const result = await this.taskRepository.create(task);
    if (result.isFail()) {
      return result;
    }

    // 3. Publish event
    await this.eventBus.publish({
      type: 'TaskCreated',
      payload: { taskId: task.id }
    });

    // 4. Return result
    return result;
  }
}
```

**Key Points:**
- ✅ Business logic is HERE (not in controllers)
- ✅ Dependency injection (testable)
- ✅ Returns Result (no exceptions)
- ✅ Single Responsibility (one use case = one operation)

---

## DTOs (Data Transfer Objects)

DTOs define API contracts (request/response). They are NOT domain entities.

### Task DTOs

```typescript
// Response DTO (what we send to clients)
interface TaskResponseDTO {
  id: string;
  title: string;
  status: string;
  dueDate: string | null; // ISO 8601
  // ... other fields
}

// Create Request DTO (what we receive from clients)
interface CreateTaskRequestDTO {
  title: string;
  description?: string;
  type: string;
  // ... other fields
}

// Update Request DTO (partial update)
interface UpdateTaskRequestDTO {
  title?: string;
  status?: string;
  // ... all fields optional
}
```

**Benefits:**
- ✅ Separate API contract from domain model
- ✅ Can version independently (v1, v2)
- ✅ Hide internal implementation
- ✅ Explicit about what's sent/received

---

## Controllers (Presentation Layer)

Controllers are THIN. They only:
1. Parse HTTP requests
2. Call use cases
3. Map results to HTTP responses

### Example: TaskController

```typescript
class TaskController {
  constructor(
    private readonly getTaskUseCase: GetTaskByIdUseCase,
    private readonly createTaskUseCase: CreateTaskUseCase
  ) {}

  async getTask(req: Request, res: Response): Promise<void> {
    // 1. Extract parameter
    const { id } = req.params;

    // 2. Call use case (NO business logic here!)
    const result = await this.getTaskUseCase.execute(id);

    // 3. Map result to HTTP response
    if (result.isOk()) {
      const dto = TaskDTOMapper.toResponseDTO(result.value);
      res.json(dto);
    } else {
      // Error middleware handles this
      throw result.error;
    }
  }
}
```

**Key Points:**
- ✅ NO business logic (that's in use cases)
- ✅ NO database queries (that's in repositories)
- ✅ Just coordinates HTTP ↔ use cases
- ✅ Thin layer (~10-20 lines per method)

---

## File Organization

All files are small (< 300 lines) and focused (single responsibility).

```
packages/api/src/
├── application/
│   ├── dtos/
│   │   ├── TaskDTO.ts              # ~100 lines
│   │   └── TaskDTOMapper.ts        # ~150 lines
│   └── use-cases/
│       ├── GetTaskByIdUseCase.ts   # ~30 lines
│       └── CreateTaskUseCase.ts    # ~100 lines
│
├── infrastructure/
│   ├── database/
│   │   └── DatabaseClient.ts       # ~150 lines
│   ├── mappers/
│   │   └── TaskMapper.ts           # ~100 lines
│   └── repositories/
│       └── TaskRepository.ts       # ~250 lines
│
└── presentation/
    ├── controllers/
    │   └── TaskController.ts       # ~150 lines
    ├── middleware/
    │   └── errorHandler.ts         # ~50 lines
    └── routes/
        └── taskRoutes.ts           # ~30 lines
```

---

## SOLID Principles Applied

### Single Responsibility Principle
- ✅ Each class does ONE thing
- ✅ TaskMapper: Only maps between layers
- ✅ GetTaskUseCase: Only retrieves tasks
- ✅ TaskRepository: Only handles data access

### Open/Closed Principle
- ✅ Extend via new use cases (don't modify existing)
- ✅ Add new error types (don't modify BaseError)
- ✅ Add new repositories (don't modify interface)

### Liskov Substitution Principle
- ✅ All repositories implement ITaskRepository
- ✅ All errors extend BaseError
- ✅ Can swap implementations without breaking code

### Interface Segregation Principle
- ✅ Small, focused interfaces (ITaskRepository)
- ✅ No fat interfaces with unused methods
- ✅ Clients depend only on what they use

### Dependency Inversion Principle
- ✅ Use cases depend on ITaskRepository (interface)
- ✅ NOT on TaskRepository (implementation)
- ✅ Domain layer has no dependencies on infrastructure

---

## Testing Strategy

### Unit Tests (Pure logic)
```typescript
describe('CreateTaskUseCase', () => {
  it('should validate title length', async () => {
    const mockRepo = createMockRepository();
    const useCase = new CreateTaskUseCase(mockRepo, mockEventBus);

    const task = new Task({ title: 'ab' }); // Too short
    const result = await useCase.execute(task);

    expect(result.isFail()).toBe(true);
    expect(result.error).toBeInstanceOf(ValidationError);
  });
});
```

### Integration Tests (With database)
```typescript
describe('TaskRepository', () => {
  it('should create and retrieve task', async () => {
    const repo = new TaskRepository();
    const task = new Task({ title: 'Test Task' });

    await repo.create(task);
    const result = await repo.findById(task.id);

    expect(result.isOk()).toBe(true);
    expect(result.value.title).toBe('Test Task');
  });
});
```

### E2E Tests (Full flow)
```typescript
describe('POST /api/tasks', () => {
  it('should create a task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'New Task', type: 'mowing' });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('New Task');
  });
});
```

---

## Best Practices Summary

### DO ✅
- Use Result<T, E> for error handling
- Keep files small (< 300 lines)
- One class/interface per file
- Inject dependencies via constructor
- Return domain entities from repositories
- Put business logic in use cases
- Use mappers between layers
- Validate in use cases (not controllers)

### DON'T ❌
- Throw exceptions from repositories
- Put business logic in controllers
- Put database queries in controllers
- Use `any` type
- Make fat interfaces
- Mix layers (domain importing infrastructure)
- Skip error handling
- Forget to map between layers

---

## Next Steps

1. Add middleware (error handling, validation, auth)
2. Create controllers
3. Add validation layer (Zod schemas)
4. Set up API routes
5. Write tests
6. Add monitoring/logging

---

**Questions?** Check the code - it's self-documenting with JSDoc comments!
