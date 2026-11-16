import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ContactField,
  ContactFormInput,
  Language,
  validateContactForm,
} from '../utils/logic';
import { saveContactSubmissionRecord, saveUserSpreadsheet } from '../firebase';

interface PartnerInquirySectionProps {
  lang: Language;
  user: User | null;
  accessToken: string | null;
  linkedSpreadsheetId?: string;
  onSheetLinked: (spreadsheetId: string, spreadsheetUrl: string) => void;
  onBookOnline: () => void;
}

interface InquirySuccess {
  referenceId: string;
  mode: 'sheets' | 'guest';
  spreadsheetUrl?: string;
}

const PARTNER_INTERESTS: Array<{ value: string; en: string; th: string }> = [
  { value: 'Professional Career', en: 'Join as Career (TYME Career)', th: 'สมัครสายอาชีพความงาม (TYME Career)' },
  { value: 'Business Partner', en: 'Join as Business Partner', th: 'สมัครเป็นพันธมิตรทางธุรกิจ (Business Partner)' },
  { value: 'Influencer', en: 'Join as Influencer', th: 'ร่วมงานอินฟลูเอนเซอร์ (Influencer)' },
  { value: 'Beauty Services', en: 'Beauty Services Consultation', th: 'ปรึกษาบริการด้านความงาม' },
  { value: 'Healthy Services', en: 'Healthy & Wellness Services', th: 'ปรึกษาบริการดูแลสุขภาพ' },
];

export const PartnerInquirySection: React.FC<PartnerInquirySectionProps> = ({
  lang,
  user,
  accessToken,
  linkedSpreadsheetId,
  onSheetLinked,
  onBookOnline,
}) => {
  const isTh = lang === 'th';

  const [form, setForm] = useState<ContactFormInput>({
    fullName: '',
    email: '',
    phone: '',
    interest: 'Business Partner',
    preferredDate: '',
    notes: '',
    consent: true,
  });
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<InquirySuccess | null>(null);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.displayName || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const validation = validateContactForm(form, lang);

  const updateField = <K extends ContactField>(field: K, value: ContactFormInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      interest: true,
      consent: true,
    });

    if (!validation.valid) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (accessToken) {
        const res = await fetch('/api/contact/sheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
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
          throw new Error(data.error || 'Failed to save inquiry to Google Sheets.');
        }
        if (user && data.spreadsheetId && data.spreadsheetUrl) {
          onSheetLinked(data.spreadsheetId, data.spreadsheetUrl);
          await saveUserSpreadsheet(user.uid, data.spreadsheetId, data.spreadsheetUrl);
          await saveContactSubmissionRecord(user.uid, {
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
          mode: 'sheets',
          spreadsheetUrl: data.spreadsheetUrl,
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
        if (user) {
          await saveContactSubmissionRecord(user.uid, {
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
          mode: 'guest',
        });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="section-inquiry"
      className="grid grid-cols-1 lg:grid-cols-2 border-t border-[#EEDC9A]/50 font-body"
    >
      {/* Left Column */}
      <div className="bg-[#F4F6FC] px-6 pt-24 pb-16 md:p-14 lg:p-24 flex flex-col justify-center relative overflow-hidden">
        {/* Ambient Gold Accent */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 bg-[#C59B27]/12 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-lg">
          <span className="text-xs md:text-sm uppercase tracking-widest text-[#755809] font-bold mb-4 block">
            {isTh ? 'ขยายระบบนิเวศทางธุรกิจ' : 'Ecosystem Extension'}
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6 text-[#111827] leading-[1.08]">
            {isTh ? 'ร่วมเป็นพันธมิตรทางธุรกิจ' : 'Become a Business Partner'}
          </h2>
          <p className="text-[#111827]/70 font-normal mb-10 text-base md:text-lg leading-relaxed">
            {isTh
              ? 'ขยายศักยภาพการให้บริการและสร้างรายได้ใหม่ พร้อมระบบจัดการการจองและการดูแลลูกค้าอย่างครบวงจรบนแพลตฟอร์มของเรา'
              : 'Expand your service capabilities and unlock new revenue streams. Manage bookings and interact with clients seamlessly within our curated platform.'}
          </p>

          <button
            type="button"
            onClick={onBookOnline}
            className="bg-[#111827] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#755809] transition-colors shadow-xl shadow-[#111827]/10 w-fit"
          >
            {isTh ? 'สมัครเลยตอนนี้' : 'Apply Now'}
          </button>
        </div>
      </div>

      {/* Right Column */}
      <div className="bg-[#EAEFFB] px-6 py-16 md:p-14 lg:p-24 flex flex-col justify-center">
        <div className="bg-white rounded-3xl p-7 md:p-10 shadow-2xl border border-[#EEDC9A]/40 relative">
          <div className="mb-7">
            <h3 className="font-headline text-3xl font-bold mb-1.5 text-[#111827]">
              {isTh ? 'ส่งข้อมูลติดต่อสอบถาม' : 'Submit Inquiry'}
            </h3>
            <p className="text-[#111827]/60 font-normal text-sm">
              {isTh
                ? 'กรอกข้อมูลด้านล่างเพื่อส่งคำขอรับคำปรึกษา ทีมงานจะติดต่อกลับโดยเร็ว'
                : 'Fill out your details below and our team will reach out shortly.'}
            </p>
          </div>

          {success ? (
            <div
              className="p-6 bg-[#F4F6FC] text-[#111827] rounded-2xl border border-[#D4AF37]/40 text-sm flex flex-col gap-2 text-center"
              data-testid="footer-inquiry-success"
            >
              <span className="font-bold text-[#755809] text-base">
                {isTh ? 'ส่งข้อมูลเรียบร้อยแล้ว' : 'Inquiry Submitted Successfully!'}
              </span>
              <span>
                {isTh ? 'รหัสอ้างอิงของคุณ:' : 'Your Reference ID:'}{' '}
                <strong className="font-headline tracking-widest text-lg ml-1 text-[#111827]">
                  {success.referenceId}
                </strong>
              </span>
              <span className="text-[#111827]/65 text-xs mt-1">
                {isTh
                  ? 'บันทึกคำขอเข้าระบบเรียบร้อยแล้ว ทีมงานจะติดต่อกลับโดยเร็ว'
                  : 'Your inquiry has been recorded. Our team will reach out shortly.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setTouched({});
                  setForm((prev) => ({ ...prev, notes: '' }));
                }}
                className="mt-3 inline-flex items-center justify-center px-8 py-2.5 bg-[#755809] hover:bg-[#5E4606] text-white rounded-lg text-sm font-semibold transition-colors mx-auto shadow-sm"
              >
                {isTh ? 'ตกลง' : 'OK'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div>
                <label htmlFor="footer-name" className="block text-sm font-bold text-[#111827] mb-2">
                  {isTh ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
                </label>
                <input
                  id="footer-name"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                  placeholder={isTh ? 'เช่น สมชาย ใจดี' : 'e.g. Somchai Jai-dee'}
                  className="w-full bg-[#F4F6FC] px-4 py-3 rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#C59B27] focus:ring-4 focus:ring-[#C59B27]/15 outline-none transition-all text-sm text-[#111827]"
                />
                {touched.fullName && validation.errors.fullName && (
                  <span className="text-xs text-red-600 block mt-1.5 font-medium" role="alert">
                    {validation.errors.fullName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="footer-email" className="block text-sm font-bold text-[#111827] mb-2">
                    {isTh ? 'อีเมล *' : 'Email Address *'}
                  </label>
                  <input
                    id="footer-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                    placeholder="contact@example.com"
                    className="w-full bg-[#F4F6FC] px-4 py-3 rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#C59B27] focus:ring-4 focus:ring-[#C59B27]/15 outline-none transition-all text-sm text-[#111827]"
                  />
                  {touched.email && validation.errors.email && (
                    <span className="text-xs text-red-600 block mt-1.5 font-medium" role="alert">
                      {validation.errors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label htmlFor="footer-phone" className="block text-sm font-bold text-[#111827] mb-2">
                    {isTh ? 'เบอร์โทรศัพท์ *' : 'Phone Number *'}
                  </label>
                  <input
                    id="footer-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    placeholder="+66 81 234 5678"
                    className="w-full bg-[#F4F6FC] px-4 py-3 rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#C59B27] focus:ring-4 focus:ring-[#C59B27]/15 outline-none transition-all text-sm text-[#111827]"
                  />
                  {touched.phone && validation.errors.phone && (
                    <span className="text-xs text-red-600 block mt-1.5 font-medium" role="alert">
                      {validation.errors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="footer-interest" className="block text-sm font-bold text-[#111827] mb-2">
                  {isTh ? 'บริการหรือโปรแกรมที่สนใจ' : 'Service Interest'}
                </label>
                <select
                  id="footer-interest"
                  value={form.interest}
                  onChange={(e) => updateField('interest', e.target.value)}
                  className="w-full bg-[#F4F6FC] px-4 py-3 rounded-xl border border-[#E2E8F0] focus:bg-white focus:border-[#C59B27] focus:ring-4 focus:ring-[#C59B27]/15 outline-none transition-all text-sm text-[#111827]"
                >
                  {PARTNER_INTERESTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isTh ? opt.th : opt.en}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#111827]/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => updateField('consent', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#755809] rounded shrink-0"
                />
                <span>
                  {isTh
                    ? 'ยินยอมให้ทีมงาน Tyme of Beauty ติดต่อกลับและบันทึกข้อมูลเพื่อการให้คำปรึกษา'
                    : 'I consent to Tyme of Beauty storing my inquiry and contacting me regarding my request.'}
                </span>
              </label>
              {touched.consent && validation.errors.consent && (
                <span className="text-xs text-red-600 block font-medium" role="alert">
                  {validation.errors.consent}
                </span>
              )}

              {errorMsg && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5" role="alert">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 bg-[#755809] hover:bg-[#5E4606] text-white px-8 py-4 rounded-xl font-bold transition-colors flex justify-center items-center gap-3 shadow-lg shadow-[#C59B27]/20 disabled:opacity-60"
              >
                <span>
                  {isSubmitting
                    ? isTh
                      ? 'กำลังส่งข้อมูล...'
                      : 'Submitting...'
                    : isTh
                      ? 'ส่งข้อมูล'
                      : 'Submit'}
                </span>
                {isSubmitting && (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
