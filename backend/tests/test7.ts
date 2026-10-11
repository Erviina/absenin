import { z } from "zod";

const updateCompanySchema = z.object({
  name: z.string().optional(),
}).refine(data => data.name !== undefined, {
  message: "Minimal satu field harus diisi"
});

const res = updateCompanySchema.safeParse({});
if (!res.success) {
  console.log("Keys of res.error:", Object.keys(res.error));
  console.log("res.error.errors:", res.error.errors);
  console.log("res.error.issues:", res.error.issues);
}
