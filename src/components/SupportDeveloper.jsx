import React, { useState } from 'react';

const UPI_ID = 'bharatrasvebr2@ybl';

export default function SupportDeveloper({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
    } catch {
      const input = document.createElement('textarea');
      input.value = UPI_ID;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={compact
          ? 'inline-flex items-center gap-1.5 rounded-full bg-[#F4C95D] text-[#3A2A08] px-3 py-1.5 text-[10px] font-black active:scale-95'
          : 'inline-flex items-center gap-1.5 rounded-full bg-[#F4C95D] text-[#3A2A08] px-3 py-1.5 text-[10px] font-black active:scale-95'}
        title="Support the developer"
      >
        <i className="fa-solid fa-mug-hot"></i>
        <span>Buy me a coffee</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 shadow-2xl text-center text-charcoal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-base text-forest">Buy me a coffee</h3>
              <button onClick={() => setOpen(false)} className="p-2 text-stone-500" aria-label="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="text-xs text-stone-600 mb-3">Support the developer with a UPI payment.</p>
            <img src="/developer-upi-qr.svg" alt="UPI QR code for Bharat Rasve" className="w-56 h-56 max-w-full mx-auto object-contain" />
            <p className="text-[10px] font-bold text-stone-500 mt-2">BHARAT BABASAHEB RASVE</p>
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
              <span className="text-xs font-bold break-all">{UPI_ID}</span>
              <button onClick={copyUpi} className="shrink-0 rounded-md bg-forest text-white px-2 py-1.5 text-xs font-bold" title="Copy UPI ID">
                <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i>
                <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <a href="upi://pay?pa=bharatrasvebr2@ybl&pn=Bharat%20Rasve&cu=INR" className="mt-3 block rounded-lg bg-[#6739B7] text-white py-2.5 text-xs font-black">
              <i className="fa-solid fa-indian-rupee-sign mr-1"></i> Pay with UPI app
            </a>
          </div>
        </div>
      )}
    </>
  );
}
