import { z } from "zod"

export default z.object({ "hash": z.string().describe("Git commit hash"), "author": z.union([z.any(), z.string()]).describe("Commit author information (object or string for backward compatibility)"), "date": z.string().describe("Commit date in ISO format"), "message": z.string().describe("Commit message") }).strict().describe("A single git commit entry in tool development history.")
