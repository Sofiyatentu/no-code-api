import { query } from "../../config/db.js";

export const logRequest = async (data) => {
  try {
    const result = await query(
      `INSERT INTO logs (
        project_id, flow_id, user_id, method, path, status, duration, request_body, response_body, error, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.projectId,
        data.flowId,
        data.userId,
        data.method,
        data.path,
        data.status,
        data.duration,
        data.requestBody ? JSON.stringify(data.requestBody) : null,
        data.responseBody ? JSON.stringify(data.responseBody) : null,
        data.error,
        data.timestamp || new Date(),
      ],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Failed to log request:", error);
  }
};
