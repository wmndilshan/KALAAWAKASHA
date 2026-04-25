import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

const DEV_SECRET = process.env.EXPO_PUBLIC_VERIFY_CODE_DEV_SECRET ?? "dev-only-change-this-secret";
const FACULTY_CODES = new Set(["E", "M", "MG", "AG", "A", "AR", "V", "D", "AH", "S"]);

export type ParsedStudentId = {
  studentIdFull: string;
  facultyCode: string;
  batch: string;
  studentSerial: string;
  studentKey: string;
  subDepartment: string | null;
};

export async function generateCodeClient(
  facultyCode: string,
  batch: string,
  studentKey: string,
  ticketNo: number,
): Promise<string> {
  const payload = `${facultyCode}|${batch}|${studentKey}|${ticketNo}`;
  const signature = hmac(sha256, utf8ToBytes(DEV_SECRET), utf8ToBytes(payload));
  const n =
    ((signature[0] << 24) >>> 0) +
    ((signature[1] << 16) >>> 0) +
    ((signature[2] << 8) >>> 0) +
    (signature[3] >>> 0);
  return String(n % 10000).padStart(4, "0");
}

export function buildQrPayload(studentIdFull: string, ticketNo: number, verifyCode: string): string {
  return `KT1:${encodeURIComponent(studentIdFull)}:${ticketNo}:${verifyCode}`;
}

export function buildStudentIdFull(input: {
  facultyCode: string;
  batch: string;
  studentSerial?: string;
  subDepartment?: string;
}): string {
  const facultyCode = input.facultyCode.trim().toUpperCase();
  const batch = input.batch.trim();
  const studentSerial = (input.studentSerial ?? "").trim().replace(/\D/g, "");
  const subDepartment = (input.subDepartment ?? "").trim().toUpperCase();

  if (facultyCode === "A" || facultyCode === "AR") {
    if (subDepartment && studentSerial) {
      return `${facultyCode}/${batch}/${subDepartment}/${studentSerial.padStart(3, "0")}`;
    }
    if (subDepartment) {
      return `${facultyCode}/${batch}/${subDepartment}`;
    }
    if (studentSerial) {
      return `${facultyCode}/${batch}/${studentSerial.padStart(3, "0")}`;
    }
    return `${facultyCode}/${batch}`;
  }

  if (facultyCode === "AH") {
    if (studentSerial && subDepartment) {
      return `${facultyCode}/${batch}/${subDepartment}/${studentSerial.padStart(3, "0")}`;
    }
    if (studentSerial) {
      return `${facultyCode}/${batch}/UNK/${studentSerial.padStart(3, "0")}`;
    }
    return subDepartment ? `${facultyCode}/${batch}/${subDepartment}` : `${facultyCode}/${batch}`;
  }

  if (facultyCode === "AG") {
    if (!studentSerial) {
      throw new Error("Student number is required for AG");
    }
    const serial = studentSerial.padStart(3, "0");
    return subDepartment ? `${facultyCode}/${batch}/${subDepartment}/${serial}` : `${facultyCode}/${batch}/${serial}`;
  }

  if (!studentSerial) {
    throw new Error("Student number is required");
  }

  return `${facultyCode}/${batch}/${studentSerial.padStart(3, "0")}`;
}

export function formatStudentSerial(studentSerial: string): string {
  const digits = studentSerial.trim().replace(/\D/g, "");
  return digits ? digits.padStart(3, "0") : "";
}

export function formatStudentIdFull(studentIdFull: string): string {
  const parts = studentIdFull.trim().toUpperCase().split("/");
  if (parts.length < 2 || parts.length > 4) return studentIdFull;

  const faculty = parts[0] === "AR" ? "A" : parts[0];

  if (parts.length === 2) return `${faculty}/${parts[1]}`;
  if (parts.length === 3) {
    const third = /^\d+$/.test(parts[2]) ? formatStudentSerial(parts[2]) : parts[2];
    return `${faculty}/${parts[1]}/${third}`;
  }

  const fourth = /^\d+$/.test(parts[3]) ? formatStudentSerial(parts[3]) : parts[3];
  return `${faculty}/${parts[1]}/${parts[2]}/${fourth}`;
}

export function parseStudentId(studentIdFull: string): ParsedStudentId {
  const trimmed = studentIdFull.trim().toUpperCase();
  const parts = trimmed.split("/").filter(Boolean);

  if (parts.length < 2 || parts.length > 4) {
    throw new Error("Invalid student ID format");
  }

  const facultyCode = parts[0];
  const batch = parts[1];

  if (!FACULTY_CODES.has(facultyCode)) {
    throw new Error("Invalid faculty code");
  }

  if (!/^\d{1,2}$/.test(batch)) {
    throw new Error("Invalid batch");
  }

  if (facultyCode === "A" || facultyCode === "AR") {
    if (parts.length === 2) {
      return { studentIdFull: `${facultyCode}/${batch}`, facultyCode, batch, studentSerial: "", studentKey: "", subDepartment: null };
    }
    if (parts.length === 3 && /^\d{1,6}$/.test(parts[2])) {
      const serial = parts[2].padStart(3, "0");
      return { studentIdFull: `${facultyCode}/${batch}/${serial}`, facultyCode, batch, studentSerial: serial, studentKey: serial, subDepartment: null };
    }
    if (parts.length === 3 && /^[A-Z0-9]{2,5}$/.test(parts[2])) {
      return { studentIdFull: `${facultyCode}/${batch}/${parts[2]}`, facultyCode, batch, studentSerial: "", studentKey: parts[2], subDepartment: parts[2] };
    }
    if (parts.length === 4 && /^[A-Z0-9]{2,5}$/.test(parts[2]) && /^\d{1,6}$/.test(parts[3])) {
      const serial = parts[3].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/${parts[2]}/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: `${parts[2]}/${serial}`,
        subDepartment: parts[2],
      };
    }
    throw new Error("Invalid A student ID format");
  }

  if (facultyCode === "AH") {
    if (parts.length === 2) {
      return { studentIdFull: `${facultyCode}/${batch}`, facultyCode, batch, studentSerial: "", studentKey: "", subDepartment: null };
    }
    if (parts.length === 3 && /^\d{1,6}$/.test(parts[2])) {
      const serial = parts[2].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/UNK/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: `UNK/${serial}`,
        subDepartment: "UNK",
      };
    }
    if (parts.length === 3 && /^[A-Z0-9]{2,5}$/.test(parts[2])) {
      return { studentIdFull: `${facultyCode}/${batch}/${parts[2]}`, facultyCode, batch, studentSerial: "", studentKey: parts[2], subDepartment: parts[2] };
    }
    if (parts.length === 4 && /^[A-Z0-9]{2,5}$/.test(parts[2]) && /^\d{1,6}$/.test(parts[3])) {
      const serial = parts[3].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/${parts[2]}/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: `${parts[2]}/${serial}`,
        subDepartment: parts[2],
      };
    }
    throw new Error("Invalid AH student ID format");
  }

  if (facultyCode === "AG") {
    if (parts.length === 3 && /^\d{1,6}$/.test(parts[2])) {
      const serial = parts[2].padStart(3, "0");
      return { studentIdFull: `${facultyCode}/${batch}/${serial}`, facultyCode, batch, studentSerial: serial, studentKey: serial, subDepartment: null };
    }
    if (parts.length === 4 && /^[A-Z0-9]{2,5}$/.test(parts[2]) && /^\d{1,6}$/.test(parts[3])) {
      const serial = parts[3].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/${parts[2]}/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: `${parts[2]}/${serial}`,
        subDepartment: parts[2],
      };
    }
    throw new Error("Invalid AG student ID format");
  }

  if (parts.length !== 3 || !/^\d{1,6}$/.test(parts[2])) {
    throw new Error("Invalid student ID format");
  }

  const serial = parts[2].padStart(3, "0");
  return { studentIdFull: `${facultyCode}/${batch}/${serial}`, facultyCode, batch, studentSerial: serial, studentKey: serial, subDepartment: null };
}
