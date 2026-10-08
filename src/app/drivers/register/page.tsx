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

interface RegisterDriver {
  id: string;
  fullname: string;
  email: string;
  phoneNo: string;
  alternatePhoneNo: string;
  NIC: string;
  address: string;
  status: string;
  image: string;
  appLinked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  licenceComplete: boolean;
  vehicleCardComplete: boolean;
  expiryDateLicense: string;
  expiryDateVehicleCard: string;
  van: { carNumber: string; vehicleType: string } | null;
}

interface RegisterReportResponse {
  message: string;
  data: RegisterDriver[];
  schoolName: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function vanLabel(van: RegisterDriver['van']) {
  if (!van) return 'Unassigned';
  return van.carNumber ? `${van.carNumber}${van.vehicleType ? ` (${van.vehicleType})` : ''}` : 'Assigned';
}

function appStatusLabel(d: RegisterDriver) {
  return d.appLinked ? `Linked · ${formatDate(d.lastLoginAt)}` : 'Not linked yet';
}

function licenceLabel(d: RegisterDriver) {
  if (!d.licenceComplete) return 'Missing';
  return d.expiryDateLicense ? `Complete · exp ${d.expiryDateLicense}` : 'Complete';
}

function vehicleCardLabel(d: RegisterDriver) {
  if (!d.vehicleCardComplete) return 'Missing';
  return d.expiryDateVehicleCard ? `Complete · exp ${d.expiryDateVehicleCard}` : 'Complete';
}

const CSV_HEADERS = [
  'Name', 'Phone', 'Alt Phone', 'NIC', 'Status', 'Van', 'App Status',
  'Licence', 'Vehicle Card', 'Address', 'Joined Date',
];

function toCsvRow(d: RegisterDriver): string[] {
  return [
    d.fullname,
    d.phoneNo,
    d.alternatePhoneNo,
    d.NIC,
    d.status,
    vanLabel(d.van),
    appStatusLabel(d),
    licenceLabel(d),
    vehicleCardLabel(d),
    d.address,
    formatDate(d.createdAt),
  ];
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(schoolName: string, drivers: RegisterDriver[]) {
  const rows = [CSV_HEADERS, ...drivers.map(toCsvRow)];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName || 'smartvan'}-driver-register.csv`.replace(/\s+/g, '-').toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

// Best-effort: convert a (likely cross-origin) photo URL into a data URL
// jsPDF can embed. Falls back to a blank photo cell rather than breaking
// the export if the image can't be fetched/read — same approach as the
// student register's PDF export.
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

async function downloadPdf(schoolName: string, drivers: RegisterDriver[]) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const margin = 32;
  const NAVY = '#1B3B69';

  doc.setTextColor(NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(schoolName || 'SmartVan', margin, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Driver Register', margin, 58);
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${drivers.length} drivers`, margin, 72);

  const photos = await Promise.all(drivers.map((d) => photoToDataUrl(d.image)));
  const PHOTO_COL = 0;

  autoTable(doc, {
    startY: 86,
    margin: { left: margin, right: margin },
    head: [['Photo', 'Name', 'Phone', 'NIC', 'Status', 'Van', 'App Status', 'Licence', 'Vehicle Card', 'Address', 'Joined']],
    body: drivers.map((d) => [
      '',
      d.fullname || '—',
      d.phoneNo || '—',
      d.NIC || '—',
      d.status || '—',
      vanLabel(d.van),
      appStatusLabel(d),
      licenceLabel(d),
      vehicleCardLabel(d),
      d.address || '—',
      formatDate(d.createdAt),
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

  doc.save(`${schoolName || 'smartvan'}-driver-register.pdf`.replace(/\s+/g, '-').toLowerCase());
}

export default function DriverRegisterPage() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['driverRegisterReport'],
    queryFn: async () => (await api.get<RegisterReportResponse>('/van/getDriverRegisterReport')).data,
  });

  const drivers = useMemo(() => data?.data ?? [], [data]);
  const schoolName = data?.schoolName ?? '';
  const generatedOn = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    []
  );

  async function handlePdf() {
    setIsExportingPdf(true);
    try {
      await downloadPdf(schoolName, drivers);
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5 print:p-0 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/drivers"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Register Report</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {drivers.length} driver{drivers.length !== 1 ? 's' : ''} · {schoolName || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={isLoading || drivers.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handlePdf}
            disabled={isLoading || isExportingPdf || drivers.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Download PDF
          </button>
          <button
            onClick={() => downloadCsv(schoolName, drivers)}
            disabled={isLoading || drivers.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B3B69] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Download CSV
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-[#1B3B69]">{schoolName || 'SmartVan'}</h1>
        <p className="text-sm text-gray-600">Driver Register · Generated {generatedOn} · {drivers.length} drivers</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-gray-400 print:hidden">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl print:hidden">
          <AlertCircle size={16} />
          Couldn&apos;t load the driver register.
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      )}

      {!isLoading && !isError && drivers.length === 0 && (
        <div className="text-center py-20 text-gray-400 print:hidden">No drivers registered yet.</div>
      )}

      {!isLoading && !isError && drivers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto print:border-0 print:rounded-none">
          <table className="w-full text-sm print:text-[10px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide print:text-black print:border-b-2 print:border-black">
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Photo</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Name</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Phone</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">NIC</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Status</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Van</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">App Status</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Licence</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Vehicle Card</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Address</th>
                <th className="px-4 py-3 print:px-1.5 print:py-1.5">Joined</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 print:break-inside-avoid">
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1">
                    {d.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.image}
                        alt={d.fullname}
                        className="w-8 h-8 rounded-full object-cover print:w-6 print:h-6"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 print:w-6 print:h-6">
                        <UserRound size={14} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 font-medium text-gray-900">{d.fullname}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{d.phoneNo || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{d.NIC || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 capitalize">{d.status || '—'}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{vanLabel(d.van)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{appStatusLabel(d)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{licenceLabel(d)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{vehicleCardLabel(d)}</td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600 max-w-[220px] truncate" title={d.address}>
                    {d.address || '—'}
                  </td>
                  <td className="px-4 py-2.5 print:px-1.5 print:py-1 text-gray-600">{formatDate(d.createdAt)}</td>
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
