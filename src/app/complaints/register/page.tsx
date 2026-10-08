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
} from 'lucide-react';
import { reportApi } from '@/lib/api';

interface RegisterComplaint {
  _id: string;
  schoolId?: string;
  issueType?: string;
  description?: string;
  image?: string;
  audio?: string;
  video?: string;
  type?: string;
  dateOfIncident?: string;
  status: string;
  adminRemarks?: string;
  createdAt: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  vanCarNumber?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  kidName?: string;
}

interface RegisterReportResponse {
  message: string;
  data: RegisterComplaint[];
  schoolName: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function reporterLabel(c: RegisterComplaint) {
  return c.parentName ?? c.driverName ?? '—';
}

function reporterTypeLabel(c: RegisterComplaint) {
  if (c.parentName) return 'Parent';
  if (c.driverName) return 'Driver';
  return '—';
}

const CSV_HEADERS = [
  'ID', 'Issue Type', 'Description', 'Reported By', 'Reporter Type', 'Student',
  'Van', 'Status', 'Admin Remarks', 'Incident Date', 'Reported On',
];

function toCsvRow(c: RegisterComplaint): string[] {
  return [
    c._id.slice(-8).toUpperCase(),
    c.issueType ?? '',
    c.description ?? '',
    reporterLabel(c),
    reporterTypeLabel(c),
    c.kidName ?? '',
    c.vanCarNumber ?? '',
    c.status ?? '',
    c.adminRemarks ?? '',
    formatDate(c.dateOfIncident),
    formatDate(c.createdAt),
  ];
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(schoolName: string, complaints: RegisterComplaint[]) {
  const rows = [CSV_HEADERS, ...complaints.map(toCsvRow)];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName || 'smartvan'}-complaint-register.csv`.replace(/\s+/g, '-').toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(schoolName: string, complaints: RegisterComplaint[]) {
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
  doc.text('Complaints & Issues Register', margin, 58);
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${complaints.length} records`, margin, 72);

  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['ID', 'Issue Type', 'Description', 'Reported By', 'Student', 'Van', 'Status', 'Remarks', 'Incident', 'Reported On']],
    body: complaints.map((c) => [
      c._id.slice(-8).toUpperCase(),
      c.issueType || '—',
      c.description || '—',
      `${reporterLabel(c)} (${reporterTypeLabel(c)})`,
      c.kidName || '—',
      c.vanCarNumber || '—',
      c.status || '—',
      c.adminRemarks || '—',
      formatDate(c.dateOfIncident),
      formatDate(c.createdAt),
    ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 5, minCellHeight: 22, valign: 'middle' },
    headStyles: { fillColor: [27, 43, 107], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 48 },
      2: { cellWidth: 120 },
      7: { cellWidth: 90 },
    },
  });

  doc.save(`${schoolName || 'smartvan'}-complaint-register.pdf`.replace(/\s+/g, '-').toLowerCase());
}

export default function ComplaintRegisterPage() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['complaintRegisterReport'],
    queryFn: async () => (await reportApi.getRegisterReport()).data as RegisterReportResponse,
  });

  const complaints = useMemo(() => data?.data ?? [], [data]);
  const schoolName = data?.schoolName ?? '';
  const generatedOn = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  async function handlePdf() {
    setIsExportingPdf(true);
    try {
      await downloadPdf(schoolName, complaints);
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5 print:p-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/complaints"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complaints &amp; Issues Register Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {complaints.length} record{complaints.length !== 1 ? 's' : ''} · {schoolName || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={isLoading || complaints.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handlePdf}
            disabled={isLoading || isExportingPdf || complaints.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Download PDF
          </button>
          <button
            onClick={() => downloadCsv(schoolName, complaints)}
            disabled={isLoading || complaints.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Download CSV
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-[#1B2B6B]">{schoolName || 'SmartVan'}</h1>
        <p className="text-sm text-gray-600">Complaints &amp; Issues Register · Generated {generatedOn} · {complaints.length} records</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400 print:hidden">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl print:hidden">
          <AlertCircle size={16} />
          Couldn&apos;t load the complaint register.
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {!isLoading && !isError && complaints.length === 0 && (
        <div className="text-center py-20 text-gray-400 print:hidden">No complaints or issues reported yet.</div>
      )}

      {!isLoading && !isError && complaints.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto print:border-0 print:rounded-none">
          <table className="w-full text-sm print:text-[10px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide print:text-black print:border-b-2 print:border-black">
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">ID</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Issue Type</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Description</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Reported By</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Student</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Van</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Status</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Remarks</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Incident</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Reported On</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c._id} className="border-b border-gray-50 last:border-0 print:break-inside-avoid">
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 font-mono text-xs text-gray-500">#{c._id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 font-medium text-gray-900">{c.issueType || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[220px] truncate" title={c.description}>
                    {c.description || '—'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">
                    {reporterLabel(c)}
                    <span className="text-gray-400"> ({reporterTypeLabel(c)})</span>
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{c.kidName || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{c.vanCarNumber || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 capitalize">{c.status || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[200px] truncate" title={c.adminRemarks}>
                    {c.adminRemarks || '—'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{formatDate(c.dateOfIncident)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{formatDate(c.createdAt)}</td>
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
