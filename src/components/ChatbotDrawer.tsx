import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  addMemory,
  addMessage,
  ChatMessageRecord,
  ChatSessionRecord,
  createSession,
  deleteDocChunksByIds,
  deleteMemory,
  deleteSession,
  DocChunkRecord,
  logout,
  saveDocChunks,
  subscribeDocChunks,
  subscribeMemories,
  subscribeMessages,
  subscribeSessions,
  updateSessionMeta,
  UserMemoryRecord,
} from '../firebase';
import { Language } from '../utils/logic';
import { GoogleSignInButton } from './GoogleSignInButton';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatbotDrawerProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  user: User | null;
  accessToken: string | null;
  onSignIn: () => Promise<{ user: User; accessToken: string | null } | null>;
  onOpenContact: (interest?: string) => void;
}

type DrawerTab = 'chat' | 'memory' | 'docs';

interface DriveDocItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface LocalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources: string[];
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  open,
  onClose,
  lang,
  user,
  accessToken,
  onSignIn,
  onOpenContact,
}) => {
  const isTh = lang === 'th';
  const [activeTab, setActiveTab] = useState<DrawerTab>('chat');

  // Auth / Sessions / Messages
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessageRecord[]>([]);
  const [guestMessages, setGuestMessages] = useState<LocalMessage[]>([]);

  // Streaming & composer
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<string[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  // Memories
  const [memories, setMemories] = useState<UserMemoryRecord[]>([]);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState<
    'preference' | 'goal' | 'beauty' | 'career' | 'partner'
  >('preference');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Google Docs Vector DB
  const [docChunks, setDocChunks] = useState<DocChunkRecord[]>([]);
  const [driveDocs, setDriveDocs] = useState<DriveDocItem[]>([]);
  const [isLoadingDriveDocs, setIsLoadingDriveDocs] = useState(false);
  const [indexingDocId, setIndexingDocId] = useState<string | null>(null);
  const [manualDocInput, setManualDocInput] = useState('');
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docsSuccess, setDocsSuccess] = useState<string | null>(null);

  // Destructive action confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to user's Firestore collections when authenticated
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setActiveSessionId(null);
      setFirestoreMessages([]);
      setMemories([]);
      setDocChunks([]);
      return;
    }

    const handleSnapError = (err: Error) => {
      setChatError(err.message);
    };

    const unsubSessions = subscribeSessions(
      user.uid,
      (list) => {
        setSessions(list);
        setActiveSessionId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      },
      handleSnapError
    );

    const unsubMemories = subscribeMemories(
      user.uid,
      (list) => {
        setMemories(list);
      },
      handleSnapError
    );

    const unsubChunks = subscribeDocChunks(
      user.uid,
      (list) => {
        setDocChunks(list);
      },
      handleSnapError
    );

    return () => {
      unsubSessions();
      unsubMemories();
      unsubChunks();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !activeSessionId) {
      setFirestoreMessages([]);
      return;
    }
    const unsub = subscribeMessages(
      user.uid,
      activeSessionId,
      (msgs) => {
        setFirestoreMessages(msgs);
      },
      (err) => setChatError(err.message)
    );
    return () => unsub();
  }, [user, activeSessionId]);

  const handleSafeSignIn = async () => {
    setChatError(null);
    setDocsError(null);
    try {
      await onSignIn();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isTh
            ? 'ไม่สามารถเข้าสู่ระบบ Google ได้ กรุณาอนุญาตป๊อปอัปแล้วลองอีกครั้ง'
            : 'Unable to sign in with Google. Please allow popups and try again.';
      setChatError(msg);
      setDocsError(msg);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [firestoreMessages, guestMessages, streamingContent, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDialog) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, confirmDialog]);

  const indexedDocsSummary = useMemo(() => {
    const map = new Map<
      string,
      { documentId: string; documentTitle: string; chunkIds: string[]; count: number }
    >();
    for (const chunk of docChunks) {
      const existing = map.get(chunk.documentId);
      if (existing) {
        existing.chunkIds.push(chunk.id);
        existing.count += 1;
      } else {
        map.set(chunk.documentId, {
          documentId: chunk.documentId,
          documentTitle: chunk.documentTitle,
          chunkIds: [chunk.id],
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [docChunks]);

  const displayedMessages: LocalMessage[] = user
    ? firestoreMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? [],
      }))
    : guestMessages;

  const handleNewSession = async () => {
    if (!user) {
      setGuestMessages([]);
      return;
    }
    const title = isTh ? 'การปรึกษาใหม่' : 'New Consultation';
    const id = await createSession(user.uid, title, lang);
    setActiveSessionId(id);
    setShowSessionsList(false);
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? input).trim();
    if (!text || isStreaming) return;

    setInput('');
    setChatError(null);
    setStreamingContent('');
    setStreamingSources([]);
    setIsStreaming(true);

    let targetSessionId = activeSessionId;
    const historySnapshot = displayedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      if (user) {
        if (!targetSessionId) {
          targetSessionId = await createSession(user.uid, text.slice(0, 60), lang);
          setActiveSessionId(targetSessionId);
        }
        await addMessage(user.uid, targetSessionId, 'user', text, []);
        const isFirstTurn = historySnapshot.length === 0;
        await updateSessionMeta(user.uid, targetSessionId, {
          ...(isFirstTurn ? { title: text.slice(0, 60) } : {}),
          language: lang,
          messageCount: historySnapshot.length + 1,
          lastMessagePreview: text.slice(0, 140),
        });
      } else {
        setGuestMessages((prev) => [
          ...prev,
          { id: `u_${Date.now()}`, role: 'user', content: text, sources: [] },
        ]);
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historySnapshot,
          language: lang,
          userName: user?.displayName || undefined,
          memories: memories.map((m) => ({ fact: m.fact, category: m.category })),
          docChunks: docChunks.map((c) => ({
            id: c.id,
            documentId: c.documentId,
            documentTitle: c.documentTitle,
            chunkIndex: c.chunkIndex,
            content: c.content,
            embedding: c.embedding,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat stream failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let citedSources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const rawEvent of events) {
          const line = rawEvent.trim();
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          const payload = JSON.parse(jsonStr) as {
            type: string;
            text?: string;
            sources?: string[];
            error?: string;
          };

          if (payload.type === 'sources' && Array.isArray(payload.sources)) {
            citedSources = payload.sources;
            setStreamingSources(payload.sources);
          } else if (payload.type === 'chunk' && payload.text) {
            accumulated += payload.text;
            setStreamingContent(accumulated);
          } else if (payload.type === 'error') {
            throw new Error(payload.error || 'Gemini streaming error');
          }
        }
      }

      const finalAnswer =
        accumulated.trim() ||
        (isTh ? 'ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้' : 'I could not generate a response right now.');

      if (user && targetSessionId) {
        await addMessage(user.uid, targetSessionId, 'model', finalAnswer, citedSources);
        await updateSessionMeta(user.uid, targetSessionId, {
          language: lang,
          messageCount: historySnapshot.length + 2,
          lastMessagePreview: finalAnswer.slice(0, 140),
        });

        // Background memory extraction via gemini-3.1-flash-lite
        void fetch('/api/chat/extract-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: text,
            assistantMessage: finalAnswer,
            existingFacts: memories.map((m) => m.fact),
          }),
        })
          .then((r) => r.json())
          .then(
            async (resData: {
              memories?: Array<{
                fact: string;
                category: 'preference' | 'goal' | 'beauty' | 'career' | 'partner';
              }>;
            }) => {
              if (resData.memories && resData.memories.length > 0) {
                for (const mem of resData.memories) {
                  await addMemory(user.uid, mem.fact, mem.category);
                }
              }
            }
          )
          .catch(() => {});
      } else {
        setGuestMessages((prev) => [
          ...prev,
          {
            id: `m_${Date.now()}`,
            role: 'model',
            content: finalAnswer,
            sources: citedSources,
          },
        ]);
      }
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingSources([]);
    }
  };

  const handleLoadDriveDocs = async () => {
    if (!accessToken) {
      setDocsError(
        isTh
          ? 'กรุณาเข้าสู่ระบบ Google อีกครั้งเพื่ออนุญาตสิทธิ์การอ่าน Google Docs'
          : 'Please sign in with Google to authorize Google Docs access.'
      );
      return;
    }

    setIsLoadingDriveDocs(true);
    setDocsError(null);
    setDocsSuccess(null);
    try {
      const res = await fetch('/api/docs/list', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch Google Docs list.');
      }
      setDriveDocs(data.files ?? []);
    } catch (err: unknown) {
      setDocsError(err instanceof Error ? err.message : 'Failed to load Google Docs.');
    } finally {
      setIsLoadingDriveDocs(false);
    }
  };

  const handleIndexDoc = async (docIdOrUrl: string) => {
    if (!user || !accessToken) {
      setDocsError(
        isTh
          ? 'กรุณาเข้าสู่ระบบด้วย Google ก่อนเชื่อมต่อฐานข้อมูลเอกสารส่วนตัว'
          : 'Please sign in with Google to index documents into your private vector database.'
      );
      return;
    }

    setIndexingDocId(docIdOrUrl);
    setDocsError(null);
    setDocsSuccess(null);

    try {
      const res = await fetch('/api/docs/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documentId: docIdOrUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to index Google Doc.');
      }

      const existingIds = docChunks
        .filter((c) => c.documentId === data.documentId)
        .map((c) => c.id);

      await saveDocChunks(
        user.uid,
        data.documentId,
        data.documentTitle,
        data.chunks,
        existingIds
      );

      setManualDocInput('');
      setDocsSuccess(
        isTh
          ? `สร้าง Vector Embeddings สำหรับ "${data.documentTitle}" (${data.chunks.length} ชิ้นส่วน) สำเร็จ`
          : `Indexed "${data.documentTitle}" (${data.chunks.length} vector chunks) into your private knowledge base.`
      );
    } catch (err: unknown) {
      setDocsError(err instanceof Error ? err.message : 'Indexing failed.');
    } finally {
      setIndexingDocId(null);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMemoryText.trim()) return;
    setIsAddingMemory(true);
    try {
      await addMemory(user.uid, newMemoryText.trim(), newMemoryCategory);
      setNewMemoryText('');
    } finally {
      setIsAddingMemory(false);
    }
  };

  if (!open) return null;

  const quickPrompts = isTh
    ? [
        'แนะนำโปรแกรมดูแลผิวและสุขภาพของ Tyme of Beauty',
        'อยากเริ่มต้นอาชีพความงาม TYME Career ต้องทำอย่างไร',
        'เงื่อนไขการเป็น Business Partner ไม่มีค่าใช้จ่ายเริ่มต้น',
      ]
    : [
        'What Beauty & Healthy Services does Tyme of Beauty offer?',
        'How does the TYME Career makeover program work?',
        'Tell me about Business Partner & Influencer opportunities',
      ];

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isTh ? 'ผู้ช่วยอัจฉริยะ Tyme of Beauty' : 'Tyme of Beauty AI Concierge'}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg h-full bg-white text-[#111827] shadow-2xl flex flex-col border-l border-[#EEDC9A]/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-5 pt-4 pb-3 border-b border-[#E2E8F0] space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-headline text-xl font-bold tracking-tight text-[#111827]">
                {isTh ? 'TYME AI Concierge' : 'TYME AI Concierge'}
              </h2>
              <p className="text-xs text-[#755809] font-medium">
                {isTh
                  ? 'ความงาม สุขภาพ อาชีพ และพาร์ทเนอร์ · ตอบจาก Google Docs ส่วนตัว'
                  : 'Beauty, Wellness & Partner Advisor · Private Docs RAG'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={isTh ? 'ปิดแชทบอท' : 'Close AI Concierge'}
              className="w-9 h-9 rounded-lg border border-[#8A795D]/40 flex items-center justify-center text-[#111827] hover:bg-[#111827] hover:text-white transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Auth Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F4F6FC] border border-[#D4AF37]/25 rounded-xl px-3 py-2">
            {user ? (
              <>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[11px] text-neutral-500 tabular-nums">
                    {sessions.length} {isTh ? 'ห้องแชท' : 'saved chats'} · {memories.length}{' '}
                    {isTh ? 'ความจำ' : 'memories'} · {indexedDocsSummary.length}{' '}
                    {isTh ? 'เอกสาร' : 'docs'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!accessToken && (
                    <button
                      type="button"
                      onClick={() => void handleSafeSignIn()}
                      className="px-3 py-1.5 rounded-lg bg-[#755809] text-white text-xs font-semibold hover:bg-[#5E4606] transition-colors"
                    >
                      {isTh ? 'เชื่อมต่อ Docs' : 'Reconnect Google'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void logout().catch((err) => setChatError(String(err)))}
                    className="px-3 py-1.5 rounded-lg border border-[#8A795D]/40 text-xs font-medium text-[#111827] hover:border-[#111827] transition-colors"
                  >
                    {isTh ? 'ออกจากระบบ' : 'Sign out'}
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-neutral-600">
                  {isTh
                    ? 'เข้าสู่ระบบเพื่อบันทึกแชท ความจำส่วนตัว และ Google Docs'
                    : 'Sign in to save chats, personal memory & Google Docs'}
                </span>
                <GoogleSignInButton
                  onClick={() => void handleSafeSignIn()}
                  label={isTh ? 'เข้าสู่ระบบด้วย Google' : 'Sign in with Google'}
                />
              </div>
            )}
          </div>

          {/* Segmented Tab Controls */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#EAEFFB] rounded-xl" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'bg-[#755809] text-white shadow-sm'
                  : 'text-[#111827]/70 hover:text-[#111827]'
              }`}
            >
              {isTh ? 'สนทนา AI' : 'Chat'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'memory'}
              onClick={() => setActiveTab('memory')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                activeTab === 'memory'
                  ? 'bg-[#755809] text-white shadow-sm'
                  : 'text-[#111827]/70 hover:text-[#111827]'
              }`}
            >
              {isTh ? `ความจำ (${memories.length})` : `Memory (${memories.length})`}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'docs'}
              onClick={() => setActiveTab('docs')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                activeTab === 'docs'
                  ? 'bg-[#755809] text-white shadow-sm'
                  : 'text-[#111827]/70 hover:text-[#111827]'
              }`}
            >
              {isTh
                ? `Google Docs (${indexedDocsSummary.length})`
                : `Docs RAG (${indexedDocsSummary.length})`}
            </button>
          </div>
        </div>

        {/* TAB 1: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Session switcher bar */}
            {user && (
              <div className="px-4 py-2 border-b border-neutral-200 flex items-center justify-between gap-2 bg-white shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSessionsList((s) => !s)}
                  className="text-xs font-semibold text-neutral-700 hover:text-black flex items-center gap-1.5 truncate"
                >
                  <span>
                    {sessions.find((s) => s.id === activeSessionId)?.title ||
                      (isTh ? 'เลือกประวัติแชท' : 'Saved Sessions')}
                  </span>
                  <span aria-hidden="true">{showSessionsList ? '▲' : '▼'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleNewSession()}
                  className="px-3 py-1 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors shrink-0"
                >
                  {isTh ? '+ แชทใหม่' : '+ New Chat'}
                </button>
              </div>
            )}

            {/* Collapsible Saved Sessions List */}
            {user && showSessionsList && (
              <div className="max-h-52 overflow-y-auto border-b border-neutral-200 bg-stone-50 px-4 py-2 space-y-1.5 shrink-0">
                {sessions.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-2">
                    {isTh ? 'ยังไม่มีประวัติการสนทนาที่บันทึกไว้' : 'No saved sessions yet.'}
                  </p>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 border ${
                        sess.id === activeSessionId
                          ? 'bg-white border-black'
                          : 'bg-white/70 border-neutral-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSessionId(sess.id);
                          setShowSessionsList(false);
                        }}
                        className="text-left min-w-0 flex-1"
                      >
                        <p className="text-xs font-semibold text-black truncate">{sess.title}</p>
                        <p className="text-[11px] text-neutral-500 truncate">
                          {sess.lastMessagePreview || (isTh ? 'เริ่มการสนทนา' : 'Empty session')}
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete session ${sess.title}`}
                        onClick={() =>
                          setConfirmDialog({
                            title: isTh ? 'ลบประวัติการสนทนา?' : 'Delete saved chat session?',
                            description: isTh
                              ? `คุณต้องการลบห้องแชท "${sess.title}" ใช่หรือไม่?`
                              : `Are you sure you want to delete "${sess.title}"? This action cannot be undone.`,
                            confirmLabel: isTh ? 'ลบห้องแชท' : 'Delete Session',
                            onConfirm: async () => {
                              await deleteSession(user.uid, sess.id);
                              if (activeSessionId === sess.id) {
                                setActiveSessionId(null);
                              }
                            },
                          })
                        }
                        className="text-xs text-neutral-500 hover:text-red-600 px-2 py-1 shrink-0"
                      >
                        {isTh ? 'ลบ' : 'Delete'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Scrollable Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {displayedMessages.length === 0 && !isStreaming && (
                <div className="space-y-4 py-4">
                  <div className="rounded-2xl bg-[#F4F6FC] border border-[#D4AF37]/25 p-4 space-y-2">
                    <h3 className="font-headline text-base font-bold text-[#111827]">
                      {isTh
                        ? 'สวัสดีค่ะ ยินดีต้อนรับสู่ Tyme of Beauty'
                        : 'Welcome to Tyme of Beauty'}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {isTh
                        ? 'ถามได้ทุกเรื่องเกี่ยวกับบริการความงาม สุขภาพ หลักสูตรอาชีพ TYME Career พาร์ทเนอร์ธุรกิจ หรือค้นหาข้อมูลจาก Google Docs ส่วนตัวของคุณ'
                        : 'Ask anything about our Beauty & Healthy Services, TYME Career certification, Business Partner opportunities, or query your indexed private Google Docs.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#755809]">
                      {isTh ? 'คำถามแนะนำ' : 'Suggested Questions'}
                    </p>
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => void handleSend(qp)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#C59B27] hover:bg-[#F4F6FC] text-xs font-medium text-[#111827] transition-colors"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {displayedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#111827] text-white text-sm'
                        : 'bg-[#F4F6FC] border border-[#E2E8F0] text-[#111827]'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                  {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                    <p className="mt-1 px-1 text-[11px] text-neutral-500">
                      {isTh ? 'อ้างอิงจาก Google Docs: ' : 'Sources: '}
                      {msg.sources.join(' · ')}
                    </p>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[90%] rounded-2xl px-4 py-3 bg-stone-50 border border-neutral-200 text-neutral-900">
                    {streamingContent ? (
                      <MarkdownRenderer content={streamingContent} />
                    ) : (
                      <p className="text-xs text-neutral-500">
                        {isTh ? 'กำลังวิเคราะห์และพิมพ์คำตอบ...' : 'Thinking and streaming response...'}
                      </p>
                    )}
                  </div>
                  {streamingSources.length > 0 && (
                    <p className="mt-1 px-1 text-[11px] text-neutral-500">
                      {isTh ? 'กำลังอ้างอิง: ' : 'Using Docs: '}
                      {streamingSources.join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {chatError && (
                <div
                  className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700"
                  role="alert"
                >
                  {chatError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="p-3 md:p-4 border-t border-neutral-200 bg-white space-y-2 shrink-0"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="chatbot-input" className="sr-only">
                  {isTh ? 'พิมพ์ข้อความถึงผู้ช่วย AI' : 'Message AI Concierge'}
                </label>
                <input
                  id="chatbot-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isStreaming}
                  placeholder={
                    isTh ? 'พิมพ์คำถามของคุณที่นี่...' : 'Ask about services, career, or your docs...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-[#C59B27] text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="px-5 py-2.5 rounded-lg bg-[#755809] text-white text-sm font-semibold hover:bg-[#5E4606] disabled:opacity-40 transition-colors shrink-0"
                >
                  {isTh ? 'ส่ง' : 'Send'}
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-neutral-400">
                  {indexedDocsSummary.length > 0
                    ? isTh
                      ? `ค้นหาจาก ${indexedDocsSummary.length} เอกสาร Google Docs`
                      : `RAG active · ${indexedDocsSummary.length} Google Doc(s)`
                    : isTh
                      ? 'เชื่อมต่อ Google Docs เพื่อเพิ่มบริบทส่วนตัว'
                      : 'Add Google Docs in Docs RAG tab for private context'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenContact('Free Consultation');
                  }}
                  className="text-[11px] font-semibold text-[#755809] underline underline-offset-2"
                >
                  {isTh ? 'จองคิวปรึกษาฟรี →' : 'Book Consultation →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: PERSISTENT USER MEMORY */}
        {activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!user ? (
              <div className="rounded-2xl bg-stone-50 border border-neutral-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-black">
                  {isTh ? 'ความจำส่วนตัวข้ามเซสชัน' : 'Persistent User Memory'}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {isTh
                    ? 'เข้าสู่ระบบด้วย Google เพื่อให้ AI จดจำเป้าหมายด้านความงาม สุขภาพ และธุรกิจของคุณอย่างต่อเนื่องในทุกการสนทนา'
                    : 'Sign in with Google to enable persistent personal memory across sessions so the AI remembers your beauty goals, skin preferences, and career interests.'}
                </p>
                <GoogleSignInButton
                  onClick={() => void handleSafeSignIn()}
                  label={isTh ? 'เข้าสู่ระบบด้วย Google' : 'Sign in with Google'}
                />
              </div>
            ) : (
              <>
                <form onSubmit={handleAddMemory} className="space-y-2.5 bg-stone-50 p-4 rounded-2xl border border-neutral-200">
                  <label htmlFor="new-memory-input" className="block text-xs font-bold text-black">
                    {isTh ? 'เพิ่มความจำหรือความชอบส่วนตัว' : 'Add Personal Preference or Goal'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label={isTh ? 'หมวดหมู่ความจำ' : 'Memory category'}
                      value={newMemoryCategory}
                      onChange={(e) =>
                        setNewMemoryCategory(
                          e.target.value as 'preference' | 'goal' | 'beauty' | 'career' | 'partner'
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-medium outline-none"
                    >
                      <option value="preference">{isTh ? 'ความชอบ' : 'Preference'}</option>
                      <option value="beauty">{isTh ? 'ความงาม' : 'Beauty'}</option>
                      <option value="goal">{isTh ? 'เป้าหมายสุขภาพ' : 'Wellness Goal'}</option>
                      <option value="career">{isTh ? 'อาชีพ' : 'Career'}</option>
                      <option value="partner">{isTh ? 'พาร์ทเนอร์' : 'Partner'}</option>
                    </select>
                    <input
                      id="new-memory-input"
                      type="text"
                      value={newMemoryText}
                      onChange={(e) => setNewMemoryText(e.target.value)}
                      placeholder={
                        isTh
                          ? 'เช่น สนใจโปรแกรมดูแลผิวและธุรกิจพาร์ทเนอร์ในกรุงเทพฯ'
                          : 'e.g. Interested in non-invasive skincare & Bangkok partner tier'
                      }
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-black"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingMemory || !newMemoryText.trim()}
                    className="w-full py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  >
                    {isAddingMemory
                      ? isTh
                        ? 'กำลังบันทึก...'
                        : 'Saving...'
                      : isTh
                        ? 'บันทึกความจำ'
                        : 'Save to Persistent Memory'}
                  </button>
                </form>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {isTh ? 'ความจำที่บันทึกไว้' : 'Stored User Memory'}
                  </h3>
                  {memories.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4">
                      {isTh
                        ? 'ยังไม่มีข้อมูลความจำ AI จะเรียนรู้จากการสนทนาของคุณโดยอัตโนมัติ'
                        : 'No memories stored yet. Chat with the AI or add your preferences above.'}
                    </p>
                  ) : (
                    memories.map((mem) => (
                      <div
                        key={mem.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 p-3 bg-white"
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                            {mem.category}
                          </span>
                          <p className="text-xs text-black leading-relaxed">{mem.fact}</p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Delete memory ${mem.fact}`}
                          onClick={() =>
                            setConfirmDialog({
                              title: isTh ? 'ลบความจำนี้?' : 'Delete remembered fact?',
                              description: mem.fact,
                              confirmLabel: isTh ? 'ลบความจำ' : 'Delete Memory',
                              onConfirm: async () => {
                                await deleteMemory(user.uid, mem.id);
                              },
                            })
                          }
                          className="text-xs text-neutral-400 hover:text-red-600 shrink-0 px-1.5 py-0.5"
                        >
                          {isTh ? 'ลบ' : 'Remove'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: PRIVATE GOOGLE DOCS VECTOR DATABASE */}
        {activeTab === 'docs' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!user || !accessToken ? (
              <div className="rounded-2xl bg-stone-50 border border-neutral-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-black">
                  {isTh
                    ? 'ฐานข้อมูล Vector ส่วนตัวจาก Google Docs'
                    : 'Private Google Docs Vector Database'}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {isTh
                    ? 'เชื่อมต่อบัญชี Google ของคุณเพื่อเลือกเอกสาร Google Docs สำหรับสร้าง Vector Embeddings (gemini-embedding-2) เพื่อให้ AI ตอบคำถามจากข้อมูลเฉพาะของคุณได้'
                    : 'Connect your Google account to browse your Google Docs, generate vector embeddings with Gemini, and store them privately for personalized RAG chat.'}
                </p>
                <GoogleSignInButton
                  onClick={() => void handleSafeSignIn()}
                  label={
                    user
                      ? isTh
                        ? 'อนุญาตสิทธิ์ Google Docs อีกครั้ง'
                        : 'Authorize Google Docs Access'
                      : isTh
                        ? 'เข้าสู่ระบบด้วย Google'
                        : 'Sign in with Google'
                  }
                />
                {docsError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="alert">
                    {docsError}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Manual Google Doc URL / ID */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualDocInput.trim()) void handleIndexDoc(manualDocInput);
                  }}
                  className="bg-stone-50 border border-neutral-200 rounded-2xl p-4 space-y-2.5"
                >
                  <label htmlFor="google-doc-url" className="block text-xs font-bold text-black">
                    {isTh
                      ? 'เชื่อมต่อจากลิงก์หรือ Document ID ของ Google Docs'
                      : 'Index by Google Doc URL or Document ID'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="google-doc-url"
                      type="text"
                      value={manualDocInput}
                      onChange={(e) => setManualDocInput(e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs outline-none focus:border-black"
                    />
                    <button
                      type="submit"
                      disabled={!manualDocInput.trim() || Boolean(indexingDocId)}
                      className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {indexingDocId === manualDocInput
                        ? isTh
                          ? 'กำลังสร้าง Vector...'
                          : 'Indexing...'
                        : isTh
                          ? 'ดึงข้อมูล'
                          : 'Index Doc'}
                    </button>
                  </div>
                </form>

                {/* Browse Google Drive Docs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      {isTh ? 'เอกสาร Google Docs ของคุณ' : 'Your Google Docs'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void handleLoadDriveDocs()}
                      disabled={isLoadingDriveDocs}
                      className="px-3.5 py-1.5 rounded-full border border-black text-xs font-semibold hover:bg-black hover:text-white disabled:opacity-50 transition-colors"
                    >
                      {isLoadingDriveDocs
                        ? isTh
                          ? 'กำลังโหลด...'
                          : 'Loading...'
                        : isTh
                          ? 'โหลดรายการ Docs'
                          : 'Load My Google Docs'}
                    </button>
                  </div>

                  {docsError && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="alert">
                      {docsError}
                    </p>
                  )}
                  {docsSuccess && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      {docsSuccess}
                    </p>
                  )}

                  {driveDocs.length > 0 && (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {driveDocs.map((d) => {
                        const alreadyIndexed = indexedDocsSummary.some(
                          (item) => item.documentId === d.id
                        );
                        return (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 bg-white"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-black truncate">{d.name}</p>
                              <p className="text-[11px] text-neutral-500">
                                {alreadyIndexed
                                  ? isTh
                                    ? 'อยู่ในฐานข้อมูล Vector แล้ว'
                                    : 'Indexed in Vector DB'
                                  : isTh
                                    ? 'พร้อมสร้าง Vector'
                                    : 'Ready to index'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleIndexDoc(d.id)}
                              disabled={indexingDocId === d.id}
                              className="px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 shrink-0"
                            >
                              {indexingDocId === d.id
                                ? isTh
                                  ? 'กำลังทำ Vector...'
                                  : 'Indexing...'
                                : alreadyIndexed
                                  ? isTh
                                    ? 'อัปเดต'
                                    : 'Re-index'
                                  : isTh
                                    ? 'สร้าง Vector'
                                    : 'Index'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Indexed Vector Database Docs */}
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {isTh
                      ? 'เอกสารในฐานข้อมูล Vector ส่วนตัว'
                      : 'Indexed Private Knowledge Base'}
                  </h3>
                  {indexedDocsSummary.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-2">
                      {isTh
                        ? 'ยังไม่มีเอกสารที่สร้าง Vector Embeddings'
                        : 'No Google Docs indexed yet. Load your Docs above or paste a Google Doc URL.'}
                    </p>
                  ) : (
                    indexedDocsSummary.map((docItem) => (
                      <div
                        key={docItem.documentId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-black truncate">
                            {docItem.documentTitle}
                          </p>
                          <p className="text-[11px] text-neutral-500 tabular-nums">
                            {docItem.count} {isTh ? 'เวกเตอร์ชังก์' : 'vector chunks'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: isTh
                                ? 'ลบเอกสารออกจากฐานข้อมูล Vector?'
                                : 'Remove document from Vector DB?',
                              description: isTh
                                ? `ต้องการลบเวกเตอร์ทั้งหมดของ "${docItem.documentTitle}" ออกจากฐานข้อมูลส่วนตัวของคุณหรือไม่? (ไฟล์ต้นฉบับใน Google Docs จะไม่ถูกลบ)`
                                : `Remove all ${docItem.count} vector embeddings for "${docItem.documentTitle}" from your private knowledge base? Your original Google Doc will not be modified.`,
                              confirmLabel: isTh ? 'ยืนยันการลบ' : 'Remove Vectors',
                              onConfirm: async () => {
                                await deleteDocChunksByIds(user.uid, docItem.chunkIds);
                              },
                            })
                          }
                          className="text-xs text-neutral-500 hover:text-red-600 px-2 py-1 shrink-0"
                        >
                          {isTh ? 'ลบออก' : 'Remove'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Explicit Confirmation Modal for Destructive Actions */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          onClick={(e) => {
            e.stopPropagation();
            if (!isConfirming) setConfirmDialog(null);
          }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-base font-bold text-black">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{confirmDialog.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-full border border-neutral-300 text-xs font-semibold hover:border-black"
              >
                {isTh ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={async () => {
                  setIsConfirming(true);
                  try {
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } finally {
                    setIsConfirming(false);
                  }
                }}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {isConfirming ? (isTh ? 'กำลังลบ...' : 'Deleting...') : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
