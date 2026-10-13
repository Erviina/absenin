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
  // Dibungkus try-catch agar jika format % tidak valid tidak melempar URIError
  try {
    if (/%[0-9a-fA-F]{2}/.test(text)) {
      text = decodeURIComponent(text);
    }
  } catch {
    // Biarkan teks aslinya jika decodeURIComponent gagal
  }

  // 2. Hapus blok script dan style beserta isinya
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. Hapus seluruh tag HTML lainnya (misal: <body>, <b>, <img>, <meta>, <div>, <acx>, dll)
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, "");

  // 4. Hapus protokol javascript: atau data: yang mencurigakan jika tersisa
  text = text.replace(/javascript\s*:/gi, "");
  text = text.replace(/data\s*:\s*text\/html/gi, "");

  // 5. Rapikan spasi berlebih
  text = text.replace(/[ \t]+/g, " ");

  return text.trim();
}

/**
 * Memotong teks secara aman dengan batas karakter maksimum dan menambahkan ellipsis (...)
 */
export function truncateText(raw: string | null | undefined, maxLength: number = 100): string {
  const cleaned = sanitizeText(raw);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trimEnd() + "...";
}
