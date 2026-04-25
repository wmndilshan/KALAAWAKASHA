const FACULTY_CODES = new Set(["E", "M", "MG", "AG", "A", "AR", "V", "D", "AH", "S"]);

export type ParsedStudentId = {
  studentIdFull: string;
  facultyCode: string;
  batch: string;
  studentSerial: string;
  studentKey: string;
  subDepartment: string | null;
};

export function parseStudentId(studentIdFull: string): ParsedStudentId {
  const trimmed = studentIdFull.trim().toUpperCase();
  const parts = trimmed.split("/").filter(Boolean);

  if (parts.length < 2 || parts.length > 4) {
    throw new Error("Invalid student_id_full format");
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
      return {
        studentIdFull: `${facultyCode}/${batch}`,
        facultyCode,
        batch,
        studentSerial: "",
        studentKey: "",
        subDepartment: null,
      };
    }

    if (parts.length === 3 && /^\d{1,6}$/.test(parts[2])) {
      const serial = parts[2].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: serial,
        subDepartment: null,
      };
    }

    if (parts.length === 3 && /^[A-Z0-9]{2,5}$/.test(parts[2])) {
      return {
        studentIdFull: `${facultyCode}/${batch}/${parts[2]}`,
        facultyCode,
        batch,
        studentSerial: "",
        studentKey: parts[2],
        subDepartment: parts[2],
      };
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

    throw new Error("Invalid A/AR student_id_full format");
  }

  if (facultyCode === "AH") {
    if (parts.length === 2) {
      return {
        studentIdFull: `${facultyCode}/${batch}`,
        facultyCode,
        batch,
        studentSerial: "",
        studentKey: "",
        subDepartment: null,
      };
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
      return {
        studentIdFull: `${facultyCode}/${batch}/${parts[2]}`,
        facultyCode,
        batch,
        studentSerial: "",
        studentKey: parts[2],
        subDepartment: parts[2],
      };
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

    throw new Error("Invalid AH student_id_full format");
  }

  if (facultyCode === "AG") {
    if (parts.length === 3 && /^\d{1,6}$/.test(parts[2])) {
      const serial = parts[2].padStart(3, "0");
      return {
        studentIdFull: `${facultyCode}/${batch}/${serial}`,
        facultyCode,
        batch,
        studentSerial: serial,
        studentKey: serial,
        subDepartment: null,
      };
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

    throw new Error("Invalid AG student_id_full format");
  }

  if (parts.length !== 3 || !/^\d{1,6}$/.test(parts[2])) {
    throw new Error("Invalid student_id_full format. Expected FAC/BATCH/SERIAL");
  }

  const serial = parts[2].padStart(3, "0");

  return {
    studentIdFull: `${facultyCode}/${batch}/${serial}`,
    facultyCode,
    batch,
    studentSerial: serial,
    studentKey: serial,
    subDepartment: null,
  };
}
