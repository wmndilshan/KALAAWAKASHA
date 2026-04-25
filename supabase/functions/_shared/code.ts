const encoder = new TextEncoder();

export async function generateDeterministicCode(
  secret: string,
  facultyCode: string,
  batch: string,
  studentKey: string,
  ticketNo: number,
): Promise<string> {
  const payload = `${facultyCode}|${batch}|${studentKey}|${ticketNo}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);

  const n =
    ((bytes[0] << 24) >>> 0) +
    ((bytes[1] << 16) >>> 0) +
    ((bytes[2] << 8) >>> 0) +
    (bytes[3] >>> 0);

  return String(n % 10000).padStart(4, "0");
}

export function buildQrPayload(studentIdFull: string, ticketNo: number, verifyCode: string): string {
  return `KT1:${encodeURIComponent(studentIdFull)}:${ticketNo}:${verifyCode}`;
}

export function parseQrPayload(payload: string): {
  studentIdFull: string;
  ticketNo: number;
  verifyCode: string;
} {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "KT1") {
    throw new Error("Invalid QR payload");
  }

  const studentIdFull = decodeURIComponent(parts[1]);
  const ticketNo = Number(parts[2]);
  const verifyCode = parts[3];

  if (!Number.isInteger(ticketNo) || ticketNo <= 0) {
    throw new Error("Invalid ticket number in QR payload");
  }

  if (!/^\d{4}$/.test(verifyCode)) {
    throw new Error("Invalid verify code in QR payload");
  }

  return { studentIdFull, ticketNo, verifyCode };
}
