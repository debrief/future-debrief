import { z } from "zod"

export default z.object({ "command": z.literal("showImage").default("showImage"), "payload": z.any().describe("Image data and metadata") }).strict().describe("Command to display an image to the user.")
