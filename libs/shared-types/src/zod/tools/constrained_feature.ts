import { z } from "zod"

export default z.object({ "allowedGeometryTypes": z.union([z.array(z.any()), z.null()]).describe("Allowed GeoJSON geometry types").default(null), "allowedDataTypes": z.union([z.array(z.any()), z.null()]).describe("Allowed feature.properties.dataType values").default(null), "feature": z.union([z.any(), z.any(), z.any()]).describe("The constrained feature") }).strict().describe("A DebriefFeature with constraints on geometry type and/or dataType.")
