# NoCodeAPI - API Documentation

## Authentication

All API endpoints (except auth endpoints) require JWT token in Authorization header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Auth Endpoints

### Signup
\`\`\`
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }
}
\`\`\`

### Login
\`\`\`
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
\`\`\`

### Get Current User
\`\`\`
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": "...",
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
\`\`\`

## Projects Endpoints

### List Projects
\`\`\`
GET /api/projects
Authorization: Bearer <token>

Response: [ { id, name, slug, description, status, ... } ]
\`\`\`

### Create Project
\`\`\`
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}

Response:
{
  "id": "...",
  "userId": "...",
  "name": "My Project",
  "slug": "my-project",
  "status": "draft",
  "baseUrl": "http://localhost:5000/api/johndoe/my-project"
}
\`\`\`

### Update Project
\`\`\`
PATCH /api/projects/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "status": "active"
}
\`\`\`

### Delete Project
\`\`\`
DELETE /api/projects/:projectId
Authorization: Bearer <token>
\`\`\`

## Flows Endpoints

### List Flows
\`\`\`
GET /api/flows/project/:projectId
Authorization: Bearer <token>

Response: [ { id, name, nodes, edges, deployed, ... } ]
\`\`\`

### Create Flow
\`\`\`
POST /api/flows/project/:projectId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Get Users",
  "description": "Fetch all users"
}
\`\`\`

### Update Flow
\`\`\`
PATCH /api/flows/:flowId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "nodes": [ ... ],
  "edges": [ ... ]
}
\`\`\`

### Deploy Flow
\`\`\`
POST /api/flows/:flowId/deploy
Authorization: Bearer <token>

Response:
{
  "message": "Flow deployed",
  "flow": { id, deployed: true, deployedAt, ... }
}
\`\`\`

### Delete Flow
\`\`\`
DELETE /api/flows/:flowId
Authorization: Bearer <token>
\`\`\`

## Logs Endpoints

### Get Project Logs
\`\`\`
GET /api/logs/project/:projectId?limit=100&skip=0&status=200&method=GET
Authorization: Bearer <token>

Response:
{
  "logs": [ { id, method, path, status, duration, timestamp, ... } ],
  "total": 1234,
  "limit": 100,
  "skip": 0
}
\`\`\`

## API Gateway (Public Endpoints)

Once a flow is deployed, it's accessible via:

\`\`\`
/{username}/{projectSlug}/{path}

Examples:
GET /johndoe/my-project/users
POST /johndoe/my-project/users
PUT /johndoe/my-project/users/123
\`\`\`

All requests are logged and can be viewed in Logs dashboard.

## Error Responses

All errors follow this format:

\`\`\`json
{
  "error": "Error message"
}
\`\`\`

Common status codes:
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error
