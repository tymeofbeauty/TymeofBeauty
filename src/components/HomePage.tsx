import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  computeMaskedCardBackground,
  Language,
  MaskPosition,
} from '../utils/logic';
import { PartnerInquirySection } from './PartnerInquirySection';
import { PathwayShowcaseSection } from './PathwayShowcaseSection';

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
  { name: 'Healthy\nProducts', nameTh: 'ผลิตภัณฑ์\nสุขภาพ', num: '04', active: false, interest: 'Beauty Products' },
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

interface HomePageProps {
  lang: Language;
  user: User | null;
  accessToken: string | null;
  linkedSpreadsheetId?: string;
  onSheetLinked: (spreadsheetId: string, spreadsheetUrl: string) => void;
  onOpenContact: (interest?: string) => void;
  onScrollToSection: (id: string) => void;
  onNavigateBeautyServices: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  lang,
  user,
  accessToken,
  linkedSpreadsheetId,
  onSheetLinked,
  onOpenContact,
  onScrollToSection,
  onNavigateBeautyServices,
}) => {
  const [activeServiceIdx, setActiveServiceIdx] = useState<number>(0);

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

  return (
    <>
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
                    onOpenContact('Influencer');
                  } else {
                    onScrollToSection(targetSection);
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
            onClick={() => onOpenContact('Free Consultation')}
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
              onClick={() => onOpenContact('Professional Career')}
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
            <div className="relative md:absolute md:inset-0 z-10 flex flex-wrap md:flex-nowrap gap-2 md:gap-2.5 p-2.5 md:p-4 h-full md:h-[220px]">
              {services.map((svc, idx) => {
                const isActive = idx === activeServiceIdx;
                return (
                  <button
                    key={svc.name}
                    type="button"
                    onClick={() => {
                      setActiveServiceIdx(idx);
                      if (svc.interest === 'Beauty Services') {
                        onNavigateBeautyServices();
                      }
                    }}
                    onDoubleClick={() => {
                      if (svc.interest !== 'Beauty Services') {
                        onOpenContact(svc.interest);
                      }
                    }}
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
                onClick={() => onOpenContact('Free Consultation')}
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
                onClick={() => onOpenContact('Business Partner')}
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
                onClick={() => onOpenContact('Influencer')}
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
      <PathwayShowcaseSection lang={lang} onOpenContact={onOpenContact} />

      {/* SECTION 4 - FOOTER / BUSINESS PARTNER INQUIRY */}
      <PartnerInquirySection
        lang={lang}
        user={user}
        accessToken={accessToken}
        linkedSpreadsheetId={linkedSpreadsheetId}
        onSheetLinked={onSheetLinked}
        onBookOnline={() => onOpenContact('Business Partner')}
      />
    </>
  );
};
