'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Printed at the bottom of every card. */
export const CARD_URL = 'app.smartvan.pk';

// SmartVan brand colours (from the logo).
const NAVY = '#26296B';
const BLUE = '#2563AE';
const YELLOW = '#FCD116';
const RED = '#E3101E';

export interface StudentCardData {
  kidId: string;
  fullname: string;
  grade?: string;
  image?: string | null;
  vanNumber?: string;
  qrPayload: string;
}

function CardQr({ payload }: { payload: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    // High resolution so the printed code stays crisp.
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 0, width: 600, color: { dark: NAVY, light: '#FFFFFF' } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [payload]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Student QR code" className="w-full h-full" style={{ imageRendering: 'pixelated' }} />
  ) : (
    <div className="w-full h-full bg-gray-100 animate-pulse" />
  );
}

/** Photo if available; otherwise a person icon with room to glue a photo after printing. */
function CardPhoto({ image, name }: { image?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = !!image && !failed;
  return (
    <div
      className="shrink-0 overflow-hidden flex items-center justify-center"
      style={{
        width: '19mm',
        height: '24mm',
        borderRadius: '2mm',
        border: hasPhoto ? `0.5mm solid ${NAVY}` : `0.35mm dashed ${BLUE}`,
        background: hasPhoto ? '#fff' : '#EEF3FB',
      }}
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image!} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center" style={{ color: BLUE }}>
          <svg viewBox="0 0 24 24" style={{ width: '10mm', height: '10mm' }} fill="currentColor" aria-hidden>
            <circle cx="12" cy="8" r="4.2" />
            <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5z" />
          </svg>
          <span style={{ fontSize: '1.7mm', lineHeight: 1.1, marginTop: '0.8mm', fontWeight: 600 }}>
            Affix photo
            <br />
            here
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ID-1 size (85.6 × 54 mm) SmartVan student card. Sized in mm so the
 * screen preview matches the print exactly; colours print because of
 * print-color-adjust: exact.
 */
export function StudentCard({ card, schoolName }: { card: StudentCardData; schoolName?: string }) {
  return (
    <div
      className="relative overflow-hidden bg-white flex flex-col"
      style={{
        width: '85.6mm',
        height: '54mm',
        borderRadius: '3mm',
        border: '0.25mm solid #D9DEEA',
        boxShadow: '0 1px 3px rgba(16,24,40,.12)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ height: '12mm', padding: '0 3mm', background: `linear-gradient(100deg, ${NAVY} 0%, ${BLUE} 100%)` }}
      >
        <div className="flex items-center" style={{ gap: '1.8mm' }}>
          <div className="flex items-center justify-center bg-white rounded-full" style={{ width: '9mm', height: '9mm' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/smartvan-mark.png" alt="SmartVan" style={{ width: '8.4mm', height: '8.4mm', objectFit: 'contain' }} />
          </div>
          <div className="leading-none">
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '3.6mm', letterSpacing: '0.1mm' }}>SmartVan</div>
            <div style={{ color: YELLOW, fontSize: '1.9mm', marginTop: '0.6mm', fontWeight: 600 }}>Track the Van. Stay Informed.</div>
          </div>
        </div>
        <div
          style={{
            background: YELLOW,
            color: NAVY,
            fontSize: '1.9mm',
            fontWeight: 800,
            padding: '0.8mm 2mm',
            borderRadius: '5mm',
            letterSpacing: '0.2mm',
          }}
        >
          STUDENT CARD
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center" style={{ padding: '2.2mm 3mm', gap: '2.5mm' }}>
        <CardPhoto image={card.image} name={card.fullname} />

        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-center" style={{ gap: '0.8mm' }}>
          <div style={{ color: NAVY, fontWeight: 800, fontSize: '3.4mm', lineHeight: 1.15, wordBreak: 'break-word' }}>
            {card.fullname}
          </div>
          {card.grade && <Field label="Grade" value={card.grade} />}
          {card.vanNumber && <Field label="Van" value={card.vanNumber} />}
          {schoolName && <Field label="School" value={schoolName} clamp />}
        </div>

        {/* QR with brand-coloured corner frame */}
        <div className="relative shrink-0" style={{ width: '24mm', height: '24mm', padding: '1.2mm' }}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <span
              key={c}
              className="absolute"
              style={{
                width: '4mm',
                height: '4mm',
                [c.includes('t') ? 'top' : 'bottom']: 0,
                [c.includes('l') ? 'left' : 'right']: 0,
                [`border${c.includes('t') ? 'Top' : 'Bottom'}`]: `0.6mm solid ${c === 'tl' || c === 'br' ? YELLOW : RED}`,
                [`border${c.includes('l') ? 'Left' : 'Right'}`]: `0.6mm solid ${c === 'tl' || c === 'br' ? YELLOW : RED}`,
              }}
            />
          ))}
          <CardQr payload={card.qrPayload} />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ height: '5mm', padding: '0 3mm', background: YELLOW, color: NAVY }}
      >
        <span style={{ fontSize: '2mm', fontWeight: 800, letterSpacing: '0.15mm' }}>{CARD_URL}</span>
        <span style={{ fontSize: '1.6mm', fontWeight: 600 }}>If found, please return to the school</span>
      </div>
    </div>
  );
}

function Field({ label, value, clamp }: { label: string; value: string; clamp?: boolean }) {
  return (
    <div style={{ fontSize: '2.2mm', color: '#344054', lineHeight: 1.25 }}>
      <span style={{ color: BLUE, fontWeight: 700 }}>{label}: </span>
      <span
        style={
          clamp
            ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }
            : undefined
        }
      >
        {value}
      </span>
    </div>
  );
}
