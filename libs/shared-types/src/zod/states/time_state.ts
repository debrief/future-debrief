import { z } from "zod"

export default z.object({ "current": z.string().datetime({ offset: true }).describe("Current time position as ISO 8601 date-time string"), "start": z.string().datetime({ offset: true }).describe("Start time of the overall time range as ISO 8601 date-time string"), "end": z.string().datetime({ offset: true }).describe("End time of the overall time range as ISO 8601 date-time string") }).describe("State representing the current time position in a Debrief editor.")
