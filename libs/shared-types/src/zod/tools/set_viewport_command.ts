import { z } from "zod"

export default z.object({ "command": z.literal("setViewport").default("setViewport"), "payload": z.any().describe("Viewport state to set") }).strict().describe("Command to update the map viewport.")
