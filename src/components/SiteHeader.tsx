import React from 'react';
import { AppRoute, Language } from '../utils/logic';

interface SiteHeaderProps {
  lang: Language;
  setLang: React.Dispatch<React.SetStateAction<Language>>;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentRoute: AppRoute;
  onNavigateHome: (sectionId?: string) => void;
  onNavigateBeautyServices: () => void;
  onOpenContact: (interest?: string) => void;
  onOpenChatbot: () => void;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  lang,
  setLang,
  menuOpen,
  setMenuOpen,
  currentRoute,
  onNavigateHome,
  onNavigateBeautyServices,
  onOpenContact,
  onOpenChatbot,
}) => {
  const isTh = lang === 'th';

  const navItems: Array<{ label: string; labelTh: string; active?: boolean; action: () => void }> = [
    {
      label: 'Home',
      labelTh: 'หน้าแรก',
      active: currentRoute === '/',
      action: () => onNavigateHome('section-hero'),
    },
    {
      label: 'Services',
      labelTh: 'บริการของเรา',
      active: currentRoute === '/beauty-services',
      action: () => onNavigateBeautyServices(),
    },
    {
      label: 'Products',
      labelTh: 'ผลิตภัณฑ์',
      action: () => onNavigateHome('section-career'),
    },
    {
      label: 'Career',
      labelTh: 'อาชีพความงาม',
      action: () => onNavigateHome('section-career'),
    },
    {
      label: 'Business Partner',
      labelTh: 'พันธมิตรธุรกิจ',
      action: () => onNavigateHome('section-partners'),
    },
    {
      label: 'Influencer',
      labelTh: 'อินฟลูเอนเซอร์',
      action: () => onOpenContact('Influencer'),
    },
    {
      label: 'Contact',
      labelTh: 'ติดต่อเรา',
      action: () => onOpenContact('Free Consultation'),
    },
  ];

  return (
    <>
      {/* FIXED NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-1 md:py-1.5 bg-white/95 backdrop-blur-md border-b border-[#EEDC9A]/50">
        {/* Logo */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome('section-hero');
          }}
          className="flex items-center justify-center no-underline shrink-0 h-16 md:h-20 w-28 md:w-36 overflow-hidden"
          aria-label="Tyme of Beauty - Beauty & Healthy Everywhere"
        >
          <img
            src="/assets/aistudio/IMG_8539_ca8ffde0.JPG"
            alt="Tyme of Beauty - Beauty Everywhere"
            className="w-28 h-28 md:w-36 md:h-36 max-w-none object-contain brightness-105 contrast-105 mix-blend-multiply"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5" aria-label="Primary navigation">
          {/* Thai / English Language Switcher */}
          <div
            className="flex items-center p-0.5 bg-[#EAEFFB] rounded-full border border-[#D4AF37]/30"
            role="group"
            aria-label="Language toggle"
          >
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
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
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
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
            className="text-sm font-semibold text-[#111827] hover:text-[#755809] hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            {isTh ? 'จองคิวบริการ' : 'Service Booking'}
          </button>

          <button
            type="button"
            onClick={onOpenChatbot}
            aria-label={isTh ? 'เปิดผู้ช่วยอัจฉริยะ AI' : 'Open AI Concierge'}
            className="px-5 py-2.5 bg-[#755809] text-white rounded-lg text-sm font-semibold hover:bg-[#5E4606] transition-colors duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{isTh ? 'ปรึกษา AI' : 'AI Concierge'}</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            className="px-6 py-2.5 bg-white rounded-lg border border-[#8A795D] text-[#111827] text-sm font-semibold hover:bg-[#111827] hover:text-white hover:border-[#111827] transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            {isTh ? 'เมนู' : 'Menu'}
          </button>
        </nav>

        {/* Mobile Controls (Lang + AI + Hamburger) */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onOpenChatbot}
            aria-label={isTh ? 'เปิดผู้ช่วยอัจฉริยะ AI' : 'Open AI Concierge'}
            className="px-3 py-1.5 rounded-lg bg-[#755809] text-white text-xs font-semibold whitespace-nowrap"
          >
            {isTh ? 'AI' : 'AI'}
          </button>

          <button
            type="button"
            onClick={() => setLang((prev) => (prev === 'en' ? 'th' : 'en'))}
            aria-label="Switch language"
            className="px-2.5 py-1.5 rounded-lg border border-[#8A795D] text-xs font-bold bg-[#EAEFFB] text-[#111827]"
          >
            {lang === 'en' ? 'TH' : 'EN'}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="w-10 h-10 flex items-center justify-center relative"
          >
            <span
              className={`absolute h-0.5 w-6 bg-[#111827] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-[#111827] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-[#111827] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
              }`}
            />
          </button>
        </div>
      </header>

      {/* SLIDE-OUT MENU OVERLAY (Mobile + Desktop Menu Trigger) */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-[#111827]/30 backdrop-blur-sm transition-opacity duration-500 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Slide-out Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-[#F4F6FC] shadow-2xl border-l border-[#EEDC9A]/50 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1 pt-20 pb-8 overflow-y-auto">
            {navItems.map((item, i) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                aria-current={item.active ? 'page' : undefined}
                style={{
                  transitionDelay: menuOpen ? `${100 + i * 60}ms` : '0ms',
                }}
                className={`font-headline text-left text-3xl md:text-4xl font-bold py-1 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  item.active ? 'text-[#755809]' : 'text-[#111827] hover:text-[#755809]'
                } ${menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
              >
                {isTh ? item.labelTh : item.label}
              </button>
            ))}

            <div
              style={{ transitionDelay: menuOpen ? '450ms' : '0ms' }}
              className={`mt-8 pt-8 border-t border-[#D4AF37]/30 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
            >
              <p className="text-sm font-semibold text-[#755809] mb-4">
                {isTh ? 'จองคิวรับบริการ' : 'Service Booking'}
              </p>
              <button
                type="button"
                onClick={() => onOpenContact('Free Consultation')}
                className="w-full px-6 py-4 bg-[#755809] rounded-lg text-white text-sm font-semibold hover:bg-[#5E4606] transition-colors duration-200"
              >
                {isTh ? 'นัดหมายรับคำปรึกษา' : 'Book Appointment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenChatbot();
                }}
                className="w-full mt-2.5 px-6 py-3.5 bg-[#EAEFFB] border border-[#8A795D]/40 rounded-lg text-[#111827] text-sm font-semibold hover:bg-white transition-colors duration-200"
              >
                {isTh ? 'คุยกับผู้ช่วย AI' : 'Ask AI Concierge'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
