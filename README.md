# LifeOS

A comprehensive life management system with AI-powered insights. Track everything from garden maintenance to monthly payments, all in one extensible, modular platform.

## Overview

LifeOS is built as an **event-driven modular monolith** with a plugin architecture, allowing easy extension through modules while maintaining simplicity in deployment and development.

### Key Features

- **Modular Architecture**: Each life domain (garden, house, finance, etc.) is a separate module
- **Event-Driven**: Modules communicate through events for loose coupling
- **AI-Powered**: Get intelligent insights and recommendations across all your data
- **Extensible**: Create custom modules easily with our plugin system
- **Type-Safe**: Built with TypeScript for maximum reliability
- **Clean Architecture**: Follows DDD, SOLID principles, and clean code practices

## Project Structure

```
lifeOS/
├── packages/
│   ├── core/                    # Core framework
│   │   ├── domain/              # Shared entities and value objects
│   │   ├── events/              # Event bus and event store
│   │   ├── module-system/       # Plugin architecture
│   │   └── shared/              # Utilities
│   │
│   ├── modules/                 # Domain modules
│   │   ├── garden/              # Garden & plant management
│   │   ├── house-maintenance/   # Home systems & maintenance
│   │   ├── finance/             # Payments & budgets
│   │   ├── email-integration/   # Email parsing
│   │   ├── calendar/            # Calendar sync
│   │   └── agenda/              # Unified timeline & orchestration
│   │
│   ├── api/                     # Backend API server
│   └── web/                     # Frontend application
│
├── tools/                       # Development tools
├── docs/                        # Documentation
├── claude.md                    # Architecture decisions
└── docker-compose.yml          # Local development
```

## Architecture

### Core Principles

1. **Clean Architecture**: Dependencies point inward (Presentation → Application → Domain → Infrastructure)
2. **Event-Driven Communication**: Modules publish and subscribe to events via Event Bus
3. **Domain-Driven Design**: Rich domain models with entities, value objects, and aggregates
4. **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion

### Tech Stack

**Backend:**
- Node.js + TypeScript
- Express (API)
- PostgreSQL (database)
- Redis (cache/jobs)
- GraphQL (API layer)

**Frontend:**
- Next.js 14
- React 18
- TailwindCSS
- TanStack Query

**AI:**
- MCP (Model Context Protocol)
- Vector Database (ChromaDB/Pinecone)

**Tooling:**
- Turborepo (monorepo)
- Docker Compose
- Vitest (testing)
- ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker & Docker Compose (for local development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lifeos.git
cd lifeOS
```

2. Install dependencies:
```bash
npm install
```

3. Start local services (PostgreSQL, Redis):
```bash
npm run docker:up
```

4. Build all packages:
```bash
npm run build
```

5. Start development mode:
```bash
npm run dev
```

### Project Commands

```bash
npm run build          # Build all packages
npm run dev            # Start development mode
npm run lint           # Lint all packages
npm run format         # Format code with Prettier
npm run type-check     # TypeScript type checking
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run clean          # Clean build artifacts
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
```

## Core Concepts

### Modules

Each module is a self-contained package that implements the `IModule` interface:

```typescript
interface IModule {
  readonly manifest: ModuleManifest;
  initialize(context: ModuleContext): Promise<void>;
  shutdown(): Promise<void>;
  getRoutes(): Route[];
  getGraphQLSchema?(): string;
  getUIComponents(): ComponentRegistry;
  getEventHandlers(): Record<string, EventHandler>;
  getMigrations(): Migration[];
}
```

### Events

Modules communicate through domain events:

```typescript
interface DomainEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  payload: any;
  metadata: Record<string, unknown>;
  version: number;
}
```

Example:
```typescript
// Publishing an event
eventBus.publish({
  id: uuid(),
  type: 'TaskCompleted',
  source: 'garden',
  timestamp: new Date(),
  payload: { taskId: '123', completedAt: new Date() },
  metadata: { userId: 'user-1' },
  version: 1
});

// Subscribing to events
eventBus.subscribe('TaskCompleted', async (event) => {
  console.log('Task completed:', event.payload);
});
```

### Shared Domain

The core package provides shared entities and value objects:

**Task Entity**: Universal task entity that all modules extend
```typescript
const task = new Task({
  title: 'Mow the lawn',
  description: 'Weekly lawn mowing',
  type: 'mowing',
  moduleSource: 'garden',
  priority: TaskPriority.MEDIUM,
  dueDate: new Date(),
});
```

**Money Value Object**: Immutable money representation
```typescript
const price = new Money(29.99, 'EUR');
const total = price.multiply(2); // €59.98
console.log(total.format('nl-BE')); // "€ 59,98"
```

**Recurrence Pattern**: Define repeating tasks
```typescript
const weekly = RecurrencePattern.weekly(1);
const nextOccurrence = weekly.getNextOccurrence(new Date());
```

## Module Development

### Creating a New Module

1. Create module structure:
```bash
mkdir -p packages/modules/my-module/src/{domain,application,infrastructure,presentation}
```

2. Create `module.json`:
```json
{
  "name": "my-module",
  "version": "1.0.0",
  "description": "My custom module",
  "author": "Your Name",
  "permissions": [],
  "dependencies": {
    "core": "^1.0.0"
  },
  "events": {
    "subscribes": ["SomeEvent"],
    "publishes": ["MyEvent"]
  }
}
```

3. Implement `IModule` interface
4. Register with the module loader

See `/packages/modules/garden` for a complete example.

## Design Patterns

- **Strategy Pattern**: Modules implement IModule interface
- **Factory Pattern**: ModuleLoader creates module instances
- **Registry Pattern**: ModuleRegistry tracks loaded modules
- **Observer Pattern**: Event bus pub/sub system
- **Repository Pattern**: Data access abstraction
- **Domain-Driven Design**: Entities, value objects, aggregates

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Documentation

- **Architecture decisions**: See `claude.md`
- **API documentation**: (TODO: Add link)
- **Module development guide**: (TODO: Add link)

## Development Roadmap

### Phase 1: Core Framework ✅
- [x] Project structure
- [x] Event bus
- [x] Module system
- [x] Shared domain entities

### Phase 2: First Domain Module (Next)
- [ ] Garden module implementation
- [ ] Module development kit (CLI)
- [ ] Testing framework

### Phase 3: Orchestration
- [ ] Agenda module
- [ ] Cross-module task management
- [ ] Scheduling system

### Phase 4: Integration Modules
- [ ] Email parser module
- [ ] Calendar sync module

### Phase 5: AI Layer
- [ ] MCP server implementation
- [ ] Vector database integration
- [ ] Insight generation

### Phase 6: Polish & Community
- [ ] Module marketplace
- [ ] Documentation
- [ ] Community support

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

[Your chosen license]

## Support

For questions and support, please open an issue on GitHub.

---

Built with ❤️ using Clean Architecture, DDD, and SOLID principles.
