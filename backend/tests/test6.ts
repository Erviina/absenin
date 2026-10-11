import { z } from "zod";

const updateCompanySchema = z.object({
  name: z.string().optional(),
}).refine(data => data.name !== undefined, {
  message: "Minimal satu field harus diisi"
});

const res = updateCompanySchema.safeParse({});
console.log(res);
if (!res.success) {
  console.log("errors object:", res.error.errors);
}
