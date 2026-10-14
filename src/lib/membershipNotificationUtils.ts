export interface MembershipNotificationInfo {
  memberName: string | null;
  approverName: string | null;
  companyName: string | null;
  statusText: string;
}

/**
 * Mem-parse teks pesan notifikasi keanggotaan untuk mendapatkan info
 * siapa yang bergabung dan siapa yang meng-approve.
 */
export function parseMembershipNotification(
  message?: string | null,
  type?: string | null
): MembershipNotificationInfo | null {
  if (!message) return null;

  let memberName: string | null = null;
  let approverName: string | null = null;
  let companyName: string | null = null;
  let statusText = "Disetujui";

  // Pola 1: "Permintaan bergabung atas nama [Member] telah disetujui oleh [Approver]. Selamat datang di [Company]!"
  const p1 = message.match(
    /Permintaan bergabung atas nama (.+?) telah disetujui oleh (.+?)\.(?:\s*Selamat datang di (.+?)[!.]?)?$/i
  );
  if (p1) {
    memberName = p1[1].trim();
    approverName = p1[2].trim();
    if (p1[3]) companyName = p1[3].trim();
    return { memberName, approverName, companyName, statusText: "Disetujui" };
  }

  // Pola 2: "[Member] telah resmi bergabung ke [Company] setelah disetujui oleh [Approver]."
  const p2 = message.match(
    /(.+?) telah resmi bergabung ke (.+?) setelah disetujui oleh ([^.]+)/i
  );
  if (p2) {
    memberName = p2[1].trim();
    companyName = p2[2].trim();
    approverName = p2[3].trim();
    return { memberName, approverName, companyName, statusText: "Bergabung" };
  }

  // Pola 3: "[Member] telah bergabung ke [Company] (Disetujui oleh: [Approver])."
  const p3 = message.match(
    /(.+?) telah bergabung ke (.+?)\s*\(Disetujui oleh:\s*([^)]+)\)/i
  );
  if (p3) {
    memberName = p3[1].trim();
    companyName = p3[2].trim();
    approverName = p3[3].trim();
    return { memberName, approverName, companyName, statusText: "Bergabung" };
  }

  // Pola 4: "Permohonan keluar atas nama [Member] telah disetujui oleh [Approver]..."
  const p4 = message.match(
    /Permohonan keluar atas nama (.+?) telah disetujui oleh ([^.]+)/i
  );
  if (p4) {
    memberName = p4[1].trim();
    approverName = p4[2].trim();
    return { memberName, approverName, companyName: null, statusText: "Keluar Disetujui" };
  }

  // Pola 5: "Keanggotaan atas nama [Member] telah dinonaktifkan oleh [Approver]..."
  const p5 = message.match(
    /Keanggotaan atas nama (.+?) telah dinonaktifkan oleh ([^.]+)/i
  );
  if (p5) {
    memberName = p5[1].trim();
    approverName = p5[2].trim();
    return { memberName, approverName, companyName: null, statusText: "Dinonaktifkan" };
  }

  // Pola Fallback: deteksi approver dan nama pemohon umum
  const pGeneric = message.match(/disetujui oleh:?\s*([^.,\n)]+)/i);
  if (pGeneric) {
    approverName = pGeneric[1].trim();
  }

  const pMember = message.match(/atas nama\s+([^,.\n]+?)\s+telah/i);
  if (pMember) {
    memberName = pMember[1].trim();
  }

  if (approverName || memberName) {
    return { memberName, approverName, companyName, statusText };
  }

  return null;
}
