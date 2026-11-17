import React, { useRef, useState } from 'react';
import heroEditorialImg from '../assets/images/beauty_services_hero_1794846020685.jpg';
import lifestyleEditorialImg from '../assets/images/beauty_services_lifestyle_1794846021350.jpg';
import {
  LINE_OA_BEAUTY_SERVICES_URL,
  SIGNATURE_BEAUTY_SERVICES,
} from '../config/beautyServices';
import { Language, resolveBeautyServicesContactUrl } from '../utils/logic';

interface BeautyServicesPageProps {
  lang: Language;
  onOpenInquiry: (interest?: string, initialNotes?: string) => void;
}

interface WhyTymeCard {
  num: string;
  title: string;
  thaiTitle: string;
  description: string;
  emphasis?: boolean;
}

interface JourneyStep {
  step: string;
  title: string;
  thaiTitle: string;
  description: string;
}

interface PromiseItem {
  title: string;
  description: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const WHY_TYME_CARDS: WhyTymeCard[] = [
  {
    num: '01',
    title: 'Beauty Everywhere',
    thaiTitle: 'ความงามที่เข้ากับชีวิตคุณ',
    description:
      'เปิดโอกาสให้คุณสอบถามบริการและพื้นที่ให้บริการที่สะดวก โดยทีมงานช่วยประสานรายละเอียดการนัดหมาย',
  },
  {
    num: '02',
    title: 'Smart Beauty Experience',
    thaiTitle: 'เทคโนโลยีเพื่อประสบการณ์การดูแลผิว',
    description:
      'ค้นพบรูปแบบการดูแลผิวหน้าที่นำอุปกรณ์ AI X FACE มาเป็นส่วนหนึ่งของประสบการณ์ความงาม',
    emphasis: true,
  },
  {
    num: '03',
    title: 'Care & Connection',
    thaiTitle: 'ความใส่ใจในทุกขั้นตอน',
    description:
      'รับข้อมูลบริการและคำแนะนำเบื้องต้นจากทีมงาน เพื่อช่วยให้คุณตัดสินใจก่อนนัดหมายได้อย่างมั่นใจ',
  },
];

const JOURNEY_STEPS: JourneyStep[] = [
  {
    step: 'STEP 01',
    title: 'Discover',
    thaiTitle: 'เลือกบริการที่สนใจ',
    description: 'สำรวจบริการความงามที่คุณต้องการ',
  },
  {
    step: 'STEP 02',
    title: 'Connect',
    thaiTitle: 'ติดต่อทีม TYME',
    description: 'แจ้งบริการ พื้นที่ และวันเวลาที่สะดวกผ่าน LINE OA',
  },
  {
    step: 'STEP 03',
    title: 'Confirm',
    thaiTitle: 'ยืนยันรายละเอียด',
    description: 'ทีมงานตรวจสอบบริการ วันเวลา สถานที่ และค่าใช้จ่ายก่อนยืนยันนัดหมาย',
  },
  {
    step: 'STEP 04',
    title: 'Enjoy Your TYME',
    thaiTitle: 'ใช้เวลาดูแลตัวเอง',
    description: 'รับบริการตามรายละเอียดที่ยืนยันไว้',
  },
];

const PROMISE_ITEMS: PromiseItem[] = [
  {
    title: 'Clear Information',
    description: 'แจ้งรายละเอียดบริการและค่าใช้จ่ายก่อนยืนยันนัดหมาย',
  },
  {
    title: 'Thoughtful Care',
    description: 'เปิดโอกาสให้ลูกค้าแจ้งข้อกังวลและข้อมูลที่เกี่ยวข้องกับการรับบริการ',
  },
  {
    title: 'Personal Experience',
    description: 'ช่วยประสานบริการให้สอดคล้องกับความต้องการและความพร้อมของผู้ให้บริการ',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-how-to-book',
    question: 'สนใจรับบริการต้องทำอย่างไร?',
    answer:
      'สามารถติดต่อผ่าน LINE OA ของ TYME of Beauty เพื่อสอบถามรายละเอียดและให้ทีมงานช่วยประสานการนัดหมาย',
  },
  {
    id: 'faq-outcall',
    question: 'สามารถรับบริการนอกสถานที่ได้หรือไม่?',
    answer:
      'สามารถสอบถามบริการนอกสถานที่ได้ โดยขึ้นอยู่กับพื้นที่ให้บริการและความพร้อมของทีมงานในวันเวลาที่ต้องการ',
  },
  {
    id: 'faq-pricing',
    question: 'ค่าบริการเท่าไร?',
    answer:
      'ทีมงานจะแจ้งราคาของบริการที่สนใจ รวมถึงค่าใช้จ่ายและเงื่อนไขที่เกี่ยวข้องก่อนยืนยันการนัดหมาย',
  },
  {
    id: 'faq-sensitive-skin',
    question: 'หากมีผิวแพ้ง่ายหรือข้อกังวลเกี่ยวกับผิว สามารถรับบริการได้หรือไม่?',
    answer:
      'กรุณาแจ้งข้อมูลที่เกี่ยวข้องกับผิว การแพ้ และข้อควรระวังก่อนนัดหมาย เพื่อประเมินความเหมาะสมเบื้องต้น หากมีโรคผิวหนังหรือปัญหาทางการแพทย์ ควรปรึกษาบุคลากรทางการแพทย์ก่อนรับบริการ',
  },
  {
    id: 'faq-advance-booking',
    question: 'จำเป็นต้องนัดหมายล่วงหน้าหรือไม่?',
    answer:
      'แนะนำให้ติดต่อล่วงหน้า เพื่อให้ทีมงานตรวจสอบความพร้อมของบริการและยืนยันรายละเอียดได้ก่อนถึงวันนัดหมาย',
  },
];

const EditorialPhoto: React.FC<{
  src: string;
  alt: string;
  lazy?: boolean;
  className?: string;
}> = ({ src, alt, lazy = false, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-[#F4F6FC] via-[#EAEFFB] to-[#EEDC9A]/45 flex items-center justify-center p-6 text-center ${className}`}
      >
        <span className="font-headline text-lg font-semibold text-[#111827]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

const AiXFaceVisualSlot: React.FC<{
  imageUrl: string | null;
  alt: string;
  serviceName: string;
}> = ({ imageUrl, alt, serviceName }) => {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <EditorialPhoto
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
      />
    );
  }

  // Clearly replaceable architectural showcase slot when official AI X FACE photography is pending
  return (
    <div
      data-slot="ai-x-face-visual-placeholder"
      role="img"
      aria-label={`${serviceName} — พื้นที่สำหรับภาพอุปกรณ์ AI X FACE อย่างเป็นทางการ`}
      className="w-full h-full min-h-[340px] md:min-h-[420px] bg-gradient-to-br from-[#FDFDFD] via-[#F4F6FC] to-[#EAEFFB] p-6 md:p-10 flex flex-col justify-between relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#EEDC9A]/25 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#C59B27]/10 blur-3xl pointer-events-none"
      />

      <div className="relative z-10 flex items-center justify-between border-b border-[#D4AF37]/30 pb-4">
        <span className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-[#755809]">
          TYME OF BEAUTY · BEAUTY EVERYWHERE
        </span>
        <span className="font-body text-xs font-medium text-[#111827]/60">
          AI X FACE
        </span>
      </div>

      <div className="relative z-10 my-6 border border-dashed border-[#C59B27]/55 rounded-2xl bg-white/80 backdrop-blur-sm p-6 md:p-8 flex flex-col items-center text-center gap-3">
        <div
          aria-hidden="true"
          className="w-16 h-16 rounded-full border border-[#D4AF37]/50 bg-[#F4F6FC] flex items-center justify-center text-[#755809]"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect
              x="4"
              y="3"
              width="16"
              height="18"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8.5 17h7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="font-headline text-2xl md:text-3xl font-bold text-[#111827] tracking-tight">
          {serviceName}
        </p>
        <p className="font-body text-xs md:text-sm text-[#111827]/70 max-w-sm leading-relaxed">
          พื้นที่สำหรับภาพอุปกรณ์ AI X FACE อย่างเป็นทางการจากแบรนด์ TYME of Beauty
          <br />
          สามารถสอบถามรายละเอียดบริการและขั้นตอนได้จากทีมบริการลูกค้า
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-2 text-xs text-[#755809] font-medium">
        <span>Facial Care Experience</span>
        <span>Official Product Asset Slot</span>
      </div>
    </div>
  );
};

export const BeautyServicesPage: React.FC<BeautyServicesPageProps> = ({
  onOpenInquiry,
}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const faqButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const verifiedLineUrl = resolveBeautyServicesContactUrl(LINE_OA_BEAUTY_SERVICES_URL);

  const handleScrollToSignature = () => {
    const el = document.getElementById('signature-service');
    if (!el) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const handleFaqKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const total = FAQ_ITEMS.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      faqButtonRefs.current[(idx + 1) % total]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      faqButtonRefs.current[(idx - 1 + total) % total]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      faqButtonRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      faqButtonRefs.current[total - 1]?.focus();
    }
  };

  const handleCustomerChannelClick = (topicNote: string) => {
    onOpenInquiry('Beauty Services', topicNote);
  };

  return (
    <div className="bg-white text-[#111827] font-body">
      {/* SECTION 01 — HERO SECTION */}
      <section
        id="beauty-hero"
        className="w-full pt-[84px] md:pt-[100px] px-3 md:px-5 pb-6 md:pb-8 bg-white"
      >
        <div className="relative w-full min-h-[540px] md:min-h-[620px] rounded-xl md:rounded-2xl overflow-hidden border border-[#EEDC9A]/50 shadow-sm flex items-end">
          <EditorialPhoto
            src={heroEditorialImg}
            alt="TYME of Beauty — Beauty Services everyday luxury facial skincare moment"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-[#111827]/55 to-[#111827]/25"
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-10 md:px-12 md:py-14">
            <div className="max-w-2xl">
              <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#EEDC9A] mb-3">
                TYME OF BEAUTY | BEAUTY SERVICES
              </p>

              <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.04] tracking-tight text-balance">
                YOUR BEAUTY. EVERYWHERE.
              </h1>

              <p className="font-headline text-xl md:text-2xl font-semibold text-[#EEDC9A] mt-4">
                ดูแลความงามได้สะดวก ในทุกช่วงเวลาของชีวิต
              </p>

              <div className="font-body text-sm md:text-base text-white/90 leading-relaxed mt-4 space-y-2 max-w-xl">
                <p>เพราะการดูแลตัวเองไม่ควรถูกจำกัดด้วยสถานที่หรือเวลา</p>
                <p>
                  ค้นพบประสบการณ์ความงามจาก TYME of Beauty ที่ผสานเทคโนโลยี AI X FACE เข้ากับความใส่ใจ เพื่อให้การดูแลตัวเองเป็นเรื่องง่าย สะดวก และเข้ากับไลฟ์สไตล์ของคุณ
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={handleScrollToSignature}
                  className="px-6 py-3.5 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-sm md:text-base font-semibold transition-colors shadow-lg border border-[#EEDC9A]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EEDC9A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] whitespace-nowrap cursor-pointer"
                >
                  สำรวจบริการของเรา
                </button>

                {verifiedLineUrl ? (
                  <a
                    href={verifiedLineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-lg bg-white/95 hover:bg-white text-[#111827] text-sm md:text-base font-semibold transition-colors border border-[#EEDC9A]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EEDC9A] whitespace-nowrap"
                  >
                    สอบถามและนัดหมาย
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCustomerChannelClick('สอบถามและนัดหมาย Beauty Services')}
                    className="px-6 py-3.5 rounded-lg bg-white/95 hover:bg-white text-[#111827] text-sm md:text-base font-semibold transition-colors border border-[#EEDC9A]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EEDC9A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] whitespace-nowrap cursor-pointer"
                  >
                    สอบถามและนัดหมาย
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02 — WHY TYME OF BEAUTY */}
      <section
        id="why-tyme"
        className="w-full px-5 md:px-10 py-16 md:py-24 bg-[#FDFDFD] border-t border-[#EEDC9A]/50"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12 md:mb-14">
            <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
              WHY TYME
            </p>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.1] tracking-tight text-balance">
              BEAUTY EVERYWHERE, MADE FOR YOU
            </h2>
            <p className="font-headline text-xl md:text-2xl font-semibold text-[#755809] mt-3">
              เพราะทุกคนควรเข้าถึงการดูแลความงามได้ง่ายขึ้น
            </p>
            <p className="font-body text-sm md:text-base text-[#111827]/75 leading-relaxed mt-4">
              TYME of Beauty เชื่อว่าการดูแลตัวเองควรเข้ากับชีวิตประจำวัน ไม่ว่าจะเป็นเรื่องของเวลา ความสะดวก หรือการเข้าถึงบริการที่ตรงกับความต้องการ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WHY_TYME_CARDS.map((card) => (
              <article
                key={card.num}
                className={`rounded-2xl p-7 md:p-8 border flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 ${
                  card.emphasis
                    ? 'bg-[#EAEFFB] border-[#C59B27]/50 shadow-sm'
                    : 'bg-[#F4F6FC] border-[#D4AF37]/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[#D4AF37]/25">
                    <span className="font-headline text-lg font-bold text-[#111827]">
                      {card.title}
                    </span>
                    <span className="font-body text-xs font-semibold tabular-nums text-[#755809]">
                      {card.num}
                    </span>
                  </div>
                  <h3 className="font-headline text-xl md:text-2xl font-bold text-[#111827] mb-3 leading-snug">
                    {card.thaiTitle}
                  </h3>
                  <p className="font-body text-sm md:text-base text-[#111827]/75 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 03 — SIGNATURE BEAUTY SERVICE */}
      <section
        id="signature-service"
        className="w-full px-5 md:px-10 py-16 md:py-24 scroll-mt-20 bg-white border-t border-[#EEDC9A]/50"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          {SIGNATURE_BEAUTY_SERVICES.map((service) => (
            <div
              key={service.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-stretch"
            >
              {/* Product / Service Visual Area */}
              <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#D4AF37]/35 shadow-sm">
                <AiXFaceVisualSlot
                  imageUrl={service.imageUrl}
                  alt={service.imageAlt}
                  serviceName={service.name}
                />
              </div>

              {/* Service Editorial Details */}
              <div className="lg:col-span-6 rounded-2xl bg-[#F4F6FC] border border-[#D4AF37]/30 p-7 md:p-10 flex flex-col justify-between">
                <div>
                  <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
                    {service.sectionLabel}
                  </p>
                  <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.08] tracking-tight">
                    {service.heading}
                  </h2>
                  <p className="font-headline text-xl md:text-2xl font-semibold text-[#755809] mt-3">
                    {service.secondaryHeading}
                  </p>

                  <div className="mt-6 pt-6 border-t border-[#D4AF37]/25 space-y-4">
                    <h3 className="font-headline text-2xl font-bold text-[#111827]">
                      {service.name}
                    </h3>
                    {service.descriptionParagraphs.map((paragraph, pIdx) => (
                      <p
                        key={pIdx}
                        className="font-body text-sm md:text-base text-[#111827]/80 leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#D4AF37]/25 flex flex-wrap items-center gap-4">
                  {verifiedLineUrl ? (
                    <a
                      href={verifiedLineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-7 py-3.5 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-sm md:text-base font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27]"
                    >
                      {service.ctaLabel}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCustomerChannelClick(service.inquiryTopic)}
                      className="px-7 py-3.5 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-sm md:text-base font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2 cursor-pointer"
                    >
                      {service.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 04 — BEAUTY THAT FITS YOUR LIFE */}
      <section className="w-full px-5 md:px-10 py-16 md:py-24 bg-[#FDFDFD] border-t border-[#EEDC9A]/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-stretch">
          <div className="lg:col-span-6 lg:order-2 rounded-2xl overflow-hidden border border-[#D4AF37]/30 shadow-sm min-h-[300px]">
            <EditorialPhoto
              src={lifestyleEditorialImg}
              alt="Everyday modern skincare space bathed in soft warm daylight"
              lazy
              className="w-full h-full object-cover"
            />
          </div>

          <div className="lg:col-span-6 lg:order-1 flex flex-col justify-center py-2 md:py-6">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.1] tracking-tight text-balance">
              BEAUTY THAT FITS YOUR LIFE
            </h2>
            <p className="font-headline text-xl md:text-2xl font-semibold text-[#755809] mt-3">
              ดูแลตัวเองในรูปแบบที่เข้ากับคุณ
            </p>
            <div className="font-body text-sm md:text-base text-[#111827]/80 leading-relaxed mt-6 space-y-4 max-w-xl">
              <p>
                ไม่ว่าคุณจะมีตารางชีวิตที่ยุ่งแค่ไหน หรืออยากจัดสรรช่วงเวลาให้ตัวเอง TYME ต้องการทำให้การเข้าถึงบริการความงามเป็นเรื่องง่ายขึ้น
              </p>
              <p>
                เพียงแจ้งพื้นที่ วันเวลาที่สะดวก และบริการที่สนใจ ทีมงานจะช่วยตรวจสอบความพร้อมของผู้ให้บริการ พร้อมแจ้งรายละเอียดก่อนยืนยันนัดหมาย
              </p>
            </div>

            <div className="mt-8">
              {verifiedLineUrl ? (
                <a
                  href={verifiedLineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#111827] hover:bg-[#755809] text-white text-sm md:text-base font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27]"
                >
                  สอบถามพื้นที่ให้บริการ
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCustomerChannelClick('สอบถามพื้นที่ให้บริการ Beauty Services')}
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#111827] hover:bg-[#755809] text-white text-sm md:text-base font-semibold transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2 cursor-pointer"
                >
                  สอบถามพื้นที่ให้บริการ
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05 — HOW IT WORKS */}
      <section className="w-full px-5 md:px-10 py-16 md:py-24 bg-[#F4F6FC] border-t border-[#EEDC9A]/50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-12">
            <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
              YOUR BEAUTY JOURNEY
            </p>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.12] tracking-tight">
              เริ่มต้นการดูแลตัวเองได้ง่าย ๆ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {JOURNEY_STEPS.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl bg-white border border-[#D4AF37]/30 p-6 md:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-[#E2E8F0]">
                    <span className="font-body text-xs font-bold uppercase tracking-wider text-[#755809] tabular-nums">
                      {item.step}
                    </span>
                    <span className="font-headline text-sm font-semibold text-[#111827]/70">
                      {item.title}
                    </span>
                  </div>
                  <h3 className="font-headline text-xl font-bold text-[#111827] mb-2.5">
                    {item.thaiTitle}
                  </h3>
                  <p className="font-body text-sm text-[#111827]/75 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 06 — OUR PROMISE */}
      <section className="w-full px-5 md:px-10 py-16 md:py-24 bg-white border-t border-[#EEDC9A]/50">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-12">
            <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
              CARE IN EVERY DETAIL
            </p>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.12] tracking-tight">
              ความใส่ใจเริ่มตั้งแต่ก่อนรับบริการ
            </h2>
            <p className="font-body text-sm md:text-base text-[#111827]/75 leading-relaxed mt-4">
              เราเชื่อว่าประสบการณ์ความงามที่ดีเริ่มต้นจากการสื่อสารที่ชัดเจน ความเข้าใจในความต้องการ และการให้ข้อมูลอย่างเหมาะสม
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[#D4AF37]/35">
            {PROMISE_ITEMS.map((item, idx) => (
              <div
                key={item.title}
                className={`py-7 md:py-9 md:px-6 ${
                  idx === 0 ? 'md:pl-0' : ''
                } ${idx < PROMISE_ITEMS.length - 1 ? 'border-b md:border-b-0 md:border-r border-[#D4AF37]/25' : ''}`}
              >
                <h3 className="font-headline text-2xl font-bold text-[#111827] mb-3">
                  {item.title}
                </h3>
                <p className="font-body text-sm md:text-base text-[#111827]/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 07 — FREQUENTLY ASKED QUESTIONS */}
      <section
        id="beauty-faq"
        className="w-full px-5 md:px-10 py-16 md:py-24 bg-[#FDFDFD] border-t border-[#EEDC9A]/50"
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 md:mb-12">
            <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
              GOOD TO KNOW
            </p>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#111827] leading-[1.1] tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="divide-y divide-[#D4AF37]/30 border-t border-b border-[#D4AF37]/30">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              const panelId = `${item.id}-panel`;
              const buttonId = `${item.id}-trigger`;
              return (
                <div key={item.id}>
                  <h3>
                    <button
                      ref={(el) => {
                        faqButtonRefs.current[idx] = el;
                      }}
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      onKeyDown={(e) => handleFaqKeyDown(e, idx)}
                      className="w-full py-5 md:py-6 flex items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2 rounded-lg cursor-pointer"
                    >
                      <span className="font-headline text-lg md:text-xl font-bold text-[#111827] leading-snug">
                        {item.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isOpen
                            ? 'bg-[#755809] border-[#755809] text-white'
                            : 'border-[#8A795D]/50 text-[#111827] bg-white'
                        }`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className={`transition-transform duration-200 ${
                            isOpen ? 'rotate-45' : ''
                          }`}
                        >
                          <path
                            d="M7 2v10M2 7h10"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="pb-6 pr-2 md:pr-12"
                  >
                    <p className="font-body text-sm md:text-base text-[#111827]/80 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 08 — FINAL CALL TO ACTION */}
      <section className="w-full px-5 md:px-10 py-16 md:py-24 bg-[#EAEFFB] border-t border-[#D4AF37]/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-body text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#755809] mb-3">
            TYME OF BEAUTY
          </p>
          <h2 className="font-headline text-3xl sm:text-4xl md:text-6xl font-bold text-[#111827] leading-[1.08] tracking-tight text-balance">
            YOUR BEAUTY MOMENT STARTS HERE
          </h2>
          <p className="font-headline text-xl md:text-2xl font-semibold text-[#755809] mt-3">
            ให้ทุกช่วงเวลาของคุณ เป็นช่วงเวลาที่สวยงาม
          </p>

          <div className="font-body text-sm md:text-base text-[#111827]/80 leading-relaxed mt-5 space-y-1.5 max-w-xl mx-auto">
            <p>เริ่มต้นดูแลตัวเองในแบบที่คุณต้องการ</p>
            <p>ให้ทีม TYME of Beauty ช่วยแนะนำบริการและประสานการนัดหมายที่เหมาะกับคุณ</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {verifiedLineUrl ? (
              <a
                href={verifiedLineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-sm md:text-base font-semibold transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2"
              >
                ติดต่อ Beauty Services ผ่าน LINE OA
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleCustomerChannelClick('ติดต่อ Beauty Services (LINE OA3 / Client Service)')
                  }
                  className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-[#755809] hover:bg-[#5E4606] text-white text-sm md:text-base font-semibold transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C59B27] focus-visible:ring-offset-2 cursor-pointer"
                >
                  ติดต่อ Beauty Services ผ่าน LINE OA
                </button>
                <p className="font-body text-xs text-[#111827]/70 max-w-md">
                  ลิงก์ LINE OA สำหรับบริการลูกค้าอยู่ระหว่างรอการยืนยันอย่างเป็นทางการ — สามารถส่งคำขอและสอบถามรายละเอียดผ่านแบบฟอร์มบริการลูกค้าได้ทันที
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
