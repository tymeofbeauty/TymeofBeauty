/**
 * Centralized configuration for the Beauty Services page (/beauty-services).
 *
 * Items set to `null` explicitly mark business-owned assets/channels awaiting
 * official confirmation so no placeholder URLs or unverified device visuals
 * are substituted silently.
 */

// Requires business confirmation: designate the official LINE OA3 — Client Service URL.
export const LINE_OA_BEAUTY_SERVICES_URL: string | null = null;

// Requires business confirmation: provide the approved official AI X FACE product image URL.
export const AI_X_FACE_IMAGE_URL: string | null = null;

export interface SignatureBeautyServiceItem {
  id: string;
  name: string;
  sectionLabel: string;
  heading: string;
  secondaryHeading: string;
  descriptionParagraphs: string[];
  ctaLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  inquiryTopic: string;
}

export const SIGNATURE_BEAUTY_SERVICES: SignatureBeautyServiceItem[] = [
  {
    id: 'ai-x-face',
    name: 'AI X FACE Beauty Experience',
    sectionLabel: 'OUR SIGNATURE SERVICE',
    heading: 'DISCOVER AI X FACE',
    secondaryHeading: 'A New Way to Experience Facial Care',
    descriptionParagraphs: [
      'เปิดประสบการณ์ดูแลผิวหน้ากับ AI X FACE อุปกรณ์ความงามที่เป็นส่วนหนึ่งของแนวคิด Beauty Everywhere',
      'สัมผัสรูปแบบการดูแลตัวเองที่ผสานเทคโนโลยีเข้ากับความใส่ใจ โดยสามารถสอบถามขั้นตอนการให้บริการ ระยะเวลา และรายละเอียดอื่น ๆ ได้จากทีม TYME of Beauty',
    ],
    ctaLabel: 'สอบถามบริการ AI X FACE',
    imageUrl: AI_X_FACE_IMAGE_URL,
    imageAlt: 'AI X FACE Beauty Experience visual showcase slot',
    inquiryTopic: 'สอบถามบริการ AI X FACE Beauty Experience',
  },
];
