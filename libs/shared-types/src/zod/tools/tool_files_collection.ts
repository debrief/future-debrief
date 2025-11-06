import { z } from "zod"

export default z.object({ "execute": z.any().describe("Main tool implementation file"), "source_code": z.any().describe("Pretty-printed source code file"), "git_history": z.any().describe("Git commit history file"), "inputs": z.array(z.any()).describe("Sample input files for testing the tool").optional(), "schemas": z.array(z.any()).describe("Generated schema documents associated with this tool").optional() }).describe("Collection of files within a tool's directory structure.")
