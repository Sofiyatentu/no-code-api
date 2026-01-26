// src/modules/api/routes/openapi.js
import express from "express"
import swaggerUi from "swagger-ui-express"

import { generateOpenAPISpec } from "../utils/openapiGenerator.js"

const router = express.Router({ mergeParams: true })

// Serve Swagger UI
router.get("/docs", async (req, res) => {
    const { username, projectSlug } = req.params
    const spec = await generateOpenAPISpec(username, projectSlug)

    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${username}/${projectSlug} - API Docs</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
        <style>
          body { margin: 0; padding: 0; }
          .swagger-ui .topbar { background: #1a1a1a; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            SwaggerUIBundle({
              spec: ${JSON.stringify(spec)},
              dom_id: '#swagger-ui',
              presets: [SwaggerUIBundle.presets.apis],
            });
          };
        </script>
      </body>
    </html>
  `)
})

// Return raw OpenAPI JSON
router.get("/openapi.json", async (req, res) => {
    const { username, projectSlug } = req.params
    const spec = await generateOpenAPISpec(username, projectSlug)
    res.json(spec)
})

export default router