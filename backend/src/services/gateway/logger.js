import { RequestLog } from "./models.js"

export const logRequest = async (data) => {
  try {
    const log = new RequestLog(data)
    await log.save()
  } catch (error) {
    console.error("Logging error:", error)
  }
}
