import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Bell, Palette, UserX, 
  HelpCircle, Trash2, Mail, Instagram,
  Check, Volume2, VolumeX, Eye, EyeOff, Sparkles,
  Fingerprint, Copy, CheckCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES, Theme } from '../lib/themes';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  currentTheme: Theme;
  onLogout: () => void;
  blockedUsers: any[];
  onUnblockUser: (uid: string) => Promise<void>;
}

type SettingsSectionId = 'privacy' | 'appearance' | 'notifications' | 'blocked' | 'support';

export default function SettingsModal({
  isOpen,
  onClose,
  profile,
  currentTheme,
  onLogout,
  blockedUsers,
  onUnblockUser
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('privacy');
  const [ghostMode, setGhostMode] = useState(profile?.ghostMode || false);
  const [autoPurge, setAutoPurge] = useState(profile?.autoPurge || false);
  const [soundEnabled, setSoundEnabled] = useState(profile?.soundEnabled !== false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleGhostMode = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const next = !ghostMode;
      await updateDoc(userRef, { ghostMode: next });
      setGhostMode(next);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + auth.currentUser!.uid);
    } finally {
      setLoading(false);
    }
  };

  const toggleSound = async () => {
    try {
      const next = !soundEnabled;
      setSoundEnabled(next);
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, { soundEnabled: next });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + auth.currentUser!.uid);
    }
  };

  const toggleAutoPurge = async () => {
    try {
      const next = !autoPurge;
      setAutoPurge(next);
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      await updateDoc(userRef, { autoPurge: next });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + auth.currentUser!.uid);
    }
  };

  const sections = [
    { id: 'privacy' as const, label: 'Privacy', icon: Eye, badge: ghostMode ? 'Incognito' : 'Public' },
    { id: 'appearance' as const, label: 'Themes & Look', icon: Palette, badge: currentTheme.name.split(' ')[0] },
    { id: 'notifications' as const, label: 'Sounds', icon: soundEnabled ? Volume2 : VolumeX },
    { id: 'blocked' as const, label: 'Blocked Users', icon: UserX, count: blockedUsers.length },
    { id: 'support' as const, label: 'Help & Contact', icon: HelpCircle }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg h-[85vh] max-h-[660px] rounded-3xl bg-zinc-950/90 border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
                <Shield className="w-4 h-4 text-zinc-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">App Settings</h2>
                <p className="text-[11px] text-zinc-400">Manage privacy, sounds and your app theme</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Navigation Pills */}
          <div className="px-4 py-3 border-b border-white/10 bg-black/40 overflow-x-auto no-scrollbar flex gap-2">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all flex-shrink-0 cursor-pointer",
                    isActive 
                      ? "bg-white text-black shadow-lg shadow-white/10 font-bold" 
                      : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-white/5"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                  {sec.badge && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded-md font-mono uppercase tracking-wider",
                      isActive ? "bg-black/10 text-black font-bold" : "bg-zinc-800 text-zinc-400"
                    )}>
                      {sec.badge}
                    </span>
                  )}
                  {typeof sec.count === 'number' && sec.count > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-bold">
                      {sec.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-Section Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* SECTION: PRIVACY */}
            {activeSection === 'privacy' && (
              <div className="space-y-4">
                {/* Ghost Mode Toggle */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                        ghostMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {ghostMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          Ghost Mode
                          {ghostMode && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                              ON
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {ghostMode ? "You are completely invisible to others" : "Others can see when you are online"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={toggleGhostMode}
                      disabled={loading}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none border-2 cursor-pointer",
                        ghostMode ? "bg-blue-600 border-blue-400" : "bg-zinc-800 border-zinc-700"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-md",
                        ghostMode ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-400 bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                    <p className="font-semibold text-zinc-300">What happens when Ghost Mode is ON?</p>
                    <p className="text-[11px] leading-relaxed">
                      • Your online status is hidden (no green dot).<br />
                      • Blue seen tick receipts are turned off.<br />
                      • You can read messages without the other person knowing.
                    </p>
                  </div>
                </div>

                {/* Auto-Purge Messages */}
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                        autoPurge ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-zinc-800 text-zinc-400"
                      )}>
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          Auto-Clear Messages
                          {autoPurge && (
                            <span className="text-[9px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full font-bold border border-red-500/30">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {autoPurge ? "Chats clear automatically on refresh" : "Chats stay saved on this device"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={toggleAutoPurge}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none border-2 cursor-pointer",
                        autoPurge ? "bg-red-600 border-red-400" : "bg-zinc-800 border-zinc-700"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-md",
                        autoPurge ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Turn this ON if you don't want any chat history left behind when you close or reload the browser.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION: APPEARANCE & THEMES */}
            {activeSection === 'appearance' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-zinc-400 px-1">
                  Choose your theme:
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.values(THEMES).map((t) => {
                    const isActive = currentTheme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={async () => {
                          localStorage.setItem('ghostchat_theme', t.id);
                          try {
                            const userRef = doc(db, 'users', auth.currentUser!.uid);
                            await updateDoc(userRef, { theme: t.id });
                          } catch (err) {
                            console.warn("Could not sync theme:", err);
                          }
                        }}
                        className={cn(
                          "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
                          isActive
                            ? "bg-zinc-900 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                            : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 p-2 bg-black/60 rounded-xl border border-white/10">
                            <span className={cn("w-3.5 h-3.5 rounded-md", 
                              t.id === 'ghostwire' ? 'bg-rose-500' :
                              t.id === 'override' ? 'bg-red-500' :
                              t.id === 'monochrome' ? 'bg-white' :
                              t.id === 'spectre' ? 'bg-emerald-400' : 'bg-purple-500'
                            )} />
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-2">
                              {t.name}
                              {isActive && (
                                <span className="text-[9px] bg-white text-black font-black px-2 py-0.2 rounded-full uppercase">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{t.desc}</div>
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-white mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION: SOUNDS & NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                        soundEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold">Message Sound Effects</div>
                        <div className="text-[11px] text-zinc-400">
                          {soundEnabled ? "Plays a chime for new messages" : "Silent (no sounds)"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={toggleSound}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none border-2 cursor-pointer",
                        soundEnabled ? "bg-emerald-600 border-emerald-400" : "bg-zinc-800 border-zinc-700"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow-md",
                        soundEnabled ? "translate-x-6" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Play a sound tone whenever a friend sends you a message or photo.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION: BLOCKED USERS */}
            {activeSection === 'blocked' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-zinc-400 px-1">
                  Blocked Users ({blockedUsers.length})
                </div>
                {blockedUsers.length > 0 ? (
                  blockedUsers.map((u) => (
                    <div 
                      key={u.uid} 
                      className="flex items-center justify-between p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserX className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{u.displayName || 'User'}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">@{u.username || 'anon'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => onUnblockUser(u.uid)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white hover:text-black text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-zinc-400 text-xs">
                    You haven't blocked anyone yet.
                  </div>
                )}
              </div>
            )}

            {/* SECTION: HELP & CONTACT */}
            {activeSection === 'support' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Need Help or Found a Bug?</div>
                      <div className="text-[11px] text-zinc-400">Reach out directly to the creator</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <a
                      href="mailto:senpaironzai@gmail.com"
                      className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-white/30 flex flex-col items-center justify-center gap-2 text-center transition-all group"
                    >
                      <Mail className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                      <span className="text-[11px] font-bold text-zinc-200">Email Support</span>
                    </a>
                    <a
                      href="https://www.instagram.com/ghost_wire.support?stkn=ZmhlOWtpZGZreTVz"
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-pink-500/50 flex flex-col items-center justify-center gap-2 text-center transition-all group"
                    >
                      <Instagram className="w-5 h-5 text-zinc-400 group-hover:text-pink-400" />
                      <span className="text-[11px] font-bold text-zinc-200">Instagram</span>
                    </a>
                  </div>
                </div>

                {/* Simple Account info */}
                <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/10 flex items-center justify-between text-xs">
                  <div className="text-zinc-400">Your User ID:</div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-300">
                    <span className="truncate max-w-[150px]">{auth.currentUser?.uid}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(auth.currentUser?.uid || '');
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="text-zinc-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedKey ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/10 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-between">
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-600 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Sign Out
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
