import { z } from "zod";

const agendaSchema = z.object({
  title: z.string().min(1, "Judul agenda tidak boleh kosong"),
  notes: z.string().optional(),
  start_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu mulai tidak valid"),
  end_time: z.string().refine(val => !isNaN(Date.parse(val)), "Format waktu selesai tidak valid"),
  agenda_category_id: z.string().uuid().nullable().optional(),
  type: z.enum(["COMPANY", "PERSONAL"])
}).strict().refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: "Waktu selesai tidak boleh lebih awal dari waktu mulai",
  path: ["end_time"]
});

try {
  const patchSchema = (agendaSchema as any).omit({ type: true });
  console.log("Success patchSchema");
} catch(e: any) {
  console.error("Error omit:", e.message);
}
