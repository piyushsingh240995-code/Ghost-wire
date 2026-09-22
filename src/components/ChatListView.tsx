import { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { Search, Plus, MessageSquare, ShieldAlert, X, User, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { getTheme } from '../lib/themes';

export default function ChatListView({ onChatSelect, userProfile }: { onChatSelect: (id: string) => void, userProfile: any }) {
  const currentTheme = getTheme(userProfile?.theme || localStorage.getItem('ghostchat_theme') || 'ghostwire');
  const [chats, setChats] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
      setChats(list);
    }, (error) => {
      console.warn("Conversations list listener warning:", error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch initial directory users when opening search to allow fast discovery
  useEffect(() => {
    if (!isSearching || !auth.currentUser) return;

    let isMounted = true;
    async function loadDirectory() {
      try {
        const qDir = query(collection(db, 'users'), limit(20));
        const snap = await getDocs(qDir);
        if (isMounted) {
          const list = snap.docs
            .map(d => d.data())
            .filter(u => u.uid !== auth.currentUser?.uid && !u.isBanned);
          setDirectoryUsers(list);
        }
      } catch (err) {
        console.warn('Could not prefetch directory:', err);
      }
    }

    loadDirectory();
    return () => { isMounted = false; };
  }, [isSearching]);

  const executeSearch = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsQuerying(false);
      return;
    }

    setIsQuerying(true);
    const cleanHandle = trimmed.replace(/^@+/, '').toLowerCase();
    const currentUid = auth.currentUser?.uid;

    try {
      const resultsMap = new Map<string, any>();

      // 1. Direct query on username prefix
      try {
        const qUsername = query(
          collection(db, 'users'),
          where('username', '>=', cleanHandle),
          where('username', '<=', cleanHandle + '\uf8ff'),
          limit(10)
        );
        const snap = await getDocs(qUsername);
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.uid !== currentUid && !data.isBanned) {
            resultsMap.set(data.uid, data);
          }
        });
      } catch (e) {
        console.warn('Prefix search error:', e);
      }

      // 2. Broad directory scan with in-memory substring matching (handles handle, display name & email)
      try {
        const qAll = query(collection(db, 'users'), limit(50));
        const allSnap = await getDocs(qAll);
        allSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.uid !== currentUid && !data.isBanned) {
            const uName = (data.username || '').toLowerCase();
            const dName = (data.displayName || '').toLowerCase();
            const email = (data.email || '').toLowerCase();

            if (
              uName.includes(cleanHandle) ||
              dName.includes(cleanHandle) ||
              dName.includes(trimmed.toLowerCase()) ||
              email.includes(cleanHandle)
            ) {
              resultsMap.set(data.uid, data);
            }
          }
        });
      } catch (e) {
        console.warn('Directory fallback query error:', e);
      }

      setSearchResults(Array.from(resultsMap.values()));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsQuerying(false);
    }
  };

  // Live search debounce
  useEffect(() => {
    if (!isSearching) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsQuerying(false);
      return;
    }

    setIsQuerying(true);
    debounceRef.current = setTimeout(() => {
      executeSearch(searchQuery);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, isSearching]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    executeSearch(searchQuery);
  };

  const startChat = async (targetUser: any) => {
    const existing = chats.find(c => c.participants.includes(targetUser.uid));
    if (existing) {
      onChatSelect(existing.id);
      setIsSearching(false);
      return;
    }

    try {
      const newConv = await addDoc(collection(db, 'conversations'), {
        participants: [auth.currentUser!.uid, targetUser.uid],
        participantInfo: {
          [auth.currentUser!.uid]: { 
            displayName: userProfile?.displayName || 'Anon Ghost', 
            photoURL: userProfile?.photoURL || '', 
            username: userProfile?.username || 'anon' 
          },
          [targetUser.uid]: { 
            displayName: targetUser.displayName || 'Ghost Entity', 
            photoURL: targetUser.photoURL || '', 
            username: targetUser.username || 'ghost' 
          }
        },
        lastMessage: 'Transmission initiated.',
        updatedAt: serverTimestamp(),
        isEphemeral: false
      });

      onChatSelect(newConv.id);
      setIsSearching(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'conversations');
    }
  };

  return (
    <div className={cn("flex flex-col h-full transition-colors duration-300 relative", currentTheme.bgMain, currentTheme.textMain)}>
      {/* Search Bar Form */}
      <form onSubmit={handleFormSubmit} className="p-4 pb-2 flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search username or @handle..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isSearching) setIsSearching(true);
            }}
            onFocus={() => setIsSearching(true)}
            className={cn("w-full rounded-2xl py-2.5 pl-10 pr-10 text-xs sm:text-sm focus:outline-none transition-all shadow-inner",
              currentTheme.id === 'monochrome' 
                ? 'bg-zinc-950 border border-zinc-700 focus:border-white text-white placeholder-zinc-500' 
                : 'bg-zinc-900/60 border border-white/10 focus:border-white/30 text-white placeholder-zinc-500 backdrop-blur-md'
            )}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {isSearching && (
          <button 
            type="button"
            onClick={() => { 
              setIsSearching(false); 
              setSearchResults([]); 
              setSearchQuery(''); 
            }}
            className="text-xs font-semibold text-zinc-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Suggested People / Quick Chat Strip when not in active search */}
      {!isSearching && directoryUsers.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 mb-2 px-1">
            <span>People in Network</span>
            <button 
              onClick={() => setIsSearching(true)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-normal cursor-pointer"
            >
              Find More →
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {directoryUsers.slice(0, 8).map((u) => {
              const hasChat = chats.some(c => c.participants.includes(u.uid));
              return (
                <button
                  key={u.uid}
                  onClick={() => startChat(u)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/20 hover:bg-zinc-800/60 transition-all flex-shrink-0 cursor-pointer group w-18 text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-800/80 border border-white/10 overflow-hidden flex items-center justify-center relative group-hover:scale-105 transition-transform shadow-md">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-zinc-400" />
                    )}
                    {hasChat && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-300 truncate w-full group-hover:text-white">
                    {u.displayName?.split(' ')[0] || 'User'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-20">
        <AnimatePresence mode="popLayout">
          {isSearching ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Status or Search header */}
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  {searchQuery.trim() 
                    ? `Results for "${searchQuery.trim()}"` 
                    : 'Discover Users'}
                </span>
                {isQuerying && (
                  <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                    <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                    Searching...
                  </span>
                )}
              </div>
              
              {/* Search Results list */}
              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  searchResults.map((u) => {
                    const hasExistingChat = chats.some(c => c.participants.includes(u.uid));
                    return (
                      <motion.div
                        key={u.uid}
                        layout
                        onClick={() => startChat(u)}
                        className="flex items-center gap-3 p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl cursor-pointer hover:bg-zinc-800/70 hover:border-white/20 transition-all active:scale-[0.99] backdrop-blur-md"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm tracking-tight truncate">{u.displayName || 'User'}</div>
                          <div className="text-zinc-400 text-xs font-mono">@{u.username}</div>
                        </div>
                        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {userProfile?.isAdmin && (
                            <button 
                              onClick={async () => {
                                if (confirm(`TERMINATE SIGNAL FOR ${u.displayName}?`)) {
                                  await updateDoc(doc(db, 'users', u.uid), { isBanned: true });
                                  alert("SIGNAL INCINERATED.");
                                }
                              }}
                              className="p-2 hover:bg-red-500/10 rounded-lg group cursor-pointer"
                              title="Ban Entity"
                            >
                              <ShieldAlert className="w-4 h-4 text-zinc-500 group-hover:text-red-500 transition-colors" />
                            </button>
                          )}
                          <button
                            onClick={() => startChat(u)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs transition-colors cursor-pointer hover:bg-zinc-200"
                          >
                            {hasExistingChat ? (
                              <>
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Chat</span>
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : !isQuerying ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
                      <User className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-300">No user found for "{searchQuery}"</p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                      Try searching with exact username or display name.
                    </p>
                  </div>
                ) : null
              ) : (
                /* Unfiltered directory view when search input is empty */
                directoryUsers.length > 0 ? (
                  <div className="space-y-2">
                    {directoryUsers.map((u) => {
                      const hasExistingChat = chats.some(c => c.participants.includes(u.uid));
                      return (
                        <motion.div
                          key={u.uid}
                          layout
                          onClick={() => startChat(u)}
                          className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl cursor-pointer hover:bg-zinc-800/50 hover:border-white/20 transition-all active:scale-[0.99] backdrop-blur-md"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm tracking-tight truncate">{u.displayName || 'User'}</div>
                            <div className="text-zinc-400 text-xs font-mono">@{u.username}</div>
                          </div>
                          <button
                            onClick={() => startChat(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            {hasExistingChat ? (
                              <>
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Chat</span>
                              </>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-zinc-500 text-xs">
                    Type a username to start chatting with anyone.
                  </div>
                )
              )}
            </motion.div>
          ) : (
            /* Normal Chat List */
            <div className="space-y-3">
              {chats.filter((chat: any) => {
                const otherId = chat.participants.find((p: string) => p !== auth.currentUser?.uid);
                return !userProfile?.blockedUsers?.includes(otherId);
              }).map((chat) => {
                const otherId = chat.participants.find((p: string) => p !== auth.currentUser?.uid);
                const other = chat.participantInfo?.[otherId] || { displayName: 'Chat Partner', username: 'user' };

                return (
                  <motion.div
                    key={chat.id}
                    layout
                    onClick={() => onChatSelect(chat.id)}
                    className={cn("flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all active:scale-[0.98] border border-white/5 hover:border-white/20 backdrop-blur-xl shadow-lg", currentTheme.bgCard)}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                        {other.photoURL ? (
                          <img src={other.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-6 h-6 text-zinc-500" />
                        )}
                      </div>
                      {chat.typing && Object.entries(chat.typing).some(([uid, isTyping]) => uid !== auth.currentUser?.uid && isTyping) && (
                        <div className="absolute -bottom-1 -right-1 flex gap-0.5 p-1 bg-blue-500 rounded-lg shadow-lg">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="w-1 h-1 bg-white rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, delay: 0.2 }} className="w-1 h-1 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm truncate tracking-tight text-white">{other.displayName}</h3>
                          {other.username && (
                            <span className="text-[11px] text-zinc-500 font-mono tracking-tight block truncate">
                              @{other.username}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDate(chat.updatedAt)}
                          </span>
                          {chat.unreadCount?.[auth.currentUser?.uid || ''] > 0 && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-colors duration-300", currentTheme.badgeBg, currentTheme.badgeText)}
                            >
                              {chat.unreadCount?.[auth.currentUser?.uid || ''] > 9 ? '9+' : chat.unreadCount?.[auth.currentUser?.uid || '']}
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <p className={cn(
                        "text-xs truncate mt-1 font-medium",
                        (chat.typing?.[otherId] || chat.unreadCount?.[auth.currentUser?.uid || ''] > 0) ? "text-blue-400 font-bold" : "text-zinc-400"
                      )}>
                        {chat.typing?.[otherId] ? "typing..." : chat.lastMessage}
                      </p>
                    </div>

                    {chat.isEphemeral && (
                      <ShieldAlert className="w-4 h-4 text-orange-400/70" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {!isSearching && chats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4 rounded-3xl bg-zinc-900/30 border border-white/5 backdrop-blur-xl">
            <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shadow-inner">
              <MessageSquare className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="space-y-1.5 max-w-xs">
              <p className="font-bold text-sm text-white">No chats yet!</p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Pick someone from the suggested people above or search by their username to start a private encrypted conversation.
              </p>
            </div>
            <button
              onClick={() => setIsSearching(true)}
              className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer shadow-lg"
            >
              Find People to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

