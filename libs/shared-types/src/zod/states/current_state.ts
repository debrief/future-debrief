import { z } from "zod"

export default z.object({ "editorId": z.string().describe("Unique identifier for the editor"), "filename": z.string().describe("Filename of the document being edited"), "editorState": z.any().describe("Complete editor state containing all sub-states"), "historyCount": z.number().int().gte(0).describe("History count for this editor") }).strict().describe("Complete current state information for a Debrief editor including metadata.")
