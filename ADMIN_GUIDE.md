# Admin Panel Documentation

## Overview

The NoCodeAPI admin panel provides comprehensive management and monitoring capabilities for platform administrators.

## Accessing Admin Panel

1. Login with admin credentials
2. Navigate to `/admin` or click "Admin Panel" from user menu
3. You'll see the admin sidebar with navigation options

## Admin Roles & Permissions

### Super Admin
- Full access to all admin features
- User management (ban, suspend, delete)
- System configuration
- Rate limit management
- Audit log access

### Admin
- User management (ban, suspend)
- Dashboard analytics
- Audit log access
- Cannot modify system configuration

### Moderator
- View analytics
- Read-only audit logs
- Cannot perform actions

## Admin Features

### 1. Dashboard
**Location:** `/admin`

Displays:
- Total users, active users, suspended, banned counts
- Daily API request statistics
- Average response time trends
- Total projects and flows
- Total API requests

### 2. User Management
**Location:** `/admin/users`

Capabilities:
- Search users by email or username
- View user details and status
- Ban/suspend users with reason
- Unban users
- Pagination support

**Ban vs Suspend:**
- **Ban:** Permanent account restriction
- **Suspend:** Temporary (duration configurable)

### 3. Audit Logs
**Location:** `/admin/audit-logs`

Track all admin actions:
- User management actions
- System configuration changes
- Rate limit modifications
- Flow approvals/rejections
- Timestamps and admin identification
- Filter by email or action type

## Admin API Endpoints

### Dashboard Analytics
\`\`\`
GET /api/admin/dashboard/analytics
\`\`\`

### User Management
\`\`\`
GET /api/admin/users?page=1&limit=20&search=email&status=active
POST /api/admin/users/:userId/ban
POST /api/admin/users/:userId/unban
DELETE /api/admin/users/:userId
\`\`\`

### Rate Limits
\`\`\`
POST /api/admin/rate-limits
{
  "userId": "id",
  "projectId": "id",
  "requestsPerMinute": 60,
  "requestsPerHour": 1000,
  "requestsPerDay": 10000,
  "tier": "free|pro|enterprise"
}
\`\`\`

### Audit Logs
\`\`\`
GET /api/admin/audit-logs?page=1&limit=50&action=user_banned&targetEmail=test@example.com
\`\`\`

### System Configuration
\`\`\`
GET /api/admin/system-config
POST /api/admin/system-config
{
  "key": "config_key",
  "value": "config_value",
  "description": "Config description"
}
\`\`\`

### Usage Analytics
\`\`\`
GET /api/admin/analytics/usage?userId=id&projectId=id&startDate=2024-01-01&endDate=2024-01-31
\`\`\`

## Setting Up Admin Users

### Seed Super Admin

1. Navigate to backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Run seed script:
\`\`\`bash
node src/services/admin/seed.js
\`\`\`

3. Default credentials:
- Email: `admin@example.com`
- Password: `admin123456`

**Important:** Change these credentials in production!

### Create Additional Admins

Use the admin API to create additional admin users:

\`\`\`javascript
// Backend
const { createAdmin } = require('./src/services/admin/controllers.js');

await createAdmin(userId, 'admin', [
  'manage_users',
  'manage_projects',
  'manage_quotas',
  'view_analytics'
]);
\`\`\`

## Security Best Practices

1. **Admin Authentication**
   - Use strong passwords
   - Enable 2FA when available
   - Regularly rotate credentials

2. **Audit Trail**
   - All admin actions are logged
   - Review audit logs regularly
   - Check for suspicious activities

3. **Rate Limiting**
   - Set appropriate limits per tier
   - Monitor usage patterns
   - Adjust dynamically based on needs

4. **User Management**
   - Verify ban reasons
   - Maintain audit trail of suspensions
   - Document policy violations

## Monitoring & Alerts

### Key Metrics to Monitor
- Daily API request count
- Average response times
- Error rates
- User growth
- Suspicious user activities

### Common Issues & Solutions

**High Response Times:**
- Check database load
- Review flow complexity
- Consider caching strategies

**High Error Rate:**
- Check logs for common errors
- Review recent flow deployments
- Contact affected users

**Unusual User Activity:**
- Review audit logs
- Check for automated abuse
- Consider rate limiting adjustments

## Advanced Configuration

### Custom Permissions

Define custom permission sets:

\`\`\`javascript
const customPermissions = [
  'manage_users',
  'manage_projects',
  'manage_flows',
  'manage_quotas',
  'manage_system',
  'view_analytics',
  'view_audit_logs'
];
\`\`\`

### Rate Tier Configuration

\`\`\`javascript
const tiers = {
  free: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    requestsPerDay: 1000
  },
  pro: {
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    requestsPerDay: 50000
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000
  }
};
\`\`\`

## Troubleshooting

### Admin Routes Not Accessible
- Verify admin role in database
- Check JWT token validity
- Ensure CORS is configured correctly

### Audit Logs Not Recording
- Check if adminId is properly set
- Verify MongoDB connection
- Check error logs for issues

### Rate Limits Not Enforcing
- Verify RateLimitConfig exists
- Check gateway rate limit middleware
- Review Redis/cache configuration

## Support

For issues or questions:
1. Check audit logs for context
2. Review API error responses
3. Contact technical support team
\`\`\`

Now let me update the backend auth routes to include role information in the response:
