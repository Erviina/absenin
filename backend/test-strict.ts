import { z } from "zod"; 
const b = z.object({ a: z.string(), b: z.string() }).strict(); 
const p = b.omit({ b: true }); 
console.log(p.safeParse({ a: "hi", b: "hello" }));
