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

interface RegisterKid {
  _id: string;
  fullname: string;
  grade?: number | string;
  VanId?: string;
  status: string;
}

interface RegisterParent {
  id: string;
  fullname: string;
  email: string;
  phoneNo: string;
  alternatePhoneNo: string;
  address: string;
  image: string;
  createdAt: string;
  lastLoginAt: string | null;
  kids: RegisterKid[];
}

interface RegisterReportResponse {
  message: string;
  data: RegisterParent[];
  schoolName: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function kidsLabel(kids: RegisterKid[]) {
  if (!kids || kids.length === 0) return 'None';
  return kids.map((k) => k.fullname).filter(Boolean).join(', ') || 'None';
}

function appStatusLabel(p: RegisterParent) {
  return p.lastLoginAt ? `Linked · ${formatDate(p.lastLoginAt)}` : 'Not linked yet';
}

const CSV_HEADERS = [
  'Name', 'Phone', 'Alt Phone', 'Email', 'Address', 'Linked Kids', 'Kids Count', 'App Status', 'Joined Date',
];

function toCsvRow(p: RegisterParent): string[] {
  return [
    p.fullname,
    p.phoneNo,
    p.alternatePhoneNo,
    p.email,
    p.address,
    kidsLabel(p.kids),
    String(p.kids?.length ?? 0),
    appStatusLabel(p),
    formatDate(p.createdAt),
  ];
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(schoolName: string, parents: RegisterParent[]) {
  const rows = [CSV_HEADERS, ...parents.map(toCsvRow)];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName || 'smartvan'}-parent-register.csv`.replace(/\s+/g, '-').toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

// Best-effort: convert a (likely cross-origin) photo URL into a data URL
// jsPDF can embed. Falls back to a blank photo cell rather than breaking
// the export — same approach as the student/driver register exports.
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

async function downloadPdf(schoolName: string, parents: RegisterParent[]) {
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
  doc.text('Parent Register', margin, 58);
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${parents.length} parents`, margin, 72);

  const photos = await Promise.all(parents.map((p) => photoToDataUrl(p.image)));
  const PHOTO_COL = 0;

  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['Photo', 'Name', 'Phone', 'Alt Phone', 'Email', 'Address', 'Linked Kids', 'App Status', 'Joined']],
    body: parents.map((p) => [
      '',
      p.fullname || '—',
      p.phoneNo || '—',
      p.alternatePhoneNo || '—',
      p.email || '—',
      p.address || '—',
      kidsLabel(p.kids),
      appStatusLabel(p),
      formatDate(p.createdAt),
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

  doc.save(`${schoolName || 'smartvan'}-parent-register.pdf`.replace(/\s+/g, '-').toLowerCase());
}

export default function ParentRegisterPage() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['parentRegisterReport'],
    queryFn: async () => (await api.get<RegisterReportResponse>('/Admin/getParentRegisterReport')).data,
  });

  const parents = useMemo(() => data?.data ?? [], [data]);
  const schoolName = data?.schoolName ?? '';
  const generatedOn = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  async function handlePdf() {
    setIsExportingPdf(true);
    try {
      await downloadPdf(schoolName, parents);
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5 print:p-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/parents"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Register Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {parents.length} parent{parents.length !== 1 ? 's' : ''} · {schoolName || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={isLoading || parents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handlePdf}
            disabled={isLoading || isExportingPdf || parents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Download PDF
          </button>
          <button
            onClick={() => downloadCsv(schoolName, parents)}
            disabled={isLoading || parents.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Download CSV
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-[#1B2B6B]">{schoolName || 'SmartVan'}</h1>
        <p className="text-sm text-gray-600">Parent Register · Generated {generatedOn} · {parents.length} parents</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400 print:hidden">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl print:hidden">
          <AlertCircle size={16} />
          Couldn&apos;t load the parent register.
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {!isLoading && !isError && parents.length === 0 && (
        <div className="text-center py-20 text-gray-400 print:hidden">No parents registered yet.</div>
      )}

      {!isLoading && !isError && parents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto print:border-0 print:rounded-none">
          <table className="w-full text-sm print:text-[10px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide print:text-black print:border-b-2 print:border-black">
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Photo</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Name</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Phone</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Alt Phone</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Email</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Address</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Linked Kids</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">App Status</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 print:break-inside-avoid">
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.fullname}
                        className="w-8 h-8 rounded-full object-cover print:w-6 print:h-6"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 print:w-6 print:h-6">
                        <UserRound size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 font-medium text-gray-900">{p.fullname}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{p.phoneNo || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{p.alternatePhoneNo || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{p.email || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[200px] truncate" title={p.address}>
                    {p.address || '—'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[220px] truncate" title={kidsLabel(p.kids)}>
                    {kidsLabel(p.kids)}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{appStatusLabel(p)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{formatDate(p.createdAt)}</td>
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
