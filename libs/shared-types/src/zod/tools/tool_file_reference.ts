import { z } from "zod"

export default z.object({ "path": z.string().describe("Relative path to the file within the tool package"), "description": z.string().describe("Human-readable description of the file's purpose"), "type": z.enum(["python","html","json"]).describe("File type classification") }).strict().describe("Reference to a file within a tool's directory structure.")
