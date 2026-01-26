import { Log } from "./models.js"

export const logRequest = async (data) => {
  try {
    const log = new Log(data)
    await log.save()
    return log
  } catch (error) {
    console.error("Failed to log request:", error)
  }
}
