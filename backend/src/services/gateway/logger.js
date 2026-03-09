import { query } from "../../config/db.js";

export const logRequest = async (data) => {
  try {
    await query(
      `INSERT INTO request_logs (project_id, flow_id, user_id, method, path, status, duration) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.projectId,
        data.flowId || null,
        data.userId,
        data.method,
        data.path,
        data.status,
        data.duration,
      ],
    );
  } catch (error) {
    console.error("Logging error:", error);
  }
};
