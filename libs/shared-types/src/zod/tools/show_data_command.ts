import { z } from "zod"

export default z.object({ "command": z.literal("showData").default("showData"), "payload": z.union([z.any(), z.record(z.any())]).describe("Structured data object or raw data to display") }).strict().describe("Command to display structured data to the user.")
