import { z } from "zod"

export default z.object({ "buildDate": z.string().describe("ISO timestamp when the package was built"), "commit": z.string().describe("Git commit hash used for the build"), "author": z.string().describe("Author of the package build") }).strict().describe("Package build and metadata information.")
