import { z } from "zod"

export default z.object({ "command": z.literal("setSelection").default("setSelection"), "payload": z.any().describe("Selection state to set") }).strict().describe("Command to update feature selection.")
