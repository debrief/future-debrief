import { z } from "zod"

export default z.object({ "path": z.string().describe("Relative path to the file within the tool package"), "description": z.string().describe("Human-readable description of the file's purpose"), "type": z.enum(["python","html","json"]).describe("File type classification"), "name": z.string().describe("Display name for the sample input") }).strict().describe("Reference to a sample input file with additional metadata.")
