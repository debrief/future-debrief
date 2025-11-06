import { z } from "zod"

export default z.object({ "commits": z.array(z.any()).describe("List of git commits in chronological order").optional() }).strict().describe("Collection of git commits for a tool.")
