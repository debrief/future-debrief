import { z } from "zod"

export default z.object({ "command": z.literal("addFeatures").default("addFeatures"), "payload": z.array(z.any().superRefine((x, ctx) => {
    const schemas = [z.any(), z.any(), z.any(), z.union([z.any(), z.any(), z.any()]), z.any(), z.any()];
    const errors = schemas.reduce<z.ZodError[]>(
      (errors, schema) =>
        ((result) =>
          result.error ? [...errors, result.error] : errors)(
          schema.safeParse(x),
        ),
      [],
    );
    if (schemas.length - errors.length !== 1) {
      ctx.addIssue({
        path: ctx.path,
        code: "invalid_union",
        unionErrors: errors,
        message: "Invalid input: Should pass single schema",
      });
    }
  })).describe("Array of Debrief features to add to the map") }).strict().describe("Command to add Debrief features to the map.")
