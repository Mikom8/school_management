import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
} from "docx";
import { formatReportDataForExcel } from "./exportUtils";

/** Native browser blob download — no file-saver dependency needed */
const saveAs = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ── Constants ────────────────────────────────────────────── */
const SCHOOL_NAME = "New Generation University College";
const SCHOOL_SUBTITLE = "Official Academic Records Office";

/** Thin border reused for every table cell */
const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "2D3748" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "2D3748" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "2D3748" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "2D3748" },
};

/* ── Table cell helpers ────────────────────────────────────── */
const makeHeaderCell = (text) =>
  new TableCell({
    borders: THIN_BORDER,
    shading: { type: ShadingType.SOLID, color: "2B6CB0", fill: "2B6CB0" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: true, color: "FFFFFF", size: 20, font: "Calibri" }),
        ],
      }),
    ],
  });

const makeDataCell = (text, isEven = false) =>
  new TableCell({
    borders: THIN_BORDER,
    shading: isEven
      ? { type: ShadingType.SOLID, color: "EBF4FF", fill: "EBF4FF" }
      : { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: String(text ?? "N/A"), size: 18, font: "Calibri" }),
        ],
      }),
    ],
  });

/* ── Main export function ─────────────────────────────────── */
/**
 * Generate and download a formatted .docx Grade Report.
 * @param {Object} reportData – same shape used by downloadExcelReport
 * @param {string} filename   – desired filename without extension
 */
export const downloadWordReport = async (reportData, filename = "Grade Report") => {
  try {
    const isStudentGrades =
      reportData?.type === "student-grades" ||
      Boolean(reportData?.student || reportData?.data?.student);

    const generatedAt = new Date().toLocaleString();
    let bodyChildren = [];

    if (isStudentGrades) {
      const studentInfo = reportData?.student || reportData?.data?.student || {};
      const studentName = studentInfo.user?.name || studentInfo.name || "N/A";
      const studentId = studentInfo.studentId || "N/A";
      const academicYear = studentInfo.grade || "N/A";
      const gpa = reportData?.gpa || reportData?.data?.gpa || "N/A";
      const gradesList = reportData?.grades || reportData?.data?.grades || [];

      // Student summary info box
      const infoTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [4500, 4500],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: THIN_BORDER,
                shading: { type: ShadingType.SOLID, color: "F7FAFC", fill: "F7FAFC" },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Student Name: ", bold: true, size: 20, font: "Calibri" }),
                      new TextRun({ text: String(studentName), size: 20, font: "Calibri" }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: THIN_BORDER,
                shading: { type: ShadingType.SOLID, color: "F7FAFC", fill: "F7FAFC" },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Student ID: ", bold: true, size: 20, font: "Calibri" }),
                      new TextRun({ text: String(studentId), size: 20, font: "Calibri" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: THIN_BORDER,
                shading: { type: ShadingType.SOLID, color: "F7FAFC", fill: "F7FAFC" },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Academic Year: ", bold: true, size: 20, font: "Calibri" }),
                      new TextRun({ text: String(academicYear), size: 20, font: "Calibri" }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: THIN_BORDER,
                shading: { type: ShadingType.SOLID, color: "F7FAFC", fill: "F7FAFC" },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Cumulative GPA: ", bold: true, size: 20, font: "Calibri" }),
                      new TextRun({ text: String(gpa), bold: true, color: "2B6CB0", size: 20, font: "Calibri" }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      bodyChildren.push(infoTable);

      // Group grades by semester
      const semesterGroups = {};
      if (gradesList.length > 0) {
        gradesList.forEach((grade) => {
          const sem = grade.semester || studentInfo.semester || "Semester Grades";
          if (!semesterGroups[sem]) {
            semesterGroups[sem] = [];
          }
          semesterGroups[sem].push(grade);
        });
      } else {
        const sem = studentInfo.semester || "Semester Grades";
        semesterGroups[sem] = [];
      }

      const headers = ["Course Name", "Credits", "Grade", "Percentage", "Instructor"];
      const colWidths = [3600, 1100, 1100, 1400, 1800];

      Object.entries(semesterGroups).forEach(([sem, semGrades]) => {
        // Year and Semester placed directly OVER the table of grade
        bodyChildren.push(
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: `Academic Year: ${academicYear}    |    Semester: ${sem}`,
                bold: true,
                size: 22,
                color: "1A365D",
                font: "Calibri",
              }),
            ],
            spacing: { before: 300, after: 120 },
          })
        );

        const headerRow = new TableRow({
          tableHeader: true,
          children: headers.map(makeHeaderCell),
        });

        const dataRows = semGrades.map((grade, idx) => {
          const cells = [
            grade.course?.name || "N/A",
            String(grade.course?.credits || 0),
            grade.grade || "N/A",
            grade.percentage !== undefined ? `${grade.percentage}%` : "N/A",
            grade.course?.teacher?.name || "N/A",
          ];
          return new TableRow({
            children: cells.map((c) => makeDataCell(c, idx % 2 === 1)),
          });
        });

        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: colWidths,
          rows: [headerRow, ...dataRows],
        });

        bodyChildren.push(table);
      });
    } else {
      /* Flatten data using the shared formatter */
      const rows = formatReportDataForExcel(reportData, "grades");
      if (!rows || rows.length === 0) {
        alert("No data available to export.");
        return;
      }

      const headers = Object.keys(rows[0]);
      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(makeHeaderCell),
      });

      const dataRows = rows.map(
        (row, idx) =>
          new TableRow({
            children: headers.map((h) => makeDataCell(row[h], idx % 2 === 1)),
          })
      );

      const colWidth = Math.floor(9000 / headers.length);
      const gradeTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: headers.map(() => colWidth),
        rows: [headerRow, ...dataRows],
      });

      bodyChildren.push(gradeTable);
    }

    let subtitleParts = [isStudentGrades ? "Student Grade Report" : "Grade Report"];
    if (reportData?.data?.semester) subtitleParts.push(reportData.data.semester);
    const reportSubtitle = subtitleParts.join(" \u2014 ");

    /* 4 ── Assemble document */
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
              },
            },
          },
          children: [
            /* School name */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: SCHOOL_NAME,
                  bold: true,
                  size: 52,
                  color: "1A365D",
                  font: "Calibri",
                }),
              ],
            }),

            /* School subtitle */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: SCHOOL_SUBTITLE,
                  size: 24,
                  color: "4A5568",
                  font: "Calibri",
                }),
              ],
              spacing: { after: 100 },
            }),

            /* Divider */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 12, color: "2B6CB0" },
              },
              children: [new TextRun({ text: "" })],
              spacing: { before: 60, after: 200 },
            }),

            /* Report title */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: reportSubtitle,
                  bold: true,
                  size: 32,
                  color: "2B6CB0",
                  font: "Calibri",
                }),
              ],
              spacing: { after: 80 },
            }),

            /* Generated date */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Generated: ${generatedAt}`,
                  size: 18,
                  color: "718096",
                  italics: true,
                  font: "Calibri",
                }),
              ],
              spacing: { after: 300 },
            }),

            /* Grade tables and student info */
            ...bodyChildren,

            /* Spacer */
            new Paragraph({
              children: [new TextRun({ text: "" })],
              spacing: { before: 600 },
            }),

            /* ── Signature section ── */
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: "Authorised by:",
                  bold: true,
                  size: 22,
                  font: "Calibri",
                }),
              ],
              spacing: { before: 400, after: 40 },
            }),

            /* Signature underline */
            new Paragraph({
              alignment: AlignmentType.LEFT,
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              },
              children: [new TextRun({ text: "                                           ", size: 22 })],
              spacing: { before: 600, after: 60 },
            }),

            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: "HR Officer / Head of Academic Records",
                  size: 18,
                  color: "4A5568",
                  font: "Calibri",
                }),
              ],
              spacing: { after: 40 },
            }),

            /* Official seal box */
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: "Official Seal:  ", bold: true, size: 20, font: "Calibri" }),
                new TextRun({
                  text: "[                                       ]",
                  size: 20,
                  color: "718096",
                  font: "Calibri",
                }),
              ],
              spacing: { before: 200, after: 400 },
            }),

            /* ── Red disclaimer ── */
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "E53E3E" },
              },
              children: [
                new TextRun({
                  text: "\u26a0  THIS DOCUMENT IS INVALID WITHOUT THE AUTHORISED SIGNATURE AND OFFICIAL SEAL OF THE HR DEPARTMENT  \u26a0",
                  bold: true,
                  size: 18,
                  color: "E53E3E",
                  font: "Calibri",
                }),
              ],
              spacing: { before: 120, after: 60 },
            }),

            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Any reproduction, alteration, or use of this document without proper authorisation is strictly prohibited and may be subject to disciplinary or legal action.",
                  size: 16,
                  color: "718096",
                  italics: true,
                  font: "Calibri",
                }),
              ],
            }),
          ],
        },
      ],
    });

    /* 5 ── Pack and download */
    const blob = await Packer.toBlob(doc);
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, "-") + ".docx";
    saveAs(blob, safeFilename);
  } catch (err) {
    console.error("Error generating Word report:", err);
    alert("Failed to generate Word document: " + err.message);
  }
};
