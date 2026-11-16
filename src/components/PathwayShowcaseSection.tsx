import React, { useState } from 'react';
import { Language } from '../utils/logic';

const CAREER_CARD_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_en3tf2en3tf2en3t.jpg';

const PARTNER_CARD_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_cwlt24cwlt24cwlt.jpg?updatedAt=1794729979213&w=1280&q=85';

const INFLUENCER_CARD_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_w7llp1w7llp1w7ll.jpg?updatedAt=1794730635515&w=1280&q=85';

const GROW_CAREER_IMAGE =
  'https://ik.imagekit.io/tymeofbeauty/Gemini_Generated_Image_avr76kavr76kavr7.jpg?updatedAt=1794730366774';

interface PathwayShowcaseSectionProps {
  lang: Language;
  onOpenContact: (interest?: string) => void;
}

const ShowcaseImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-gradient-to-br from-[#2B1F11] via-[#4A3419] to-[#111827] ${className}`}
      />
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

export const PathwayShowcaseSection: React.FC<PathwayShowcaseSectionProps> = ({
  lang,
  onOpenContact,
}) => {
  const isTh = lang === 'th';

  const pathwayCards = [
    {
      id: 'career',
      image: CAREER_CARD_IMAGE,
      title: isTh ? 'สายอาชีพความงาม' : 'About Career',
      tag: isTh ? 'Career' : 'Career',
      quote: isTh ? '"ยินดีต้อนรับสู่ทีมของเรา"' : '"Welcome to our team"',
      description: isTh
        ? 'ขยายการให้บริการครอบคลุมทั่วประเทศไทย เราพร้อมเปลี่ยนชีวิตคุณให้ดียิ่งขึ้น'
        : 'Entire Thailand coverage required, We’re ready to change your life better.',
      interest: 'Professional Career',
      overlayClass:
        'bg-gradient-to-tr from-[#2E1807]/92 via-[#6D3B14]/70 to-[#111827]/70',
      paperOffset: 'translate-y-3 translate-x-2',
      containerOffset: '',
      borderClass: 'border-[#C59B27]/30',
    },
    {
      id: 'partner',
      image: PARTNER_CARD_IMAGE,
      title: isTh ? 'พันธมิตรธุรกิจ' : 'Business Partner',
      tag: isTh ? 'Partner' : 'Partner',
      quote: isTh
        ? '"คอมมูนิตี้ของเราแข็งแกร่งขึ้นทุกวัน"'
        : '"Our community getting stronger everyday"',
      description: isTh
        ? 'หากคุณเป็นผู้ให้บริการความงามและสุขภาพอยู่แล้ว เรายินดีต้อนรับคุณมาร่วมเติบโตไปด้วยกัน'
        : 'If you are an existing service provider, you’re very welcomed to join us.',
      interest: 'Business Partner',
      overlayClass:
        'bg-gradient-to-br from-[#755809]/90 via-[#9E6B16]/72 to-[#2E1807]/82',
      paperOffset: 'translate-y-4 -translate-x-2',
      containerOffset: 'mt-0 md:-mt-10',
      borderClass: 'border-[#D4AF37]/40',
    },
    {
      id: 'influencer',
      image: INFLUENCER_CARD_IMAGE,
      title: isTh ? 'อินฟลูเอนเซอร์' : 'About Influencer',
      tag: isTh ? 'Influencer' : 'Influencer',
      quote: isTh
        ? '"สร้างรายได้เสริมจากการโปรโมต"'
        : '"Extra income made by advertisement"',
      description: isTh
        ? 'สร้างรายได้ไร้ขีดจำกัดได้ง่ายๆ จากที่บ้านหรือสถานที่ของคุณเอง'
        : 'Unlimited earnings by simply working at your place.',
      interest: 'Influencer',
      overlayClass:
        'bg-gradient-to-bl from-[#111827]/88 via-[#4A2810]/72 to-[#1E140B]/85',
      paperOffset: 'translate-y-3 translate-x-2',
      containerOffset: '',
      borderClass: 'border-[#C59B27]/30',
    },
  ];

  const coreServices = [
    { label: 'Skill Sync', labelTh: 'พัฒนาทักษะเฉพาะทาง', interest: 'Professional Career' },
    { label: 'Pro Profile', labelTh: 'โปรไฟล์มืออาชีพ', interest: 'Beauty Services' },
    { label: 'Network Plus', labelTh: 'เครือข่ายพันธมิตร', interest: 'Business Partner' },
    { label: 'Growth Map', labelTh: 'วางแผนเส้นทางเติบโต', interest: 'Professional Career' },
  ];

  return (
    <>
      {/* SECTION: SUCCESSFUL PATHWAY ON YOUR OWN */}
      <section
        id="section-pathway"
        className="w-full bg-[#FDFDFD] px-5 md:px-10 pt-24 md:pt-28 pb-20 md:pb-24 scroll-mt-16 border-t border-[#EEDC9A]/50 flex flex-col items-center justify-center relative"
      >
        <div className="max-w-7xl w-full mx-auto flex flex-col items-center">
          <h2 className="font-headline text-4xl sm:text-5xl md:text-7xl font-semibold mb-6 text-center text-[#111827] leading-[1.08]">
            {isTh ? (
              <>
                เส้นทางความสำเร็จ
                <br />
                <span className="bg-gradient-to-r from-[#755809] via-[#C59B27] to-[#8F6B10] bg-clip-text text-transparent">
                  ในแบบของคุณเอง
                </span>
              </>
            ) : (
              <>
                Successful Pathway
                <br />
                <span className="bg-gradient-to-r from-[#755809] via-[#C59B27] to-[#8F6B10] bg-clip-text text-transparent">
                  on Your Own
                </span>
              </>
            )}
          </h2>

          <p className="font-body text-center max-w-2xl mx-auto mb-14 md:mb-16 text-[#111827]/75 font-light text-base md:text-lg leading-relaxed">
            {isTh
              ? 'เรามั่นใจว่าศักยภาพของเราจะสร้างชุมชนความงามและสุขภาพที่ดีพร้อมระบบนิเวศที่ยั่งยืน คุณสามารถร่วมเป็นส่วนหนึ่งกับเราได้ทันที'
              : 'We ensure that our capability would generate the beauty and healthy communities and its ecosystem. You can join us as one of them.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {pathwayCards.map((card) => (
              <div
                key={card.id}
                className={`group relative h-[430px] md:h-[450px] ${card.containerOffset} isolate`}
              >
                {/* Offset paper layer */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 bg-white rounded-3xl border border-[#EEDC9A] ${card.paperOffset} -z-10 shadow-sm transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:rotate-2 group-hover:scale-[1.02]`}
                />

                {/* Foreground card */}
                <button
                  type="button"
                  onClick={() => onOpenContact(card.interest)}
                  className={`w-full h-full text-left rounded-3xl overflow-hidden relative shadow-xl flex items-end p-8 border ${card.borderClass} transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_25px_50px_-12px_rgba(197,155,39,0.3)] cursor-pointer`}
                >
                  <ShowcaseImage
                    src={card.image}
                    alt={card.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className={`absolute inset-0 ${card.overlayClass}`}
                  />

                  <div className="relative z-10 w-full text-white">
                    <div className="flex justify-between items-start gap-3 mb-5">
                      <h3 className="font-headline text-2xl md:text-3xl font-bold leading-tight">
                        {card.title}
                      </h3>
                      <span className="font-body shrink-0 text-[10px] font-bold uppercase tracking-widest border border-white/50 bg-[#111827]/30 backdrop-blur-sm px-3 py-1.5 rounded-md">
                        {card.tag}
                      </span>
                    </div>
                    <hr className="border-white/25 my-4" />
                    <p className="font-body text-sm font-light leading-relaxed text-white/95">
                      <span className="font-medium text-[#EEDC9A]">{card.quote}</span>
                      <br />
                      {card.description}
                    </p>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenContact('Business Partner')}
            className="font-body mt-12 md:mt-16 px-8 py-3.5 bg-white border border-[#D4AF37]/60 text-[#111827] rounded-full text-sm font-semibold hover:border-[#755809] hover:text-[#755809] hover:-translate-y-1 hover:shadow-[0_18px_36px_-12px_rgba(197,155,39,0.28)] transition-all duration-300 shadow-sm cursor-pointer"
          >
            {isTh ? 'ดูข้อมูลเพิ่มเติม' : 'View more information'}
          </button>
        </div>
      </section>

      {/* SECTION: GROW WITH TYME OF BEAUTY */}
      <section
        id="section-grow"
        className="w-full pt-24 md:pt-28 pb-20 md:pb-24 scroll-mt-16 px-5 md:px-10 bg-[#FDFDFD] border-t border-[#EEDC9A]/50 relative"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-12 md:mb-16 text-center text-[#111827]">
            {isTh ? 'เติบโตไปพร้อมกับ Tyme of Beauty' : 'Grow with Tyme of Beauty'}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Hero Card */}
            <div className="group rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-[#C59B27]/35 relative overflow-hidden flex flex-col justify-between min-h-[380px] md:min-h-[420px] shadow-lg transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(197,155,39,0.28)]">
              <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105">
                <ShowcaseImage
                  src={GROW_CAREER_IMAGE}
                  alt="TYME Career Development"
                  className="w-full h-full object-cover -scale-x-100"
                />
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-b from-[#111827]/70 via-[#111827]/55 to-[#111827]/80"
              />

              <div className="relative z-10 text-white flex flex-col h-full justify-between">
                <div>
                  <span className="font-body text-xs uppercase tracking-widest text-[#EEDC9A] font-bold mb-3 block">
                    {isTh ? 'โอกาสเติบโต' : 'Opportunities'}
                  </span>
                  <h3 className="font-headline text-3xl md:text-4xl font-bold mb-4 leading-tight text-white">
                    {isTh ? (
                      <>
                        พัฒนาสายอาชีพ
                        <br />
                        กับ TYME
                      </>
                    ) : (
                      <>
                        TYME Career
                        <br />
                        Development
                      </>
                    )}
                  </h3>
                </div>
                <p className="font-body text-white/90 font-light border-t border-white/25 pt-6 mt-6 text-sm md:text-base leading-relaxed">
                  {isTh
                    ? 'ยกระดับเส้นทางอาชีพและปลดล็อกศักยภาพของคุณไปพร้อมกับระบบนิเวศความงามครบวงจร'
                    : 'Transform your professional journey and unlock your potential with our ecosystem.'}
                </p>
              </div>
            </div>

            {/* Right Grid (Sub-cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sub Card 1 */}
              <button
                type="button"
                onClick={() => onOpenContact('Career Makeover')}
                className="rounded-3xl p-8 bg-[#F4F6FC] border border-[#D4AF37]/40 flex flex-col justify-center text-center transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-12px_rgba(197,155,39,0.25)] hover:border-[#C59B27] cursor-pointer"
              >
                <h4 className="font-headline text-2xl font-bold mb-2 text-[#111827]">
                  {isTh ? 'ออกแบบเส้นทางอาชีพ' : 'Career Makeover'}
                </h4>
                <p className="font-body text-sm text-[#111827]/70">
                  {isTh
                    ? 'โครงสร้างที่ออกแบบเฉพาะเพื่อการเติบโต'
                    : 'Tailored structure for growth'}
                </p>
              </button>

              {/* Sub Card 2 */}
              <button
                type="button"
                onClick={() => onOpenContact('Professional Career')}
                className="rounded-3xl p-8 bg-[#755809] hover:bg-[#5E4606] text-white border border-[#C59B27] flex flex-col justify-center text-center transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-lg shadow-[#C59B27]/20 hover:shadow-[0_20px_40px_-12px_rgba(117,88,9,0.4)] cursor-pointer"
              >
                <h4 className="font-headline text-2xl font-bold mb-2 text-white">
                  {isTh ? 'ติดต่อทีมงาน' : 'Contact Us'}
                </h4>
                <p className="font-body text-sm text-white/90">
                  {isTh ? 'พูดคุยกับทีมฝ่ายบุคคลของเรา' : 'Connect with our HR team'}
                </p>
              </button>

              {/* 4-Service sub-card panel */}
              <div className="rounded-3xl p-6 bg-[#111827] text-white col-span-1 sm:col-span-2 border border-[#D4AF37]/25 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_rgba(197,155,39,0.22)]">
                <h4 className="font-headline text-xl font-bold mb-4 border-b border-white/15 pb-4 text-white">
                  {isTh ? '4 บริการหลักของเรา' : 'Our 4 Core Services'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {coreServices.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onOpenContact(item.interest)}
                      className="font-body bg-white/5 p-4 rounded-xl border border-white/15 text-sm font-medium text-center text-white/90 hover:bg-[#C59B27]/20 hover:border-[#D4AF37]/60 hover:text-[#EEDC9A] transition-all duration-200 cursor-pointer"
                    >
                      {isTh ? item.labelTh : item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
