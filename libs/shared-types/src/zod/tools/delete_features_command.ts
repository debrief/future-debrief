import { z } from "zod"

export default z.object({ "command": z.literal("deleteFeatures").default("deleteFeatures"), "payload": z.array(z.string()).describe("Array of feature IDs to delete from the map") }).strict().describe("Command to delete features from the map.")
