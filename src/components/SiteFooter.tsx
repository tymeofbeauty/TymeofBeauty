import React from 'react';
import { AppRoute, Language } from '../utils/logic';

interface SiteFooterProps {
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  currentRoute: AppRoute;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateBeautyServices: () => void;
  onOpenContact: (interest?: string) => void;
  onOpenChatbot: () => void;
}

export const SiteFooter: React.FC<SiteFooterProps> = ({
  lang,
  setLang,
  currentRoute,
  onNavigateHome,
  onNavigateBeautyServices,
  onOpenContact,
  onOpenChatbot,
}) => {
  const isTh = lang === 'th';

  return (
    <footer className="bg-white border-t border-[#EEDC9A]/60 px-5 md:px-10 py-10 md:py-12 font-body text-[#111827]">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome('section-hero');
              }}
              className="flex items-center justify-center shrink-0 h-16 w-28 overflow-hidden no-underline"
              aria-label="Tyme of Beauty - Back to top"
            >
              <img
                src="/assets/aistudio/IMG_8539_ca8ffde0.JPG"
                alt="Tyme of Beauty - Beauty Everywhere"
                className="w-28 h-28 max-w-none object-contain brightness-105 contrast-105 mix-blend-multiply"
              />
            </a>
            <div>
              <p className="font-headline text-lg font-bold text-[#111827]">
                Tyme of Beauty
              </p>
              <p className="text-xs text-[#755809] font-medium">
                {isTh ? 'ความงามและสุขภาพดีในทุกที่' : 'Beauty & Healthy Everywhere'}
              </p>
            </div>
          </div>

          {/* Footer Navigation */}
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-4 lg:gap-x-5 gap-y-2 text-sm font-semibold"
          >
            <button
              type="button"
              onClick={() => onNavigateHome('section-hero')}
              className="text-[#111827]/80 hover:text-[#755809] transition-colors"
            >
              {isTh ? 'หน้าแรก' : 'Home'}
            </button>
            <button
              type="button"
              onClick={onNavigateBeautyServices}
              aria-current={currentRoute === '/beauty-services' ? 'page' : undefined}
              className={`transition-colors ${
                currentRoute === '/beauty-services'
                  ? 'text-[#755809] underline underline-offset-4'
                  : 'text-[#111827]/80 hover:text-[#755809]'
              }`}
            >
              {isTh ? 'บริการความงาม' : 'Beauty Services'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome('section-career')}
              className="text-[#111827]/80 hover:text-[#755809] transition-colors"
            >
              {isTh ? 'อาชีพความงาม' : 'Career'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome('section-partners')}
              className="text-[#111827]/80 hover:text-[#755809] transition-colors"
            >
              {isTh ? 'พันธมิตรธุรกิจ' : 'Business Partner'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateHome('section-inquiry')}
              className="text-[#111827]/80 hover:text-[#755809] transition-colors"
            >
              {isTh ? 'ส่งข้อมูลติดต่อ' : 'Submit Inquiry'}
            </button>
            <button
              type="button"
              onClick={() => onOpenContact('Influencer')}
              className="text-[#111827]/80 hover:text-[#755809] transition-colors"
            >
              {isTh ? 'อินฟลูเอนเซอร์' : 'Influencer'}
            </button>
            <button
              type="button"
              onClick={onOpenChatbot}
              className="text-[#755809] hover:underline underline-offset-4 transition-colors"
            >
              {isTh ? 'ปรึกษา AI' : 'AI Concierge'}
            </button>
          </nav>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center p-0.5 bg-[#EAEFFB] rounded-full border border-[#D4AF37]/30"
              role="group"
              aria-label="Footer language toggle"
            >
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  lang === 'en'
                    ? 'bg-[#111827] text-white'
                    : 'text-[#111827]/70 hover:text-[#111827]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  lang === 'th'
                    ? 'bg-[#111827] text-white'
                    : 'text-[#111827]/70 hover:text-[#111827]'
                }`}
              >
                TH
              </button>
            </div>
            <button
              type="button"
              onClick={() => onOpenContact('Free Consultation')}
              className="px-5 py-2.5 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-xs md:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {isTh ? 'ปรึกษาฟรี' : 'Free Consultation'}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#111827]/60">
          <p>
            © {new Date().getFullYear()} Tyme of Beauty.{' '}
            {isTh ? 'สงวนลิขสิทธิ์ทั้งหมด' : 'All rights reserved.'}
          </p>
          <p>
            {isTh
              ? 'ผู้ให้บริการความงามและสุขภาพครบวงจรทั่วประเทศไทย'
              : 'Trusted Beauty & Wellness Network across Thailand'}
          </p>
        </div>
      </div>
    </footer>
  );
};
