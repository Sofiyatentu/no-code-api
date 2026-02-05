import db from "../../config/db.js";

// Create admin user
export async function createAdmin(userId, role, permissions) {
  const result = await db.query(
    `INSERT INTO admins (user_id, role, permissions) VALUES ($1, $2, $3) RETURNING *`,
    [userId, role, JSON.stringify(permissions)],
  );
  return result.rows[0];
}

// Get admin by user ID
export async function getAdminByUserId(userId) {
  const result = await db.query(`SELECT * FROM admins WHERE user_id = $1`, [
    userId,
  ]);
  return result.rows[0];
}

// Update admin permissions
export async function updateAdminPermissions(adminId, permissions) {
  const result = await db.query(
    `UPDATE admins SET permissions = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(permissions), adminId],
  );
  return result.rows[0];
}

// Get audit logs with pagination
export async function getAuditLogs({ filter = {}, page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;

  let where = [];
  let params = [];
  let idx = 1;
  if (filter.adminId) {
    where.push(`admin_id = $${idx}`);
    params.push(filter.adminId);
    idx++;
  }
  if (filter.action) {
    where.push(`action = $${idx}`);
    params.push(filter.action);
    idx++;
  }
  if (filter.targetType) {
    where.push(`target_type = $${idx}`);
    params.push(filter.targetType);
    idx++;
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const logsResult = await db.query(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    params.concat([limit, skip]),
  );
  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs ${whereClause}`,
    params,
  );
  const total = Number(countResult.rows[0].count);
  return {
    logs: logsResult.rows,
    pagination: { total, pages: Math.ceil(total / limit), currentPage: page },
  };
}
