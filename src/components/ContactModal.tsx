import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ContactField,
  ContactFormInput,
  Language,
  validateContactForm,
} from '../utils/logic';
import {
  saveContactSubmissionRecord,
  saveUserSpreadsheet,
} from '../firebase';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  initialInterest?: string;
  user: User | null;
  accessToken: string | null;
  linkedSpreadsheetId?: string;
  onSheetLinked: (spreadsheetId: string, spreadsheetUrl: string) => void;
}

interface SubmissionSuccess {
  referenceId: string;
  timestamp: string;
  fullName: string;
  interest: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTitle?: string;
  createdNew?: boolean;
  mode: 'sheets' | 'guest';
}

const INTEREST_OPTIONS: Array<{ value: string; en: string; th: string }> = [
  { value: 'Beauty Services', en: '01 · Beauty Services & Aesthetic Care', th: '01 · บริการความงามและดูแลผิวพรรณ' },
  { value: 'Beauty Products', en: '02 · Beauty Products & Formulations', th: '02 · ผลิตภัณฑ์ความงาม' },
  { value: 'Healthy Services', en: '03 · Healthy Services & Wellness', th: '03 · บริการดูแลสุขภาพแบบองค์รวม' },
  { value: 'Professional Career', en: '04 · TYME Career & Certification', th: '04 · อาชีพผู้เชี่ยวชาญความงาม (TYME Career)' },
  { value: 'Business Partner', en: 'Business Partner Program', th: 'พันธมิตรทางธุรกิจ (Business Partner)' },
  { value: 'Influencer', en: 'Influencer Collaboration', th: 'อินฟลูเอนเซอร์ (Influencer)' },
  { value: 'Free Consultation', en: 'Free Wellness Consultation', th: 'ปรึกษาฟรี (Free Consultation)' },
];

export const ContactModal: React.FC<ContactModalProps> = ({
  open,
  onClose,
  lang,
  initialInterest = 'Free Consultation',
  user,
  accessToken,
  linkedSpreadsheetId,
  onSheetLinked,
}) => {
  const isTh = lang === 'th';

  const [form, setForm] = useState<ContactFormInput>({
    fullName: '',
    email: '',
    phone: '',
    interest: initialInterest,
    preferredDate: '',
    notes: '',
    consent: false,
  });

  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmissionSuccess | null>(null);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({
        ...prev,
        interest: initialInterest || prev.interest || 'Free Consultation',
        fullName: prev.fullName || user?.displayName || '',
        email: prev.email || user?.email || '',
      }));
      setServerError(null);
    }
  }, [open, initialInterest, user]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const validation = validateContactForm(form, lang);
  const completedRequired = [
    !validation.errors.fullName && form.fullName.trim().length >= 2,
    !validation.errors.email && form.email.trim().length > 0,
    !validation.errors.phone && form.phone.trim().length > 0,
    !validation.errors.interest && form.interest.trim().length > 0,
    form.consent,
  ].filter(Boolean).length;

  const handleFieldChange = <K extends ContactField>(
    field: K,
    value: ContactFormInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setServerError(null);
  };

  const handleBlur = (field: ContactField) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const submitToServer = async (tokenOverride?: string | null, uidOverride?: string | null) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : accessToken;
    const activeUid = uidOverride !== undefined ? uidOverride : user?.uid ?? null;

    if (activeToken) {
      const res = await fetch('/api/contact/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          ...form,
          language: lang,
          spreadsheetId: linkedSpreadsheetId || '',
          createNewSheet: !linkedSpreadsheetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save to Google Sheets.');
      }

      if (activeUid && data.spreadsheetId && data.spreadsheetUrl) {
        onSheetLinked(data.spreadsheetId, data.spreadsheetUrl);
        await saveUserSpreadsheet(activeUid, data.spreadsheetId, data.spreadsheetUrl);
        await saveContactSubmissionRecord(activeUid, {
          referenceId: data.referenceId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          interest: form.interest,
          preferredDate: form.preferredDate,
          notes: form.notes,
          language: lang,
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl: data.spreadsheetUrl,
        });
      }

      setSuccess({
        referenceId: data.referenceId,
        timestamp: data.timestamp,
        fullName: form.fullName,
        interest: form.interest,
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl,
        sheetTitle: data.sheetTitle,
        createdNew: data.createdNew,
        mode: 'sheets',
      });
    } else {
      const res = await fetch('/api/contact/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      if (activeUid) {
        await saveContactSubmissionRecord(activeUid, {
          referenceId: data.referenceId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          interest: form.interest,
          preferredDate: form.preferredDate,
          notes: form.notes,
          language: lang,
        });
      }

      setSuccess({
        referenceId: data.referenceId,
        timestamp: data.timestamp,
        fullName: form.fullName,
        interest: form.interest,
        mode: 'guest',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      interest: true,
      notes: true,
      consent: true,
    });

    if (!validation.valid) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    try {
      await submitToServer();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Submission error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setTouched({});
    setServerError(null);
    setForm((prev) => ({
      ...prev,
      preferredDate: '',
      notes: '',
      consent: false,
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white text-[#111827] rounded-2xl shadow-2xl border border-[#EEDC9A]/50 p-5 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#755809]">
              {isTh ? 'TYME OF BEAUTY · นัดหมายและปรึกษา' : 'TYME OF BEAUTY · BOOKING & INQUIRY'}
            </p>
            <h2
              id="contact-modal-title"
              className="font-headline text-2xl md:text-3xl font-bold tracking-tight mt-1 text-[#111827]"
            >
              {isTh ? 'จองบริการหรือร่วมเป็นพาร์ทเนอร์' : 'Book Consultation & Partner Inquiry'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isTh ? 'ปิดหน้าต่างติดต่อ' : 'Close contact modal'}
            className="w-10 h-10 rounded-lg border border-[#8A795D]/40 flex items-center justify-center text-[#111827] hover:bg-[#111827] hover:text-white transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="py-6 space-y-6" data-testid="contact-success-state">
            <div className="rounded-2xl bg-[#F4F6FC] border border-[#D4AF37]/30 p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#755809] text-white flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10.5l4 4 8-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="text-lg font-bold text-black">
                    {isTh ? 'บันทึกข้อมูลเรียบร้อยแล้ว' : 'Inquiry Confirmed & Recorded'}
                  </h3>
                  <p className="text-xs text-neutral-600 tabular-nums">
                    {isTh ? 'รหัสอ้างอิง:' : 'Reference ID:'}{' '}
                    <span className="font-semibold text-black">{success.referenceId}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm">
                <div className="bg-white rounded-xl p-3 border border-neutral-200">
                  <span className="text-xs text-neutral-500 block">
                    {isTh ? 'ผู้ติดต่อ' : 'Applicant'}
                  </span>
                  <span className="font-semibold text-black">{success.fullName}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-neutral-200">
                  <span className="text-xs text-neutral-500 block">
                    {isTh ? 'โปรแกรมที่เลือก' : 'Selected Program'}
                  </span>
                  <span className="font-semibold text-black">{success.interest}</span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {isTh
                    ? 'บันทึกคำขอของคุณเข้าสู่ระบบเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็ว'
                    : 'Your inquiry has been securely recorded. Our team will reach out shortly.'}
                </p>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                {serverError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-lg border border-[#8A795D]/40 text-sm font-semibold text-[#111827] hover:border-[#111827] transition-colors"
              >
                {isTh ? 'ส่งคำขอเพิ่มเติม' : 'Submit Another Inquiry'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#755809] text-white text-sm font-semibold hover:bg-[#5E4606] transition-colors"
              >
                {isTh ? 'ตกลง' : 'OK'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="pt-5 space-y-4">
            {/* Real-time completion status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#F4F6FC] border border-[#D4AF37]/25 p-3.5">
              <div className="text-xs text-neutral-700">
                <span className="font-semibold text-black tabular-nums">
                  {completedRequired}/5 {isTh ? 'ข้อมูลครบถ้วน' : 'required fields ready'}
                </span>
                <span className="mx-2 text-neutral-400">·</span>
                <span>
                  {isTh
                    ? 'กรอกข้อมูลให้ครบเพื่อส่งคำขอได้ทันที โดยไม่ต้องเข้าสู่ระบบ'
                    : 'No sign-in required — complete the form below to submit.'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="contact-fullName" className="text-sm font-semibold text-black">
                    {isTh ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
                  </label>
                  {touched.fullName && !validation.errors.fullName && (
                    <span className="text-xs font-medium text-emerald-700">
                      {isTh ? 'ถูกต้อง' : 'Valid'}
                    </span>
                  )}
                </div>
                <input
                  id="contact-fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                  aria-invalid={Boolean(touched.fullName && validation.errors.fullName)}
                  placeholder={isTh ? 'เช่น สมหญิง ใจดี' : 'e.g. Nattapong S.'}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    touched.fullName && validation.errors.fullName
                      ? 'border-red-500 bg-red-50/40'
                      : touched.fullName && !validation.errors.fullName
                        ? 'border-emerald-600 bg-white'
                        : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {touched.fullName && validation.errors.fullName && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {validation.errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="contact-email" className="text-sm font-semibold text-black">
                    {isTh ? 'อีเมล *' : 'Email Address *'}
                  </label>
                  {touched.email && !validation.errors.email && (
                    <span className="text-xs font-medium text-emerald-700">
                      {isTh ? 'ถูกต้อง' : 'Valid'}
                    </span>
                  )}
                </div>
                <input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  aria-invalid={Boolean(touched.email && validation.errors.email)}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    touched.email && validation.errors.email
                      ? 'border-red-500 bg-red-50/40'
                      : touched.email && !validation.errors.email
                        ? 'border-emerald-600 bg-white'
                        : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {touched.email && validation.errors.email && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {validation.errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="contact-phone" className="text-sm font-semibold text-black">
                    {isTh ? 'เบอร์โทรศัพท์ *' : 'Phone Number *'}
                  </label>
                  {touched.phone && !validation.errors.phone && (
                    <span className="text-xs font-medium text-emerald-700">
                      {isTh ? 'ถูกต้อง' : 'Valid'}
                    </span>
                  )}
                </div>
                <input
                  id="contact-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  aria-invalid={Boolean(touched.phone && validation.errors.phone)}
                  placeholder="+66 81 234 5678"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
                    touched.phone && validation.errors.phone
                      ? 'border-red-500 bg-red-50/40'
                      : touched.phone && !validation.errors.phone
                        ? 'border-emerald-600 bg-white'
                        : 'border-neutral-300 focus:border-black'
                  }`}
                />
                {touched.phone && validation.errors.phone && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {validation.errors.phone}
                  </p>
                )}
              </div>

              {/* Preferred Date */}
              <div>
                <label
                  htmlFor="contact-preferredDate"
                  className="block text-sm font-semibold text-black mb-1.5"
                >
                  {isTh ? 'วันที่สะดวกติดต่อ / นัดหมาย' : 'Preferred Date'}
                </label>
                <input
                  id="contact-preferredDate"
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => handleFieldChange('preferredDate', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {/* Service / Program */}
            <div>
              <label htmlFor="contact-interest" className="block text-sm font-semibold text-black mb-1.5">
                {isTh ? 'บริการหรือโปรแกรมที่สนใจ *' : 'Program / Service Interest *'}
              </label>
              <select
                id="contact-interest"
                value={form.interest}
                onChange={(e) => handleFieldChange('interest', e.target.value)}
                onBlur={() => handleBlur('interest')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black text-sm bg-white outline-none transition-colors"
              >
                {INTEREST_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isTh ? opt.th : opt.en}
                  </option>
                ))}
              </select>
              {touched.interest && validation.errors.interest && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {validation.errors.interest}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="contact-notes" className="text-sm font-semibold text-black">
                  {isTh ? 'รายละเอียดเพิ่มเติม' : 'Goals or Questions'}
                </label>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {form.notes.length}/1000
                </span>
              </div>
              <textarea
                id="contact-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                onBlur={() => handleBlur('notes')}
                placeholder={
                  isTh
                    ? 'บอกเป้าหมายด้านความงาม สุขภาพ หรือการร่วมธุรกิจของคุณ...'
                    : 'Share your beauty, wellness, career, or partnership goals...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-black text-sm outline-none transition-colors resize-none"
              />
              {touched.notes && validation.errors.notes && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {validation.errors.notes}
                </p>
              )}
            </div>

            {/* Consent */}
            <div>
              <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => handleFieldChange('consent', e.target.checked)}
                  onBlur={() => handleBlur('consent')}
                  className="mt-0.5 w-4 h-4 accent-black rounded shrink-0"
                />
                <span>
                  {isTh
                    ? 'ยินยอมให้ทีมงาน Tyme of Beauty ติดต่อกลับและบันทึกข้อมูลเพื่อการให้คำปรึกษา *'
                    : 'I consent to Tyme of Beauty storing my inquiry and contacting me regarding my request. *'}
                </span>
              </label>
              {touched.consent && validation.errors.consent && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {validation.errors.consent}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-lg border border-[#8A795D]/40 text-[#111827] text-sm font-semibold hover:border-[#111827] transition-colors"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 rounded-lg bg-[#755809] text-white text-sm font-semibold hover:bg-[#5E4606] disabled:opacity-60 transition-colors shadow-sm"
              >
                {isSubmitting
                  ? isTh
                    ? 'กำลังส่งข้อมูล...'
                    : 'Submitting...'
                  : isTh
                    ? 'ส่งข้อมูล'
                    : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
