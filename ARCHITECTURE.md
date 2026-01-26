# NoCodeAPI - System Architecture

## Overview

NoCodeAPI is a full-stack MERN application for building APIs visually without code.

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Redux Store                                          │  │
│  │ ├─ auth (user, token, auth state)                   │  │
│  │ ├─ projects (user projects)                         │  │
│  │ ├─ flows (flow definitions, editor state)           │  │
│  │ ├─ logs (request logs)                              │  │
│  │ └─ ui (sidebar, notifications, etc.)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓ HTTP                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
         ┌──────────────────────────────────────┐
         │   Backend (Express.js)               │
         │   ┌──────────────────────────────┐   │
         │   │ API Routes                   │   │
         │   ├─ /api/auth (signup/login)    │   │
         │   ├─ /api/projects               │   │
         │   ├─ /api/flows                  │   │
         │   ├─ /api/logs                   │   │
         │   └─ /:username/:projectSlug     │   │ (API Gateway)
         │   └──────────────────────────────┘   │
         │            ↓                         │
         │   ┌──────────────────────────────┐   │
         │   │ Services                     │   │
         │   ├─ Auth Service               │   │
         │   ├─ Projects Service           │   │
         │   ├─ Flows Service              │   │
         │   ├─ Runtime Service (Executor) │   │
         │   ├─ Gateway Service            │   │
         │   └─ Logs Service               │   │
         │   └──────────────────────────────┘   │
         │            ↓                         │
         │   ┌──────────────────────────────┐   │
         │   │ Middleware                   │   │
         │   ├─ authenticate (JWT)         │   │
         │   ├─ apiKeyAuth                 │   │
         │   ├─ errorHandler               │   │
         │   └─ asyncHandler               │   │
         │   └──────────────────────────────┘   │
         └──────────────────────────────────────┘
                        ↓
              ┌─────────────────────┐
              │ MongoDB Database    │
              │ ├─ users            │
              │ ├─ projects         │
              │ ├─ flows            │
              │ ├─ apiKeys          │
              │ ├─ logs             │
              │ └─ requestLogs      │
              └─────────────────────┘
\`\`\`

## Service Architecture

### Auth Service
- User registration and login
- JWT token generation and validation
- API key management
- Password hashing with bcryptjs

### Projects Service
- CRUD operations for projects
- Multi-tenant project isolation
- Project slug generation

### Flows Service
- Flow definition storage
- Node and edge management
- Flow versioning
- Deployment tracking

### Runtime Service
- Flow execution engine
- Node traversal algorithm
- MongoDB operation execution
- Variable management
- Error handling with try/catch

### API Gateway
- Public endpoint routing
- User/project resolution
- Flow execution
- Request logging
- API key validation

### Logs Service
- Request/response logging
- Query filtering and pagination
- Log retention management

## Frontend Architecture

### Pages
- **Landing**: Marketing page
- **Auth**: Login/Signup forms
- **Dashboard**: Project management
- **Builder**: Flow visual editor
- **Playground**: API testing
- **Docs**: API documentation
- **Logs**: Request monitoring

### State Management
Redux Toolkit with slices for auth, projects, flows, logs, and UI state.

### Components
- **FlowEditor**: React Flow canvas with node palette
- **ProtectedRoute**: Authorization wrapper
- Custom UI components using Tailwind CSS

## Data Models

### User
\`\`\`
{
  email: string (unique),
  username: string (unique),
  password: string (hashed),
  firstName: string,
  lastName: string,
  createdAt: date
}
\`\`\`

### Project
\`\`\`
{
  userId: ObjectId,
  name: string,
  slug: string (unique per user),
  description: string,
  status: enum ['draft', 'active', 'archived'],
  baseUrl: string,
  createdAt: date
}
\`\`\`

### Flow
\`\`\`
{
  projectId: ObjectId,
  userId: ObjectId,
  name: string,
  nodes: array,
  edges: array,
  version: number,
  deployed: boolean,
  deployedAt: date,
  compiledFlow: object,
  createdAt: date
}
\`\`\`

### RequestLog
\`\`\`
{
  projectId: ObjectId,
  flowId: ObjectId,
  userId: ObjectId,
  method: string,
  path: string,
  status: number,
  duration: number,
  requestBody: object,
  responseBody: object,
  timestamp: date
}
\`\`\`

## Security Features

- JWT-based authentication
- API key management for public endpoints
- Password hashing with bcryptjs
- Multi-tenant isolation
- Middleware authentication on protected routes
- CORS configuration

## Scalability Considerations

- Stateless services for horizontal scaling
- MongoDB indexing on frequently queried fields
- Event bus for asynchronous processing
- Separation of concerns via microservices
- Request logging for monitoring

## Future Enhancements

- Redis caching layer
- Message queue for async jobs (Bull/RabbitMQ)
- WebSocket support for real-time collaboration
- Advanced analytics and metrics
- Custom middleware support
- OAuth/SSO integration
- Team collaboration features
- API rate limiting
