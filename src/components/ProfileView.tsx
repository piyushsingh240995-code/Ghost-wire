import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  User, Shield, Ghost, Settings, Camera, Check, 
  Lock, Eye, EyeOff, Sparkles, LogOut, 
  Copy, CheckCheck, ChevronRight, Palette,
  Fingerprint, MessageSquare, Flame, BellRing, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { getTheme } from '../lib/themes';
import { optimizeAvatarImage } from '../lib/imageOptimizer';
import SettingsModal from './SettingsModal';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=Savage'
];

export default function ProfileView({ 
  profile, 
  onLogout,
}: { 
  profile: any; 
  onLogout: () => void; 
  updatePasswordFunc?: (pass: string) => Promise<void>; 
}) {
  const currentTheme = getTheme(profile?.theme || localStorage.getItem('ghostchat_theme') || 'ghostwire');
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.blockedUsers || profile.blockedUsers.length === 0) {
      setBlockedUsers([]);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('uid', 'in', profile.blockedUsers)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setBlockedUsers(snap.docs.map(d => d.data()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blocked_users');
    });

    return () => unsubscribe();
  }, [profile?.blockedUsers]);

  useEffect(() => {
    const changed = 
      username !== profile?.username || 
      displayName !== profile?.displayName || 
      photoURL !== profile?.photoURL;
    setHasChanges(changed);
  }, [username, displayName, photoURL, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const optimizedUrl = await optimizeAvatarImage(file, 400);
      setPhotoURL(optimizedUrl);
      setHasChanges(true);
    } catch (err: any) {
      console.error("Avatar optimization error:", err);
      alert("Failed to process image. Please try another photo.");
    }
  };

  const saveProfile = async () => {
    if (!hasChanges || !auth.currentUser) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { 
        username: username.toLowerCase().replace(/\s+/g, '_'), 
        displayName, 
        photoURL 
      });
      setHasChanges(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + auth.currentUser.uid);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (uid: string) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const currentBlocked = profile?.blockedUsers || [];
      const newBlocked = currentBlocked.filter((id: string) => id !== uid);
      await updateDoc(userRef, { blockedUsers: newBlocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + auth.currentUser.uid);
    }
  };

  return (
    <div className={cn("h-full overflow-y-auto px-4 py-6 space-y-6 pb-28 transition-colors duration-300 relative", currentTheme.bgMain, currentTheme.textMain)}>
      {/* Background Ambient Glows for Glassmorphism Depth */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-4 w-48 h-48 bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Profile Card with Glassmorphism */}
      <section className="relative rounded-3xl p-6 bg-zinc-900/40 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Subtle top light gradient */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar Area */}
          <div className="relative group">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-3xl bg-zinc-900/80 border-2 border-white/15 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 cursor-pointer shadow-xl relative"
            >
              {photoURL ? (
                <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-10 h-10 text-zinc-500" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-xs">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />

            {/* Quick Change Avatar Trigger */}
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-zinc-900 border border-white/20 text-zinc-300 hover:text-white hover:bg-zinc-800 shadow-lg transition-transform active:scale-90 cursor-pointer"
              title="Pick an avatar"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          {/* Preset Avatars Drawer */}
          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-wrap justify-center gap-2.5 pt-2"
              >
                {AVATARS.map((url) => (
                  <button 
                    key={url}
                    onClick={() => { setPhotoURL(url); setShowAvatarPicker(false); }}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all p-1 bg-zinc-900/90 cursor-pointer",
                      photoURL === url ? "border-white" : "border-white/10 hover:border-white/40"
                    )}
                  >
                    <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editable Display Name and Handle */}
          <div className="w-full max-w-xs space-y-1.5">
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-transparent border-none text-xl font-black text-center focus:outline-none placeholder:text-zinc-600 tracking-tight"
            />

            <div className="relative inline-flex items-center justify-center">
              <span className="text-zinc-500 text-xs font-mono select-none mr-0.5">@</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="bg-transparent border-b border-white/10 hover:border-white/30 focus:border-white/60 text-xs font-mono font-medium focus:outline-none text-zinc-300 text-center py-0.5 transition-colors"
              />
            </div>
          </div>

          {/* Admin badge if applicable */}
          {profile?.isAdmin && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Shield className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Creator</span>
            </div>
          )}

          {/* Save Button */}
          <AnimatePresence>
            {hasChanges && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={saveProfile}
                disabled={loading}
                className="w-full max-w-xs py-2.5 bg-white text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Simple, Fun & Crystal Clear Status Cards (Normie-Friendly!) */}
      <section className="grid grid-cols-2 gap-3">
        {/* Simple Status Card 1: Online Status / Ghost */}
        <div 
          onClick={() => setIsSettingsOpen(true)}
          className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400">Online Status</span>
            <span className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              profile?.ghostMode 
                ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" 
                : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
            )} />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              {profile?.ghostMode ? (
                <>
                  <Ghost className="w-4 h-4 text-blue-400" />
                  <span>Ghost Mode</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Active & Online</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {profile?.ghostMode ? "Invisible to friends" : "Visible to friends"}
            </p>
          </div>
        </div>

        {/* Simple Status Card 2: Security & Encryption */}
        <div 
          onClick={() => setIsSettingsOpen(true)}
          className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 backdrop-blur-xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400">Chat Privacy</span>
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>100% Private</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Only you & recipient can read
            </p>
          </div>
        </div>
      </section>

      {/* Main Settings Launcher - Clean, Organized & Easy to understand */}
      <section className="rounded-3xl p-5 bg-zinc-900/40 border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" />
              Settings & Preferences
            </h3>
            <p className="text-[11px] text-zinc-400">Easily customize privacy, sounds and themes</p>
          </div>
        </div>

        {/* Primary Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-zinc-100 flex items-center gap-2">
                Open Settings
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-medium">
                  5 Categories
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Privacy, Dark Themes, Sounds & Blocked Users
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Fast Action Shortcuts */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 text-left transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Palette className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-zinc-200 truncate">App Theme</div>
              <div className="text-[10px] text-zinc-400 truncate">{currentTheme.name}</div>
            </div>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 text-left transition-all flex items-center gap-2.5 cursor-pointer"
          >
            <Ghost className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-zinc-200 truncate">Ghost Mode</div>
              <div className="text-[10px] text-zinc-400 truncate">{profile?.ghostMode ? "Turned ON" : "Turned OFF"}</div>
            </div>
          </button>
        </div>
      </section>

      {/* Your User ID / Share Card */}
      <section className="rounded-3xl p-5 bg-zinc-900/30 border border-white/10 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-300">Your Shareable ID</span>
          </div>
          <span className="text-[10px] text-zinc-500">Tap to copy</span>
        </div>
        
        <div 
          onClick={() => {
            navigator.clipboard.writeText(auth.currentUser?.uid || '');
            setCopiedUid(true);
            setTimeout(() => setCopiedUid(false), 2000);
          }}
          className="p-3 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between gap-3 font-mono text-[11px] cursor-pointer hover:border-white/20 transition-colors"
        >
          <span className="text-zinc-300 truncate flex-1">{auth.currentUser?.uid}</span>
          <button
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Copy ID"
          >
            {copiedUid ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </section>

      {/* Logout Action */}
      <section className="pt-2">
        <button
          onClick={onLogout}
          className="w-full py-3.5 rounded-2xl bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-red-600/40"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </section>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        currentTheme={currentTheme}
        onLogout={onLogout}
        blockedUsers={blockedUsers}
        onUnblockUser={unblockUser}
      />
    </div>
  );
}
