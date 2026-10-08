'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  FileDown,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  UserRound,
} from 'lucide-react';
import { api } from '@/lib/api';

interface RegisterRoute {
  title: string;
  tripType: string;
}

interface RegisterStudent {
  id: string;
  fullname: string;
  image: string;
  age: number | null;
  dob: string | null;
  grade: string;
  gender: string;
  homeAddress: string;
  createdAt: string;
  van: { assigned: boolean; carNumber: string };
  routes: RegisterRoute[];
  parentEmail: string;
  parentPhone: string;
}

interface RegisterReportResponse {
  message: string;
  data: RegisterStudent[];
  schoolName: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function routesLabel(routes: RegisterRoute[]) {
  if (!routes || routes.length === 0) return '—';
  return routes
    .map((r) => (r.tripType ? `${r.title} (${r.tripType})` : r.title))
    .filter(Boolean)
    .join(', ') || '—';
}

const CSV_HEADERS = [
  'Name', 'Age', 'Grade', 'Gender', 'Van Status', 'Van Number', 'Route',
  'Joined Date', 'Address', 'Parent Email', 'Parent Phone',
];

function toCsvRow(s: RegisterStudent): string[] {
  return [
    s.fullname,
    s.age != null ? String(s.age) : '',
    s.grade,
    s.gender,
    s.van.assigned ? 'Assigned' : 'Unassigned',
    s.van.carNumber,
    routesLabel(s.routes),
    formatDate(s.createdAt),
    s.homeAddress,
    s.parentEmail,
    s.parentPhone,
  ];
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(schoolName: string, students: RegisterStudent[]) {
  const rows = [CSV_HEADERS, ...students.map(toCsvRow)];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName || 'smartvan'}-student-register.csv`.replace(/\s+/g, '-').toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

// Best-effort: convert a (likely cross-origin, S3-hosted) photo URL into a
// data URL jsPDF can embed. Student photos may not carry CORS headers that
// allow canvas readback, so any failure here is swallowed — the row still
// prints, just without a photo, rather than breaking the whole export.
async function photoToDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadPdf(schoolName: string, students: RegisterStudent[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const margin = 32;
  const NAVY = '#1B2B6B';

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(schoolName || 'SmartVan', margin, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Student Register', margin, 58);
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${students.length} students`, margin, 72);

  // Preload photos in parallel, keyed by row index, before drawing the
  // table — autoTable's didDrawCell hook runs synchronously per cell.
  const photos = await Promise.all(students.map((s) => photoToDataUrl(s.image)));

  const PHOTO_COL = 0;

  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['Photo', 'Name', 'Age', 'Grade', 'Gender', 'Van', 'Route', 'Joined', 'Address', 'Parent Email', 'Parent Phone']],
    body: students.map((s) => [
      '',
      s.fullname,
      s.age != null ? String(s.age) : '—',
      s.grade || '—',
      s.gender || '—',
      s.van.assigned ? `Assigned (${s.van.carNumber || '—'})` : 'Unassigned',
      routesLabel(s.routes),
      formatDate(s.createdAt),
      s.homeAddress || '—',
      s.parentEmail || '—',
      s.parentPhone || '—',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 5, minCellHeight: 26, valign: 'middle' },
    headStyles: { fillColor: [27, 43, 107], fontSize: 8.5 },
    columnStyles: { [PHOTO_COL]: { cellWidth: 26 } },
    didDrawCell: (data) => {
      if (data.column.index !== PHOTO_COL || data.section !== 'body') return;
      const dataUrl = photos[data.row.index];
      if (!dataUrl) return;
      const size = Math.min(data.cell.height - 6, 20);
      try {
        doc.addImage(dataUrl, data.cell.x + 3, data.cell.y + (data.cell.height - size) / 2, size, size);
      } catch {
        // Unsupported image format for this row — leave the cell blank.
      }
    },
  });

  doc.save(`${schoolName || 'smartvan'}-student-register.pdf`.replace(/\s+/g, '-').toLowerCase());
}

export default function StudentRegisterPage() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['studentRegisterReport'],
    queryFn: async () => (await api.get<RegisterReportResponse>('/Admin/getStudentRegisterReport')).data,
  });

  const students = useMemo(() => data?.data ?? [], [data]);
  const schoolName = data?.schoolName ?? '';
  const generatedOn = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  async function handlePdf() {
    setIsExportingPdf(true);
    try {
      await downloadPdf(schoolName, students);
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5 print:p-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Register Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {students.length} student{students.length !== 1 ? 's' : ''} · {schoolName || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={isLoading || students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handlePdf}
            disabled={isLoading || isExportingPdf || students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Download PDF
          </button>
          <button
            onClick={() => downloadCsv(schoolName, students)}
            disabled={isLoading || students.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Download CSV
          </button>
        </div>
      </div>

      {/* Print-only header — not shown on screen, since the toolbar above
          already carries this info there. */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-[#1B2B6B]">{schoolName || 'SmartVan'}</h1>
        <p className="text-sm text-gray-600">Student Register · Generated {generatedOn} · {students.length} students</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400 print:hidden">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl print:hidden">
          <AlertCircle size={16} />
          Couldn&apos;t load the register report.
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {!isLoading && !isError && students.length === 0 && (
        <div className="text-center py-20 text-gray-400 print:hidden">No students registered yet.</div>
      )}

      {!isLoading && !isError && students.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto print:border-0 print:rounded-none">
          <table className="w-full text-sm print:text-[10px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide print:text-black print:border-b-2 print:border-black">
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Photo</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Name</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Age</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Grade</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Gender</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Van</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Route</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Joined</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Address</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Parent Email</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Parent Phone</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 print:break-inside-avoid">
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.image}
                        alt={s.fullname}
                        className="w-8 h-8 rounded-full object-cover print:w-6 print:h-6"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 print:w-6 print:h-6">
                        <UserRound size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 font-medium text-gray-900">{s.fullname}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{s.age ?? '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{s.grade || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{s.gender || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">
                    {s.van.assigned ? `Assigned${s.van.carNumber ? ` (${s.van.carNumber})` : ''}` : 'Unassigned'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{routesLabel(s.routes)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[220px] truncate" title={s.homeAddress}>
                    {s.homeAddress || '—'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{s.parentEmail || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{s.parentPhone || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
