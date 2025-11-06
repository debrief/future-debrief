import { z } from "zod"

export default z.object({ "command": z.literal("logMessage").default("logMessage"), "payload": z.union([z.string(), z.any()]).describe("Log message string or structured log payload") }).strict().describe("Command to log a message.")
