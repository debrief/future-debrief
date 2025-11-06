import { z } from "zod"

export default z.object({ "command": z.literal("setFeatureCollection").default("setFeatureCollection"), "payload": z.any().describe("Complete Debrief FeatureCollection to replace current features") }).strict().describe("Command to replace the entire feature collection.")
