import { z } from "zod"

export default z.object({ "name": z.string().describe("Author's full name"), "email": z.string().describe("Author's email address") }).strict().describe("Git commit author information.")
