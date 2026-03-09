// services/flowExecutor.js
import { MongoClient } from "mongodb";
import crypto from "crypto";
import { executeFlow } from "./runtime/executor.js";
import dotenv from "dotenv";

dotenv.config();

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
const ALGORITHM = "aes-256-gcm";

const decryptMongoUri = (encrypted) => {
  try {
    // Handle both string (JSON) and object forms
    const data =
      typeof encrypted === "string" ? JSON.parse(encrypted) : encrypted;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(data.iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(data.authTag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(data.content, "hex"),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    throw new Error("Failed to decrypt database credentials");
  }
};

const MONGO_NODE_TYPES = [
  "mongodb",
  "mongoFind",
  "mongoInsert",
  "mongoUpdate",
  "mongoDelete",
  "dbNode",
];

const flowNeedsMongo = (flow) => {
  const nodes =
    typeof flow.nodes === "string" ? JSON.parse(flow.nodes) : flow.nodes;
  return nodes.some((n) =>
    MONGO_NODE_TYPES.includes(n.data?.nodeType || n.type),
  );
};

export const executeUserFlow = async (project, requestContext) => {
  let client = null;

  console.log(`[FlowExecutor] Starting execution for project: ${project.id}`);
  console.log(
    `[FlowExecutor] Request: ${requestContext.method} ${requestContext.path}`,
  );
  console.log(
    `[FlowExecutor] Flow nodes count:`,
    project.flow?.nodes?.length || 0,
  );
  console.log(`[FlowExecutor] Needs MongoDB:`, flowNeedsMongo(project.flow));

  try {
    // Only connect to MongoDB if the flow actually uses MongoDB nodes
    if (flowNeedsMongo(project.flow)) {
      const mongoUri = decryptMongoUri(project.mongo_uri);
      client = new MongoClient(mongoUri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
      });
      await client.connect();
    }

    const result = await executeFlow(project.flow, requestContext, client);

    return result;
  } catch (error) {
    console.error("[Flow Executor] Execution failed:", {
      projectId: project.id,
      error: error.message,
    });
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Flow execution failed", message: error.message },
    };
  } finally {
    if (client) {
      await client
        .close()
        .catch((err) =>
          console.error("Failed to close MongoDB connection:", err),
        );
    }
  }
};
