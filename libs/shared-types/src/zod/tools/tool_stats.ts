import { z } from "zod"

export default z.object({ "sample_inputs_count": z.number().int().gte(0).describe("Number of sample input files available for this tool").default(0), "git_commits_count": z.number().int().gte(0).describe("Number of git commits in this tool's development history").default(0), "source_code_length": z.number().int().gte(0).describe("Length of the tool's source code in characters").default(0) }).strict().describe("Statistics about a tool's development and usage.")
