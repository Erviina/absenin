/**
 * Utility untuk sanitasi teks, pembersihan tag HTML/XSS, dan pemotongan teks aman.
 */

/**
 * Membersihkan teks dari tag HTML berbahaya, script, event handler, 
 * namun tetap mempertahankan karakter apostrof/tanda petik seperti pada 'jum\'at', 'jum"at', atau 'jum`at'.
 */
export function sanitizeText(raw: string | null | undefined): string {
  if (!raw) return "";

  let text = String(raw);

  // 1. Coba decode URI component jika teks mengandung encoded string seperti %20 atau %27
  try {
    if (/%[0-9a-fA-F]{2}/.test(text)) {
      text = decodeURIComponent(text);
    }
  } catch {
    // Biarkan teks aslinya jika decodeURIComponent gagal
  }

  // 2. Tangani escaped newlines (\\r\\n atau \\n) yang mungkin tersimpan dalam format JSON mentah
  text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");

  // 3. Konversi tag line-break dan paragraph HTML menjadi newline sebelum tag di-strip
  text = text.replace(/<br\s*[\/]?>/gi, "\n");
  text = text.replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n");
  text = text.replace(/<(p|div|h[1-6]|li)\b[^>]*>/gi, "");

  // 4. Hapus blok script dan style beserta isinya
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 5. Hapus seluruh tag HTML lainnya (misal: <body>, <b>, <img>, <meta>, dll)
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, "");

  // 6. Hapus protokol javascript: atau data: yang mencurigakan jika tersisa
  text = text.replace(/javascript\s*:/gi, "");
  text = text.replace(/data\s*:\s*text\/html/gi, "");

  // 7. Normalisasi carriage return (\r\n dan \r menjadi \n)
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 8. Rapikan spasi horizontal (spasi dan tab) per baris tanpa merusak newline
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/[ \t]*\n[ \t]*/g, "\n");

  // 9. Batasi newline beruntun maksimal 2 baris (1 baris kosong pemisah paragraf)
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Memotong teks secara aman dengan batas karakter maksimum dan menambahkan ellipsis (...)
 */
export function truncateText(raw: string | null | undefined, maxLength: number = 100): string {
  const cleaned = sanitizeText(raw).replace(/\n+/g, " ");
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trimEnd() + "...";
}
