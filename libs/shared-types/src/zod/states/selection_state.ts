import { z } from "zod"

export default z.object({ "selectedIds": z.array(z.union([z.string(), z.number().int()])).describe("Array of selected feature IDs") }).describe("State representing the currently selected features in a Debrief editor.")
