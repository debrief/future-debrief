import { z } from "zod"

export default z.object({ "name": z.string().describe("The name of the tool to call"), "arguments": z.array(z.any()).describe("Tool arguments as an array of named parameters") }).strict().describe("Request model for tool call endpoint matching current Pydantic implementation.")
