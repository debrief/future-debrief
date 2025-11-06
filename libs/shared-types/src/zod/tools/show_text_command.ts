import { z } from "zod"

export default z.object({ "command": z.literal("showText").default("showText"), "payload": z.string().describe("Text message to display to the user") }).strict().describe("Command to display text to the user.")
