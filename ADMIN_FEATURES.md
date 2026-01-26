# Professional Admin System - Complete Feature Documentation

## System Architecture

The NoCodeAPI admin system is built with enterprise-level features for complete platform management and oversight.

### Core Components

1. **Authentication & Authorization**
   - RBAC with 3 roles: Super Admin, Admin, Moderator
   - Permission-based access control
   - JWT token validation for all admin endpoints

2. **Admin Dashboard**
   - Real-time analytics and monitoring
   - Daily API request metrics
   - System health indicators
   - User management overview

3. **User Management System**
   - Comprehensive user profiles
   - Activity history tracking
   - Status management (active, suspended, banned)
   - Quota and rate limiting controls

4. **Audit Logging**
   - Complete action tracking
   - Admin activity history
   - User status changes
   - System configuration changes

5. **Rate Limiting & Quotas**
   - Per-user and per-project limits
   - Tier-based configurations
   - Dynamic quota adjustments

## Admin Features

### 1. Dashboard Analytics

**Available Metrics:**
- Total users (active, suspended, banned)
- API request volume trends
- Average response time
- Success/failure rates
- Project and flow statistics

**Access:** `/admin`

### 2. User Management

**Capabilities:**
- View all users with pagination
- Search users by email/username
- Ban/suspend/unban users
- View detailed user profiles
- Monitor user activity
- Track project and flow usage

**Detailed User Profile Shows:**
- Account information
- Account age and creation date
- Active status
- Current tier
- Total projects, flows, API calls
- Usage statistics (last 30 days)
- Rate limit configuration
- Project list with deployment status
- Flow statistics with performance metrics
- Recent activity log

**Access:** 
- User list: `/admin/users`
- User detail: `/admin/users/:userId`

### 3. Audit Logs

**Tracked Actions:**
- User creation, updates, deletion
- User banning/suspension
- Rate limit modifications
- System configuration changes
- Flow approvals/rejections
- Project deletions

**Features:**
- Filterable by action and email
- Pagination support
- Timestamp tracking
- Admin identification
- Reason documentation

**Access:** `/admin/audit-logs`

### 4. System Configuration

**Configurable Settings:**
- Global rate limits
- Feature flags
- System maintenance mode
- Notification settings
- Integration configurations

**Automatic Tracking:**
- All changes logged to audit trail
- Admin identification
- Before/after state preservation

### 5. Usage Analytics

**Metrics:**
- Total API requests
- Success/failure breakdown
- Average response times
- Data processed (KB)
- Success rate percentage
- Custom date range analysis

**Per User:**
- Historical usage trends
- Peak usage times
- API call patterns
- Project performance

### 6. Rate Limit Management

**Configuration Options:**
- Per minute limits
- Per hour limits
- Per day limits
- User tier assignment
- Project-specific limits

**Tiers:**
- Free: Basic limits
- Pro: Higher limits
- Enterprise: Customizable limits

## API Endpoints

### Admin Dashboard
\`\`\`
GET /api/admin/dashboard/analytics
\`\`\`

Returns: Summary stats, daily trends, recent logs

### User Management

\`\`\`
GET /api/admin/users?page=1&limit=20&search=email&status=active
GET /api/admin/users/:userId/profile
GET /api/admin/users/:userId/activity?limit=50
GET /api/admin/users/:userId/projects-stats
GET /api/admin/users/:userId/flows-stats
GET /api/admin/users/:userId/usage?startDate=2024-01-01&endDate=2024-01-31

POST /api/admin/users/:userId/ban
POST /api/admin/users/:userId/unban
DELETE /api/admin/users/:userId

PUT /api/admin/users/:userId/quota
\`\`\`

### Audit Logs
\`\`\`
GET /api/admin/audit-logs?page=1&limit=50&action=user_banned&targetEmail=test@example.com
\`\`\`

### Rate Limits
\`\`\`
POST /api/admin/rate-limits
{
  "userId": "id",
  "requestsPerMinute": 60,
  "requestsPerHour": 1000,
  "requestsPerDay": 10000,
  "tier": "free|pro|enterprise"
}
\`\`\`

### System Configuration
\`\`\`
GET /api/admin/system-config
POST /api/admin/system-config
{
  "key": "config_key",
  "value": "config_value",
  "description": "description"
}
\`\`\`

### Usage Analytics
\`\`\`
GET /api/admin/analytics/usage?userId=id&projectId=id&startDate=2024-01-01&endDate=2024-01-31
\`\`\`

## Database Models

### Admin Model
- userId: Reference to User
- role: super_admin, admin, moderator
- permissions: Array of permission strings
- isActive: Boolean
- lastLoginAt: Timestamp

### UserStatus Model
- userId: Reference to User (unique)
- status: active, suspended, banned, deleted
- reason: String (ban reason)
- bannedAt: Timestamp
- bannedBy: Reference to Admin
- suspendedUntil: Timestamp (for temporary suspension)

### RateLimitConfig Model
- userId: Reference to User
- projectId: Reference to Project
- requestsPerMinute: Number
- requestsPerHour: Number
- requestsPerDay: Number
- tier: free, pro, enterprise
- createdAt/updatedAt: Timestamps

### AuditLog Model
- adminId: Reference to Admin
- action: Action enum
- targetType: String (User, Project, Flow, etc)
- targetId: ObjectId
- targetEmail: String
- changes: Mixed object
- reason: String
- timestamp: Date with index

### UsageAnalytics Model
- userId: Reference to User
- projectId: Reference to Project
- flowId: Reference to Flow
- date: Date
- totalRequests: Number
- successfulRequests: Number
- failedRequests: Number
- avgResponseTime: Number
- totalDataProcessed: Number

## Security Features

1. **Authentication:**
   - JWT token validation
   - Token expiration
   - Secure password hashing

2. **Authorization:**
   - Role-based access control
   - Permission verification
   - Resource-level access checks

3. **Audit Trail:**
   - Complete activity logging
   - Admin identification
   - Reason documentation
   - Timestamp precision

4. **Rate Limiting:**
   - Prevent abuse
   - Per-user quotas
   - Tier-based restrictions

5. **Data Protection:**
   - Encrypted sensitive fields
   - No password exposure in logs
   - Proper database indexing

## Setup Instructions

### 1. Seed Super Admin
\`\`\`bash
cd backend
node src/services/admin/seed.js
\`\`\`

Default credentials:
- Email: admin@example.com
- Password: admin123456

**IMPORTANT: Change immediately in production!**

### 2. Create Additional Admins
\`\`\`javascript
// Use admin API endpoint
POST /api/admin/users
{
  "email": "newadmin@example.com",
  "role": "admin",
  "permissions": ["manage_users", "manage_projects"]
}
\`\`\`

### 3. Configure Initial Settings
\`\`\`javascript
// Set system configuration
POST /api/admin/system-config
{
  "key": "rate_limit_free_minute",
  "value": 10,
  "description": "Free tier requests per minute"
}
\`\`\`

## Best Practices

1. **Regular Monitoring**
   - Check dashboard daily
   - Review audit logs weekly
   - Monitor usage trends

2. **User Management**
   - Document ban reasons
   - Use suspensions for temporary issues
   - Review suspended accounts regularly

3. **Rate Limiting**
   - Set appropriate defaults
   - Adjust based on usage patterns
   - Communicate changes to users

4. **Security**
   - Use strong admin passwords
   - Rotate credentials regularly
   - Audit admin access logs
   - Limit admin user count

5. **Maintenance**
   - Archive old logs
   - Clean up deleted user data
   - Update configurations
   - Monitor system resources

## Troubleshooting

### Admin Routes Returning 403
- Verify admin role in database
- Check JWT token validity
- Confirm permissions are set

### Audit Logs Not Showing
- Check MongoDB connection
- Verify audit log model creation
- Review API error responses

### Rate Limits Not Enforcing
- Verify RateLimitConfig exists
- Check gateway middleware
- Review request headers

## Integration Points

- User authentication system
- Project management system
- Flow execution system
- Request logging system
- Email notification system (future)
- Analytics aggregation (future)

## Future Enhancements

- 2FA for admin accounts
- Email notifications for alerts
- Advanced analytics dashboards
- Automated report generation
- API usage forecasting
- Scheduled maintenance windows
- Admin activity notifications
