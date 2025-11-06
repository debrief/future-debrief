import { z } from "zod"

export default z.object({ "tools": z.array(z.any()).describe("Array of available tools"), "version": z.union([z.string(), z.null()]).describe("Optional version identifier for the tool collection").default(null), "description": z.union([z.string(), z.null()]).describe("Optional description of the tool collection").default(null) }).strict().describe("Response format for listing available tools.")
