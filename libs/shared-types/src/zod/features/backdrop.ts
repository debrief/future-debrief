import { z } from "zod"

export default z.object({ "bbox": z.union([z.array(z.any()).min(4).max(4), z.array(z.any()).min(6).max(6), z.null()]).default(null), "type": z.literal("Feature"), "geometry": z.union([z.any(), z.null()]), "properties": z.union([z.any(), z.null()]), "id": z.union([z.number().int(), z.string(), z.null()]).default(null) }).strict().describe("A GeoJSON Feature representing a backdrop tile layer configuration.\n\nNote: Uses MultiPoint with empty coordinates as it's not a geographic feature to render.")
