import { z } from "zod"

export default z.object({ "featureCollection": z.union([z.any(), z.null()]).describe("The GeoJSON FeatureCollection data").default(null), "timeState": z.union([z.any(), z.null()]).describe("Current time position state").default(null), "viewportState": z.union([z.any(), z.null()]).describe("Current map viewport bounds state").default(null), "selectionState": z.union([z.any(), z.null()]).describe("Current feature selection state").default(null) }).strict().describe("Aggregated state for a Debrief editor instance containing all sub-state types.")
