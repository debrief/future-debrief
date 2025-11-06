import { z } from "zod"

export default z.object({ "name": z.string().describe("Display name for the sample input"), "file": z.string().describe("Filename of the sample input"), "data": z.record(z.any()).describe("The actual sample input data") }).strict().describe("Sample input data for tool testing.")
