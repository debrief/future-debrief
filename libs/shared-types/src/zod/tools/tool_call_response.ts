import { z } from "zod"

export default z.object({ "result": z.any().describe("A command that triggers state changes in Debrief"), "isError": z.boolean().describe("Optional flag indicating if the result represents an error condition").default(false) }).strict().describe("Response format for tool execution results containing Debrief commands.")
