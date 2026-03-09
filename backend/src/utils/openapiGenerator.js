// src/utils/openapiGenerator.js

import { query } from "../config/db.js";

export const generateOpenAPISpec = async (username, projectSlug) => {
  const userResult = await query("SELECT id FROM users WHERE username = $1", [
    username,
  ]);
  if (userResult.rows.length === 0) return null;
  const user = userResult.rows[0];

  const projectResult = await query(
    "SELECT id, name, description FROM projects WHERE user_id = $1 AND slug = $2 AND status = 'active'",
    [user.id, projectSlug],
  );
  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  // Get deployed flow
  const flowResult = await query(
    "SELECT nodes, edges, version FROM flows WHERE project_id = $1 AND deployed = true ORDER BY deployed_at DESC LIMIT 1",
    [project.id],
  );
  if (flowResult.rows.length === 0) return null;
  const flow = flowResult.rows[0];

  const nodes =
    typeof flow.nodes === "string" ? JSON.parse(flow.nodes) : flow.nodes;
  const edges =
    typeof flow.edges === "string" ? JSON.parse(flow.edges) : flow.edges;

  if (!nodes || nodes.length === 0) return null;

  const paths = {};
  const components = { schemas: {} };

  // Extract HTTP Method nodes
  const httpNodes = nodes.filter((n) => n.type === "httpMethod");
  const responseNodes = nodes.filter((n) => n.type === "response");

  for (const httpNode of httpNodes) {
    const config = httpNode.data?.config || {};
    const method = (config.method || "get").toLowerCase();
    const path = config.path || "/";

    // Normalize path: /users/:id -> /users/{id}
    const openApiPath = path.replace(/:([^/]+)/g, "{$1}");

    if (!paths[openApiPath]) paths[openApiPath] = {};

    // Find connected response node
    const edge = edges.find((e) => e.source === httpNode.id);
    const responseNode = edge
      ? responseNodes.find((n) => n.id === edge.target)
      : null;
    const responseBody = responseNode?.data?.config?.body || "{}";

    // Try to infer response schema
    let responseSchema = {};
    try {
      const parsed = JSON.parse(
        responseBody.replace(/\$\[.*?\]/g, '"{{dynamic}}"'),
      );
      responseSchema = { type: "object", properties: inferSchema(parsed) };
    } catch {
      responseSchema = { type: "object" };
    }

    paths[openApiPath][method] = {
      summary: config.description || `${method.toUpperCase()} ${path}`,
      parameters: extractPathParams(path)
        .map((name) => ({
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        }))
        .concat(
          extractQueryParams(config.query || "").map((name) => ({
            name,
            in: "query",
            schema: { type: "string" },
          })),
        ),
      requestBody:
        method !== "get" && method !== "head"
          ? {
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            }
          : undefined,
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: responseSchema },
          },
        },
        404: { description: "Not found" },
        500: { description: "Server error" },
      },
    };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: `${project.name} API`,
      description: project.description || "Auto-generated API",
      version: String(flow.version || "1.0.0"),
    },
    servers: [{ url: `/${username}/${projectSlug}` }],
    paths,
    components,
  };
};

// Helpers
const extractPathParams = (path) =>
  (path.match(/:([^/]+)/g) || []).map((p) => p.slice(1));
const extractQueryParams = (queryStr) =>
  (queryStr.match(/\{\{query\.([^}]+)\}\}/g) || []).map(
    (q) => q.match(/query\.([^}]+)/)[1],
  );

const inferSchema = (obj) => {
  if (obj === null || obj === undefined) return { type: "string" };
  if (Array.isArray(obj))
    return {
      type: "array",
      items: obj.length > 0 ? inferSchema(obj[0]) : { type: "string" },
    };
  if (typeof obj === "object") {
    const props = {};
    for (const [key, val] of Object.entries(obj)) {
      props[key] = inferSchema(val);
    }
    return props;
  }
  return { type: typeof obj };
};

// const inferSchema = (obj) => {
//     if (Array.isArray(obj)) return { type: "array", items: inferSchema(obj[0] || {}) }
//     if (obj && typeof obj === "object") {
//         const props = {}
//         for (const [k, v] of Object.entries(obj)) {
//             props[k] = v === "{{dynamic}}" ? { type: "string" } : inferSchema(v)
//         }
//         return { type: "object", properties: props }
//     }
//     return { type: typeof obj }
