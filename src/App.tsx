import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ensureUserProfile,
  getUserProfile,
  googleSignIn,
  initAuth,
} from './firebase';
import {
  computeMaskedCardBackground,
  Language,
  MaskPosition,
} from './utils/logic';
import { ContactModal } from './components/ContactModal';
import { ChatbotDrawer } from './components/ChatbotDrawer';
import { PartnerInquirySection } from './components/PartnerInquirySection';
import { PathwayShowcaseSection } from './components/PathwayShowcaseSection';

const HERO_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_s5pb3ss5pb3ss5pb.jpg?updatedAt=1794729979384&w=1280&q=85';

const SECTION2_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_a67z1ya67z1ya67z.jpg?updatedAt=1794729979198&w=1280&q=85';

const SECTION3_IMG1 =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_w7llp1w7llp1w7ll.jpg?updatedAt=1794730635515&w=1280&q=85';

const SECTION3_IMG2 =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_cwlt24cwlt24cwlt.jpg?updatedAt=1794729979213&w=1280&q=85';

const SECTION3_BG =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_1aont91aont91aon.jpg?updatedAt=1794730203597&w=1280&q=85';

const featureBars = ['Career', 'Business Partner', 'Influencer'];
const featureBarsTh = ['อาชีพความงาม', 'พันธมิตรธุรกิจ', 'อินฟลูเอนเซอร์'];

const services = [
  { name: 'Beauty\nServices', nameTh: 'บริการ\nความงาม', num: '01', active: true, interest: 'Beauty Services' },
  { name: 'Beauty\nProducts', nameTh: 'ผลิตภัณฑ์\nความงาม', num: '02', active: false, interest: 'Beauty Products' },
  { name: 'Healthy\nServices', nameTh: 'บริการ\nสุขภาพ', num: '03', active: false, interest: 'Healthy Services' },
  { name: 'Professional\nCareer', nameTh: 'อาชีพ\nมืออาชีพ', num: null, active: false, interest: 'Professional Career' },
];

const DEFAULT_POS: MaskPosition = { x: 0, y: 0, sw: 1440, sh: 900 };

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function useMaskPositions(
  sectionRef: React.RefObject<HTMLElement | null>,
  cardRefs: React.MutableRefObject<Array<HTMLElement | null>>,
  count: number
) {
  const [positions, setPositions] = useState<MaskPosition[]>(() =>
    Array.from({ length: count }, () => DEFAULT_POS)
  );

  const measure = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const sRect = section.getBoundingClientRect();
    const sw = sRect.width || window.innerWidth;
    const sh = sRect.height || window.innerHeight;

    const next: MaskPosition[] = Array.from({ length: count }, (_, idx) => {
      const card = cardRefs.current[idx];
      if (!card) return { x: 0, y: 0, sw, sh };
      const cRect = card.getBoundingClientRect();
      return {
        x: cRect.left - sRect.left,
        y: cRect.top - sRect.top,
        sw,
        sh,
      };
    });

    setPositions(next);
  }, [sectionRef, cardRefs, count]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(section);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [sectionRef, measure]);

  return { positions, sectionHeight: positions[0]?.sh ?? 900 };
}

function useImageWidth(src: string, sectionHeight: number): number {
  const [ratio, setRatio] = useState<number>(16 / 9);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (active && img.naturalHeight > 0) {
        setRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return ratio * sectionHeight;
}

function useStaggeredReveal(count: number, threshold = 0.15) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const getAnimStyle = useCallback(
    (index: number): React.CSSProperties => {
      const idx = Math.min(index, count - 1);
      return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${idx * 120}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${idx * 120}ms`,
      };
    },
    [visible, count]
  );

  return { containerRef, getAnimStyle };
}

interface MaskedCardProps {
  bgImage: string;
  position: MaskPosition;
  imageWidth: number;
  focalX: number;
  className?: string;
  children?: React.ReactNode;
  cardRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

const MaskedCard: React.FC<MaskedCardProps> = ({
  bgImage,
  position,
  imageWidth,
  focalX,
  className = '',
  children,
  cardRef,
  style,
}) => {
  const bgMath = computeMaskedCardBackground(position, imageWidth, focalX);
  return (
    <div
      ref={cardRef}
      className={`bg-stone-200 ${className}`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgMath.backgroundSize,
        backgroundPosition: bgMath.backgroundPosition,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let step = 0;
    const interval = window.setInterval(() => {
      step += 1;
      setCount(step);
      if (step >= 100) {
        window.clearInterval(interval);
        window.setTimeout(() => setExiting(true), 200);
        window.setTimeout(() => onComplete(), 900);
      }
    }, 20);

    return () => window.clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      aria-label="Loading Tyme of Beauty"
      className={`fixed inset-0 z-[100] bg-[#F4F6FC] flex items-end justify-start transition-opacity duration-700 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <span className="font-headline text-7xl md:text-9xl font-bold tabular-nums p-6 md:p-10 leading-none text-[#111827]">
        {count}
      </span>
    </div>
  );
};

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
}

const ResilientImage: React.FC<ResilientImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-stone-200 via-neutral-200 to-zinc-300 flex items-center justify-center p-4 text-center ${className}`}
      >
        <span className="text-xs font-semibold text-neutral-600">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

const ArrowCircleIcon: React.FC<{ variant?: 'dark' | 'gold' | 'white' }> = ({
  variant = 'dark',
}) => {
  const styles =
    variant === 'white'
      ? 'border-[#EEDC9A] text-[#EEDC9A]'
      : variant === 'gold'
        ? 'border-[#C59B27] bg-[#C59B27]/10 text-[#755809]'
        : 'border-[#111827] text-[#111827]';
  return (
    <span
      className={`self-end w-9 h-9 md:w-12 md:h-12 rounded-full border flex items-center justify-center ${styles}`}
    >
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="rotate-[-45deg]"
      aria-hidden="true"
    >
      <path
        d="M1 7h12m0 0L8 2m5 5L8 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    </span>
  );
};

export default function App() {
  const skipSplashOnLoad =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [showSplash, setShowSplash] = useState<boolean>(!skipSplashOnLoad);
  const [lang, setLang] = useState<Language>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeServiceIdx, setActiveServiceIdx] = useState<number>(0);

  // Modals & Drawers
  const [contactOpen, setContactOpen] = useState(false);
  const [contactInterest, setContactInterest] = useState<string>('Free Consultation');
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Firebase Auth & Workspace state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkedSheet, setLinkedSheet] = useState<{ id?: string; url?: string }>({});

  const isTh = lang === 'th';
  const isMobile = useIsMobile();

  // Section 1 refs
  const section1Ref = useRef<HTMLElement | null>(null);
  const s1CardRefs = useRef<Array<HTMLElement | null>>([null, null, null, null]);
  const s1Masks = useMaskPositions(section1Ref, s1CardRefs, 4);
  const s1ImgWidth = useImageWidth(HERO_IMAGE, s1Masks.sectionHeight);
  const s1Reveal = useStaggeredReveal(4, 0.15);

  // Section 2 refs
  const section2Ref = useRef<HTMLElement | null>(null);
  const s2CardRefs = useRef<Array<HTMLElement | null>>([null, null, null, null]);
  const s2Masks = useMaskPositions(section2Ref, s2CardRefs, 4);
  const s2ImgWidth = useImageWidth(SECTION2_IMAGE, s2Masks.sectionHeight);
  const s2Reveal = useStaggeredReveal(4, 0.15);

  // Section 3 reveal
  const s3Reveal = useStaggeredReveal(4, 0.15);

  // Firebase Auth initialization
  useEffect(() => {
    const unsub = initAuth(async (authUser, token) => {
      setUser(authUser);
      setAccessToken(token);
      if (authUser) {
        try {
          await ensureUserProfile(authUser, lang);
          const profile = await getUserProfile(authUser.uid);
          if (profile?.spreadsheetId && profile?.spreadsheetUrl) {
            setLinkedSheet({
              id: profile.spreadsheetId,
              url: profile.spreadsheetUrl,
            });
          }
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      } else {
        setLinkedSheet({});
      }
    });
    return () => unsub();
  }, []);

  // Lock body scroll when slide-out menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleGoogleSignIn = useCallback(async () => {
    const res = await googleSignIn();
    if (!res) return null;
    setUser(res.user);
    setAccessToken(res.accessToken);
    try {
      await ensureUserProfile(res.user, lang);
      const profile = await getUserProfile(res.user.uid);
      if (profile?.spreadsheetId && profile?.spreadsheetUrl) {
        setLinkedSheet({
          id: profile.spreadsheetId,
          url: profile.spreadsheetUrl,
        });
      }
    } catch (err) {
      console.error('Profile sync error after sign-in:', err);
    }
    return res;
  }, [lang]);

  const openContact = useCallback((interest = 'Free Consultation') => {
    setContactInterest(interest);
    setContactOpen(true);
    setMenuOpen(false);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const navItems: Array<{ label: string; labelTh: string; action: () => void }> = [
    { label: 'Home', labelTh: 'หน้าแรก', action: () => scrollToSection('section-hero') },
    { label: 'Services', labelTh: 'บริการของเรา', action: () => scrollToSection('section-career') },
    { label: 'About', labelTh: 'เกี่ยวกับเรา', action: () => scrollToSection('section-hero') },
    { label: 'Career', labelTh: 'อาชีพความงาม', action: () => scrollToSection('section-career') },
    {
      label: 'Business Partner',
      labelTh: 'พันธมิตรธุรกิจ',
      action: () => scrollToSection('section-partners'),
    },
    {
      label: 'Influencer',
      labelTh: 'อินฟลูเอนเซอร์',
      action: () => openContact('Influencer'),
    },
    {
      label: 'Contact',
      labelTh: 'ติดต่อเรา',
      action: () => openContact('Free Consultation'),
    },
  ];

  return (
    <div className="bg-white min-h-screen text-[#111827] relative font-body">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* FIXED NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-1 md:py-1.5 bg-white/95 backdrop-blur-md border-b border-[#EEDC9A]/50">
        {/* Logo */}
        <a
          href="#section-hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('section-hero');
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
            onClick={() => openContact('Free Consultation')}
            className="text-sm font-semibold text-[#111827] hover:text-[#755809] hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            {isTh ? 'จองคิวบริการ' : 'Service Booking'}
          </button>

          <button
            type="button"
            onClick={() => setChatbotOpen(true)}
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
            onClick={() => setChatbotOpen(true)}
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
                style={{
                  transitionDelay: menuOpen ? `${100 + i * 60}ms` : '0ms',
                }}
                className={`font-headline text-left text-3xl md:text-4xl font-bold text-[#111827] hover:text-[#755809] py-1 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  menuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
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
                onClick={() => openContact('Free Consultation')}
                className="w-full px-6 py-4 bg-[#755809] rounded-lg text-white text-sm font-semibold hover:bg-[#5E4606] transition-colors duration-200"
              >
                {isTh ? 'นัดหมายรับคำปรึกษา' : 'Book Appointment'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setChatbotOpen(true);
                }}
                className="w-full mt-2.5 px-6 py-3.5 bg-[#EAEFFB] border border-[#8A795D]/40 rounded-lg text-[#111827] text-sm font-semibold hover:bg-white transition-colors duration-200"
              >
                {isTh ? 'คุยกับผู้ช่วย AI' : 'Ask AI Concierge'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main>
        {/* SECTION 1 - HERO */}
        <section
          id="section-hero"
          ref={(el) => {
            section1Ref.current = el;
            s1Reveal.containerRef.current = el;
          }}
          className="h-screen w-full overflow-hidden flex flex-col pt-[84px] md:pt-[100px] px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
        >
          {/* 3 Feature Bars */}
          {featureBars.map((bar, i) => {
            const label = isTh ? featureBarsTh[i] : bar;
            const targetSection = i === 0 ? 'section-career' : 'section-partners';
            return (
              <MaskedCard
                key={bar}
                bgImage={HERO_IMAGE}
                position={s1Masks.positions[i] ?? DEFAULT_POS}
                imageWidth={s1ImgWidth}
                focalX={isMobile ? 0.7 : 0.8}
                cardRef={(el) => {
                  s1CardRefs.current[i] = el;
                }}
                style={s1Reveal.getAnimStyle(i)}
                className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (i === 2) {
                      openContact('Influencer');
                    } else {
                      scrollToSection(targetSection);
                    }
                  }}
                  className="w-full h-full flex items-center justify-center relative z-10 bg-[#111827]/35 hover:bg-[#111827]/45 border border-[#EEDC9A]/25 transition-colors"
                >
                  <span className="font-headline text-white drop-shadow-sm text-lg md:text-3xl font-bold text-center tracking-wide">
                    {label}
                  </span>
                </button>
              </MaskedCard>
            );
          })}

          {/* Main Hero Card (index 3) */}
          <MaskedCard
            bgImage={HERO_IMAGE}
            position={s1Masks.positions[3] ?? DEFAULT_POS}
            imageWidth={s1ImgWidth}
            focalX={isMobile ? 0.7 : 0.8}
            cardRef={(el) => {
              s1CardRefs.current[3] = el;
            }}
            style={s1Reveal.getAnimStyle(3)}
            className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
          >
            {/* Readability scrim for white text */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#111827]/75 via-[#111827]/20 to-[#111827]/40 pointer-events-none"
              aria-hidden="true"
            />

            {/* Top-left text */}
            <p className="font-body absolute top-4 left-4 md:top-7 md:left-7 text-white drop-shadow-sm text-[16px] font-semibold leading-[21px] max-w-[calc(100%-2rem)] md:max-w-[380px] z-10">
              {isTh ? (
                <>
                  เรามุ่งมั่นมอบบริการระดับมืออาชีพ
                  <br />
                  ที่ผสานเทคโนโลยีความงามสมัยใหม่
                </>
              ) : (
                <>
                  We wish to provide professional services
                  <br />
                  that match the current technologies
                </>
              )}
            </p>

            {/* Bottom-left block */}
            <div className="absolute bottom-20 left-3 right-3 md:bottom-8 md:left-6 md:right-auto z-10">
              <span className="font-body block text-[#EEDC9A] drop-shadow-sm text-[20px] font-semibold mb-1 md:mb-2">
                {isTh
                  ? 'ผู้ให้บริการความงามและสุขภาพที่ได้รับความไว้วางใจทั่วประเทศไทย'
                  : 'Trusted service providers across Thailand'}
              </span>
              <h1 className="font-headline text-white drop-shadow-sm text-[52px] md:text-[68px] font-bold leading-[75px] w-[590px] max-w-full h-[141px] tracking-tight">
                {isTh ? (
                  <>
                    ความงามและสุขภาพ
                    <br />
                    ที่ใส่ใจคุณ
                  </>
                ) : (
                  <>
                    Beauty &amp; Healthy
                    <br />
                    Care
                  </>
                )}
              </h1>
            </div>

            {/* Bottom-right Free Consultation trigger */}
            <button
              type="button"
              onClick={() => openContact('Free Consultation')}
              className="font-body absolute bottom-5 right-4 md:bottom-10 md:right-8 w-[180px] h-[40px] text-[18px] text-white font-semibold z-10 flex items-center justify-center whitespace-nowrap rounded-lg bg-[#755809]/95 border border-[#EEDC9A]/50 backdrop-blur-md hover:bg-[#5E4606] transition-colors shadow-lg"
            >
              {isTh ? 'ปรึกษาฟรี' : 'Free Consultation'}
            </button>
          </MaskedCard>
        </section>

        {/* SECTION 2 - CAREER */}
        <section
          id="section-career"
          ref={(el) => {
            section2Ref.current = el;
            s2Reveal.containerRef.current = el;
          }}
          className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
        >
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
            {/* Card 0 - Top Left */}
            <MaskedCard
              bgImage={SECTION2_IMAGE}
              position={s2Masks.positions[0] ?? DEFAULT_POS}
              imageWidth={s2ImgWidth}
              focalX={isMobile ? 0.65 : 0.8}
              cardRef={(el) => {
                s2CardRefs.current[0] = el;
              }}
              style={s2Reveal.getAnimStyle(0)}
              className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
            >
              <div
                className="absolute inset-0 bg-gradient-to-b from-[#111827]/50 via-transparent to-[#111827]/50 pointer-events-none"
                aria-hidden="true"
              />
              <h2 className="font-headline absolute top-20 left-5 md:top-24 md:left-7 text-white drop-shadow-sm text-2xl md:text-3xl font-bold z-10">
                {isTh ? 'อาชีพ TYME Career' : 'TYME Career'}
              </h2>
              <p className="font-body absolute bottom-4 left-5 md:bottom-6 md:left-7 text-[#EEDC9A] drop-shadow-sm text-xs md:text-sm font-semibold z-10">
                {isTh
                  ? 'สร้างรายได้จากวิชาชีพที่ผ่านการรับรองมาตรฐาน'
                  : 'Earning from certified professional work'}
              </p>
            </MaskedCard>

            {/* Card 1 - Top Right (spans 2 rows on desktop) */}
            <MaskedCard
              bgImage={SECTION2_IMAGE}
              position={s2Masks.positions[1] ?? DEFAULT_POS}
              imageWidth={s2ImgWidth}
              focalX={isMobile ? 0.65 : 0.8}
              cardRef={(el) => {
                s2CardRefs.current[1] = el;
              }}
              style={s2Reveal.getAnimStyle(1)}
              className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
            >
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#111827]/65 via-[#111827]/15 to-transparent pointer-events-none"
                aria-hidden="true"
              />
              <p className="font-body absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10 max-w-xs">
                {isTh ? (
                  <>
                    หากคุณต้องการคว้าโอกาสนี้
                    <br />
                    ติดต่อเราเพื่อสอบถามการเปลี่ยนแปลงชีวิตและอาชีพของคุณ
                  </>
                ) : (
                  <>
                    If you want a get this opportunity,
                    <br />
                    contact us to ask about a life and career makeover.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => openContact('Professional Career')}
                className="font-body absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-4 bg-[#C59B27] hover:bg-[#D4AF37] rounded-lg text-[#111827] text-base md:text-xl font-bold z-10 hover:scale-105 transition-all shadow-md"
              >
                {isTh ? 'ติดต่อเรา' : 'Contact Us'}
              </button>
            </MaskedCard>

            {/* Card 2 - Bottom Left */}
            <MaskedCard
              bgImage={SECTION2_IMAGE}
              position={s2Masks.positions[2] ?? DEFAULT_POS}
              imageWidth={s2ImgWidth}
              focalX={isMobile ? 0.65 : 0.8}
              cardRef={(el) => {
                s2CardRefs.current[2] = el;
              }}
              style={s2Reveal.getAnimStyle(2)}
              className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#111827]/55 via-[#111827]/15 to-transparent pointer-events-none"
                aria-hidden="true"
              />
              <h2 className="font-headline absolute top-4 left-5 md:top-6 md:left-7 text-white drop-shadow-sm text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.95] z-10">
                {isTh ? (
                  <>
                    เปลี่ยนโฉม
                    <br />
                    อาชีพใหม่
                  </>
                ) : (
                  <>
                    Career
                    <br />
                    makeover
                  </>
                )}
              </h2>
            </MaskedCard>

            {/* Card 3 - Bottom Full Width (Services) */}
            <MaskedCard
              bgImage={SECTION2_IMAGE}
              position={s2Masks.positions[3] ?? DEFAULT_POS}
              imageWidth={s2ImgWidth}
              focalX={isMobile ? 0.65 : 0.8}
              cardRef={(el) => {
                s2CardRefs.current[3] = el;
              }}
              style={s2Reveal.getAnimStyle(3)}
              className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
            >
              <div className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-2 md:gap-2.5 p-2.5 md:p-4">
                {services.map((svc, idx) => {
                  const isActive = idx === activeServiceIdx;
                  return (
                    <button
                      key={svc.interest}
                      type="button"
                      onClick={() => setActiveServiceIdx(idx)}
                      onDoubleClick={() => openContact(svc.interest)}
                      className={`text-left flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_36px_-10px_rgba(197,155,39,0.32)] hover:z-10 border cursor-pointer ${
                        isActive
                          ? 'bg-[#F4F6FC]/95 border-[#D4AF37]/70 backdrop-blur-md shadow-md hover:border-[#C59B27]'
                          : 'bg-[#111827]/40 border-[#EEDC9A]/25 backdrop-blur-xl hover:bg-[#111827]/55 hover:border-[#EEDC9A]/60'
                      }`}
                    >
                      <h3
                        className={`font-headline text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${
                          isActive ? 'text-[#111827]' : 'text-white'
                        }`}
                      >
                        {isTh ? svc.nameTh : svc.name}
                      </h3>
                      {svc.num && (
                        <span
                          className={`font-body self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold tabular-nums ${
                            isActive
                              ? 'border-[#C59B27] bg-[#C59B27]/15 text-[#755809]'
                              : 'border-[#EEDC9A]/80 text-[#EEDC9A]'
                          }`}
                        >
                          {svc.num}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </MaskedCard>
          </div>
        </section>

        {/* SECTION 3 - BUSINESS PARTNERS */}
        <section
          id="section-partners"
          ref={(el) => {
            s3Reveal.containerRef.current = el;
          }}
          className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
        >
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-1.5 md:gap-2 min-h-0">
              {/* 1. Heading Card */}
              <div
                style={s3Reveal.getAnimStyle(0)}
                className="rounded-xl md:rounded-2xl bg-[#F4F6FC] border border-[#E2E8F0] px-5 pb-5 pt-20 md:px-7 md:pb-7 md:pt-24 flex flex-col justify-between flex-[1.2] min-h-[220px] md:min-h-0"
              >
                <h2 className="font-headline text-[clamp(2.5rem,5.5vw,5.5rem)] font-bold leading-[0.95] text-[#111827]">
                  {isTh ? (
                    <>
                      พันธมิตร
                      <br />
                      ทางธุรกิจ
                    </>
                  ) : (
                    <>
                      Business
                      <br />
                      Partners
                    </>
                  )}
                </h2>
                <p className="font-body text-xs md:text-sm font-semibold text-[#755809]">
                  {isTh
                    ? 'ขับเคลื่อนความสำเร็จทางธุรกิจไปพร้อมกัน'
                    : 'Driving Business Together'}
                </p>
              </div>

              {/* 2. Two Image Cards */}
              <div
                style={s3Reveal.getAnimStyle(1)}
                className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
              >
                <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                  <ResilientImage
                    src={SECTION3_IMG1}
                    alt="Business Partner"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
                  <ResilientImage
                    src={SECTION3_IMG2}
                    alt="Influencers"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 3. Consultation Card */}
              <div
                style={s3Reveal.getAnimStyle(2)}
                className="rounded-xl md:rounded-2xl bg-[#EAEFFB] border border-[#D4AF37]/25 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
              >
                <div>
                  <p className="font-body text-xs md:text-sm font-semibold text-[#755809] mb-2 md:mb-3">
                    {isTh ? 'บริการให้คำปรึกษา' : 'Consultation'}
                  </p>
                  <h3 className="font-headline text-xl md:text-3xl font-bold text-[#111827] leading-6 md:leading-8">
                    {isTh ? (
                      <>
                        บริการ
                        <br />
                        ดูแลสุขภาพ
                        <br />
                        ครบวงจร
                      </>
                    ) : (
                      <>
                        All
                        <br />
                        Wellness
                        <br />
                        Services
                      </>
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openContact('Free Consultation')}
                  className="font-body px-5 py-3 md:px-8 md:py-4 bg-[#755809] hover:bg-[#5E4606] rounded-lg text-white text-base md:text-xl font-bold hover:scale-105 transition-all whitespace-nowrap shadow-sm"
                >
                  {isTh ? 'จองออนไลน์ทันที' : 'Book Online Now'}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div
              style={s3Reveal.getAnimStyle(3)}
              className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0"
            >
              <ResilientImage
                src={SECTION3_BG}
                alt="Smiling wellness client"
                className="w-full h-full object-cover mr-0 object-[40%_center]"
              />

              {/* Overlay Cards */}
              <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
                {/* Overlay Card 1 (light surface, left) */}
                <button
                  type="button"
                  onClick={() => openContact('Business Partner')}
                  className="text-left flex-1 bg-[#F4F6FC] hover:bg-white border border-[#D4AF37]/30 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 hover:scale-[1.02] transition-all"
                >
                  <h4 className="font-headline text-lg md:text-2xl font-bold text-[#111827] leading-5 md:leading-7">
                    {isTh ? (
                      <>
                        โอกาส
                        <br />
                        ทางธุรกิจ
                        <br />
                        รอคุณอยู่
                      </>
                    ) : (
                      <>
                        Business
                        <br />
                        Opportunities
                        <br />
                        is waiting
                      </>
                    )}
                  </h4>
                  <ArrowCircleIcon variant="gold" />
                </button>

                {/* Overlay Card 2 (dark glass, right) */}
                <button
                  type="button"
                  onClick={() => openContact('Influencer')}
                  className="text-left flex-1 bg-[#111827]/45 backdrop-blur-xl border border-[#EEDC9A]/40 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 hover:bg-[#111827]/60 transition-colors"
                >
                  <h4 className="font-headline text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                    {isTh ? (
                      <>
                        สร้างรายได้
                        <br />
                        สำหรับทุกคน
                        <br />
                        ไม่มีค่าใช้จ่าย
                      </>
                    ) : (
                      <>
                        Earning
                        <br />
                        For everyone
                        <br />
                        At no costs
                      </>
                    )}
                  </h4>
                  <ArrowCircleIcon variant="white" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ATTACHED SHOWCASE MODULE: SUCCESSFUL PATHWAY & GROW WITH TYME OF BEAUTY */}
        <PathwayShowcaseSection lang={lang} onOpenContact={openContact} />

        {/* SECTION 4 - FOOTER / BUSINESS PARTNER INQUIRY */}
        <PartnerInquirySection
          lang={lang}
          user={user}
          accessToken={accessToken}
          linkedSpreadsheetId={linkedSheet.id}
          onSheetLinked={(id, url) => setLinkedSheet({ id, url })}
          onBookOnline={() => openContact('Business Partner')}
        />
      </main>

      {/* SITE FOOTER */}
      <footer className="bg-white border-t border-[#EEDC9A]/60 px-5 md:px-10 py-10 md:py-12 font-body text-[#111827]">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <a
                href="#section-hero"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('section-hero');
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
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold"
            >
              <button
                type="button"
                onClick={() => scrollToSection('section-hero')}
                className="text-[#111827]/80 hover:text-[#755809] transition-colors"
              >
                {isTh ? 'หน้าแรก' : 'Home'}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-career')}
                className="text-[#111827]/80 hover:text-[#755809] transition-colors"
              >
                {isTh ? 'อาชีพความงาม' : 'Career'}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-partners')}
                className="text-[#111827]/80 hover:text-[#755809] transition-colors"
              >
                {isTh ? 'พันธมิตรธุรกิจ' : 'Business Partner'}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('section-inquiry')}
                className="text-[#111827]/80 hover:text-[#755809] transition-colors"
              >
                {isTh ? 'ส่งข้อมูลติดต่อ' : 'Submit Inquiry'}
              </button>
              <button
                type="button"
                onClick={() => openContact('Influencer')}
                className="text-[#111827]/80 hover:text-[#755809] transition-colors"
              >
                {isTh ? 'อินฟลูเอนเซอร์' : 'Influencer'}
              </button>
              <button
                type="button"
                onClick={() => setChatbotOpen(true)}
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
                onClick={() => openContact('Free Consultation')}
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

      {/* CONVERSION FLOW CONTACT MODAL */}
      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        lang={lang}
        initialInterest={contactInterest}
        user={user}
        accessToken={accessToken}
        linkedSpreadsheetId={linkedSheet.id}
        onSheetLinked={(id, url) => setLinkedSheet({ id, url })}
      />

      {/* GEMINI STREAMING CHATBOT + MEMORY + PRIVATE GOOGLE DOCS RAG */}
      <ChatbotDrawer
        open={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        lang={lang}
        user={user}
        accessToken={accessToken}
        onSignIn={handleGoogleSignIn}
        onOpenContact={(interest) => openContact(interest)}
      />
    </div>
  );
}
