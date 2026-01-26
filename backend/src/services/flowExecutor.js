// services/flowExecutor.js
import mongoose from "mongoose"
import crypto from "crypto"
import { executeFlow } from "./runtime/executor.js"
import dotenv from "dotenv"

dotenv.config()


const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex")
const ALGORITHM = "aes-256-gcm"

const decryptMongoUri = (encrypted) => {
    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            ENCRYPTION_KEY,
            Buffer.from(encrypted.iv, "hex")
        )
        decipher.setAuthTag(Buffer.from(encrypted.authTag, "hex"))

        const decrypted = Buffer.concat([
            decipher.update(encrypted.content, "hex"),
            decipher.final(),
        ])

        return decrypted.toString("utf8")
    } catch (err) {
        throw new Error("Failed to decrypt database credentials")
    }
}

export const executeUserFlow = async (project, requestContext) => {
    const mongoUri = decryptMongoUri(project.mongoUri)
    let userConnection

    try {
        userConnection = mongoose.createConnection(mongoUri, {
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
        })

        await userConnection.asPromise()

        const result = await executeFlow(project.flow, requestContext, userConnection)

        return result
    } catch (error) {
        console.error("[Flow Executor] Execution failed:", {
            projectId: project._id,
            error: error.message,
        })
        return {
            status: 500,
            headers: { "Content-Type": "application/json" },
            body: { error: "Flow execution failed", message: error.message },
        }
    } finally {
        if (userConnection) {
            await userConnection.close().catch((err) => console.error("Failed to close MongoDB connection:", err))
        }
    }
}