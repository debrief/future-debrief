import { z } from "zod"

export default z.object({ "type": z.union([z.any(), z.null()]).default(null), "properties": z.union([z.record(z.any()), z.null()]).default(null), "required": z.union([z.array(z.string()), z.null()]).default(null), "additionalProperties": z.union([z.boolean(), z.any(), z.null()]).default(null), "description": z.union([z.string(), z.null()]).default(null) }).catchall(z.any()).describe("A JSON Schema object for defining data structure constraints.")
