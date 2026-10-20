/**
 * Utility untuk membagikan konten (Berita, Tugas, Agenda) melalui Web Share API
 * dengan fallback ke Clipboard API jika tidak didukung.
 */
export async function shareContent(options: {
  title: string;
  text?: string;
  path: string;
  onSuccess?: () => void;
  onToast?: (message: string, type: "success" | "error" | "info") => void;
}): Promise<boolean> {
  const url = typeof window !== "undefined" ? `${window.location.origin}${options.path}` : options.path;

  // Coba Web Share API bawaan peramban (misal di smartphone / browser modern)
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: options.title,
        text: options.text || options.title,
        url,
      });
      options.onSuccess?.();
      return true;
    } catch (err: any) {
      // Jika pengguna membatalkan dialog share (klik di luar atau tekan tombol cancel)
      if (err.name === "AbortError") {
        return false;
      }
      console.warn("navigator.share gagal, menggunakan fallback clipboard:", err);
    }
  }

  // Fallback: Salin tautan ke Clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(url);
      options.onSuccess?.();
      return true;
    } catch (clipErr) {
      console.error("Gagal menyalin via navigator.clipboard:", clipErr);
    }
  }

  // Fallback untuk browser lawas / lingkungan non-secure
  try {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      options.onSuccess?.();
      return true;
    }
  } catch (e) {
    console.error("execCommand fallback failed:", e);
  }

  if (options.onToast) {
    options.onToast("Gagal menyalin tautan", "error");
  }
  return false;
}
