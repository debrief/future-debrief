import { z } from "zod"

export default z.object({ "tool_name": z.string().describe("The name of the tool"), "description": z.string().describe("Human-readable description of what the tool does"), "files": z.any().describe("Files associated with this tool"), "stats": z.any().describe("Statistics about this tool") }).strict().describe("Index data for an individual tool (replaces packager.py:358-399 dictionary structure).")
