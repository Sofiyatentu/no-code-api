// src/modules/api/utils/openapiGenerator.js

import { User } from "../services/auth/models"
import { Project } from "../services/projects/models"

export const generateOpenAPISpec = async (username, projectSlug) => {
    const user = await User.findOne({ username }).lean()
    if (!user) return null

    const project = await Project.findOne({
        userId: user._id,
        slug: projectSlug,
        status: "active",
    })
        .select("name description flow")
        .lean()

    if (!project || !project.flow?.nodes) return null

    const paths = {}
    const components = { schemas: {} }

    // Extract HTTP Method nodes
    const httpNodes = project.flow.nodes.filter(n => n.type === "httpMethod")
    const responseNodes = project.flow.nodes.filter(n => n.type === "response")

    for (const httpNode of httpNodes) {
        const config = httpNode.data?.config || {}
        const method = (config.method || "get").toLowerCase()
        const path = config.path || "/"

        // Normalize path: /users/:id → /users/{id}
        const openApiPath = path.replace(/:([^\/]+)/g, "{$1}")

        if (!paths[openApiPath]) paths[openApiPath] = {}

        // Find connected response node
        const edge = project.flow.edges.find(e => e.source === httpNode.id)
        const responseNode = edge ? responseNodes.find(n => n.id === edge.target) : null
        const responseBody = responseNode?.data?.config?.body || "{}"

        // Try to infer response schema
        let responseSchema = {}
        try {
            const parsed = JSON.parse(responseBody.replace(/\$\[.*?\]/g, '"{{dynamic}}"'))
            responseSchema = { type: "object", properties: inferSchema(parsed) }
        } catch {
            responseSchema = { type: "object" }
        }

        paths[openApiPath][method] = {
            summary: config.description || `${method.toUpperCase()} ${path}`,
            parameters: extractPathParams(path).map(name => ({
                name,
                in: "path",
                required: true,
                schema: { type: "string" },
            })).concat(
                extractQueryParams(config.query || "").map(name => ({
                    name,
                    in: "query",
                    schema: { type: "string" },
                }))
            ),
            requestBody: method !== "get" && method !== "head" ? {
                content: {
                    "application/json": {
                        schema: { type: "object" }
                    }
                }
            } : undefined,
            responses: {
                "200": {
                    description: "Success",
                    content: {
                        "application/json": { schema: responseSchema }
                    }
                },
                "404": { description: "Not found" },
                "500": { description: "Server error" }
            }
        }
    }

    return {
        openapi: "3.0.3",
        info: {
            title: `${project.name} API`,
            description: project.description || "Auto-generated API",
            version: project.flow.version || "1.0.0",
        },
        servers: [{ url: `/api/${username}/${projectSlug}` }],
        paths,
        components,
    }
}

// Helpers
const extractPathParams = (path) => (path.match(/:([^\/]+)/g) || []).map(p => p.slice(1))
const extractQueryParams = (query) => (query.match(/\{\{query\.([^}]+)\}\}/g) || []).map(q => q.match(/query\.([^}]+)/)[1])

const inferSchema = (obj) => {
    if (Array.isArray(obj)) return { type: "array", items: inferSchema(obj[0] || {}) }
    if (obj && typeof obj === "object") {
        const props = {}
        for (const [k, v] of Object.entries(obj)) {
            props[k] = v === "{{dynamic}}" ? { type: "string" } : inferSchema(v)
        }
        return { type: "object", properties: props }
    }
    return { type: typeof obj }
}