import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ensureUserProfile,
  getUserProfile,
  googleSignIn,
  initAuth,
} from './firebase';
import {
  AppRoute,
  getRouteMetadata,
  Language,
  normalizeAppRoute,
} from './utils/logic';
import { SiteHeader } from './components/SiteHeader';
import { SiteFooter } from './components/SiteFooter';
import { HomePage } from './components/HomePage';
import { BeautyServicesPage } from './components/BeautyServicesPage';
import { ContactModal } from './components/ContactModal';
import { ChatbotDrawer } from './components/ChatbotDrawer';

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

function updateHeadMetaTag(
  selector: string,
  createAttr: { attr: 'name' | 'property'; key: string },
  content: string
) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(createAttr.attr, createAttr.key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function App() {
  const initialRoute: AppRoute =
    typeof window !== 'undefined' ? normalizeAppRoute(window.location.pathname) : '/';

  const skipSplashOnLoad =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('autostart') === '1' ||
      initialRoute !== '/');

  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [showSplash, setShowSplash] = useState<boolean>(!skipSplashOnLoad);
  const [lang, setLang] = useState<Language>('en');
  const [menuOpen, setMenuOpen] = useState(false);

  // Modals & Drawers
  const [contactOpen, setContactOpen] = useState(false);
  const [contactInterest, setContactInterest] = useState<string>('Free Consultation');
  const [contactNotes, setContactNotes] = useState<string>('');
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Firebase Auth & Workspace state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkedSheet, setLinkedSheet] = useState<{ id?: string; url?: string }>({});

  // Sync browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const next = normalizeAppRoute(window.location.pathname);
      setRoute(next);
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync route-specific SEO metadata cleanly without overwriting Home defaults
  useEffect(() => {
    const meta = getRouteMetadata(route);
    document.title = meta.title;
    updateHeadMetaTag(
      'meta[name="description"]',
      { attr: 'name', key: 'description' },
      meta.description
    );
    updateHeadMetaTag(
      'meta[property="og:title"]',
      { attr: 'property', key: 'og:title' },
      meta.ogTitle
    );
    updateHeadMetaTag(
      'meta[property="og:description"]',
      { attr: 'property', key: 'og:description' },
      meta.ogDescription
    );

    const origin = window.location.origin;
    if (origin && origin.startsWith('http')) {
      const fullUrl = `${origin}${route}`;
      updateHeadMetaTag('meta[property="og:url"]', { attr: 'property', key: 'og:url' }, fullUrl);
      let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', fullUrl);
    }
  }, [route]);

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

  const openContact = useCallback((interest = 'Free Consultation', notes = '') => {
    setContactInterest(interest);
    setContactNotes(notes);
    setContactOpen(true);
    setMenuOpen(false);
  }, []);

  const navigateHome = useCallback(
    (sectionId?: string) => {
      setMenuOpen(false);
      if (route !== '/') {
        window.history.pushState(null, '', '/');
        setRoute('/');
        window.setTimeout(() => {
          if (sectionId && sectionId !== 'section-hero') {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }, 60);
      } else if (sectionId) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [route]
  );

  const navigateBeautyServices = useCallback(() => {
    setMenuOpen(false);
    if (route !== '/beauty-services') {
      window.history.pushState(null, '', '/beauty-services');
      setRoute('/beauty-services');
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  const scrollToHomeSection = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="bg-white min-h-screen text-[#111827] relative font-body flex flex-col">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <SiteHeader
        lang={lang}
        setLang={setLang}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        currentRoute={route}
        onNavigateHome={navigateHome}
        onNavigateBeautyServices={navigateBeautyServices}
        onOpenContact={(interest) => openContact(interest)}
        onOpenChatbot={() => setChatbotOpen(true)}
      />

      <main className="flex-1">
        {route === '/beauty-services' ? (
          <BeautyServicesPage
            lang={lang}
            onOpenInquiry={(interest, notes) => openContact(interest, notes)}
          />
        ) : (
          <HomePage
            lang={lang}
            user={user}
            accessToken={accessToken}
            linkedSpreadsheetId={linkedSheet.id}
            onSheetLinked={(id, url) => setLinkedSheet({ id, url })}
            onOpenContact={(interest) => openContact(interest)}
            onScrollToSection={scrollToHomeSection}
            onNavigateBeautyServices={navigateBeautyServices}
          />
        )}
      </main>

      <SiteFooter
        lang={lang}
        setLang={setLang}
        currentRoute={route}
        onNavigateHome={navigateHome}
        onNavigateBeautyServices={navigateBeautyServices}
        onOpenContact={(interest) => openContact(interest)}
        onOpenChatbot={() => setChatbotOpen(true)}
      />

      {/* CONVERSION FLOW CONTACT MODAL */}
      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        lang={lang}
        initialInterest={contactInterest}
        initialNotes={contactNotes}
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
