import { z } from "zod"

export default z.object({ "type": z.literal("FeatureCollection").default("FeatureCollection"), "features": z.array(z.any().superRefine((x, ctx) => {
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
  })).describe("Array of Debrief features"), "bbox": z.union([z.array(z.number()).min(4).max(6), z.null()]).describe("Bounding box of the feature collection").default(null), "properties": z.union([z.any(), z.null()]).default(null) }).strict().describe("A GeoJSON FeatureCollection containing mixed feature types for maritime analysis.")
