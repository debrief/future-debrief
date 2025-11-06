import { z } from "zod"

export default z.object({ "message": z.string().describe("Log message content"), "level": z.any().describe("Log level").default("info"), "timestamp": z.union([z.string(), z.null()]).describe("Optional timestamp").default(null) }).strict().describe("Structured payload for logMessage command.")
