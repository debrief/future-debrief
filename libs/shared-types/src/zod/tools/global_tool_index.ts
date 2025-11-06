import { z } from "zod"

export default z.object({ "root": z.array(z.union([z.any(), z.any()])).describe("Root level nodes - can contain tools and/or categories"), "version": z.string().describe("Version identifier for the tool collection"), "description": z.string().describe("Description of the tool collection"), "packageInfo": z.union([z.any(), z.null()]).describe("Optional package build metadata").default(null) }).strict().describe("Global index for all tools in a package with hierarchical structure.")
