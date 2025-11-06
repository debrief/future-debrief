import { z } from "zod"

export default z.object({ "bounds": z.array(z.number()).min(4).max(4).describe("Map bounds as [west, south, east, north] in decimal degrees") }).describe("State representing the current map viewport bounds in a Debrief editor.")
