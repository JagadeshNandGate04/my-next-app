'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../store/store';
import {
  changePassword,
  clearPasswordMessages,
  performLogout,
} from '../store/auth/authSlice';

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: 'home' },
  { name: 'Requests', href: '/requests', icon: 'message' },
  { name: 'Attendance', href: '/attendance', icon: 'attendance' },
  { name: 'Employees', href: '/employees', icon: 'profile' },
  { name: 'Payroll', href: '/payroll', icon: 'payroll' },
  { name: 'Audit Log', href: '/audit', icon: 'audit' },
  { name: 'Settings', href: '/settings', icon: 'settings' },
];

// Dashboard theme colours
const SKY = '#7BBDE8';
const SKY_LIGHT = '#bfe0f5';
const BLUE = '#1b64da';

function NavIcon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
        </svg>
      );
    case 'message':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M21 3 3 10.5l7.2 2.3L12.5 20 21 3Z" />
          <path d="m10.2 12.8 4.5-4.5" />
        </svg>
      );
    case 'attendance':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="10.5" cy="10.5" r="7.5" />
          <path d="m16 16 5 5" />
          <path d="M10.5 7v4l2.5 1.5" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2.5 21a6.5 6.5 0 0 1 13 0" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'payroll':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );
    case 'audit':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <path d="M8 3h8l4 4v14H4V3h4Z" />
          <path d="M8 11h8M8 15h8M8 7h3" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" className={className} {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.1 1.9-2 3.4-2.2-.5a8 8 0 0 1-2 .8L13.5 23h-3l-.9-2.3a8 8 0 0 1-2-.8l-2.2.5-2-3.4 1.1-1.9a8 8 0 0 1 0-2.4l-1.1-1.9 2-3.4 2.2.5a8 8 0 0 1 2-.8L10.5 5h3l.9 2.3a8 8 0 0 1 2 .8l2.2-.5 2 3.4-1.1 1.9a8 8 0 0 1-.1 2.1Z" />
        </svg>
      );
    default:
      return null;
  }
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  show,
  onToggle,
  showLabel,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggle?: () => void;
  showLabel?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          disabled={disabled}
          className={`w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-[#7BBDE8] focus:ring-2 focus:ring-[#7BBDE8]/30 disabled:bg-slate-50 ${
            onToggle ? 'pr-11' : ''
          }`}
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={`${show ? 'Hide' : 'Show'} ${showLabel}`}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
    </label>
  );
}

export default function TopNavBar({
  notificationCount = 0,
  userName = 'Admin',
}: {
  notificationCount?: number;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { changingPassword, passwordError, passwordSuccess } = useSelector(
    (state: RootState) => state.auth
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordValidationError, setPasswordValidationError] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href ||
    (href === '/dashboard' && pathname === '/') ||
    (href !== '/dashboard' && pathname.startsWith(`${href}/`));

  useEffect(() => {
    if (!profileOpen && !passwordOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        if (!changingPassword) setPasswordOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [changingPassword, passwordOpen, profileOpen]);

  const openPasswordModal = () => {
    setProfileOpen(false);
    setPasswordValidationError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    dispatch(clearPasswordMessages());
    setPasswordOpen(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;
    setPasswordOpen(false);
    setPasswordValidationError('');
    dispatch(clearPasswordMessages());
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordValidationError('');

    if (newPassword !== confirmPassword) {
      setPasswordValidationError('The new passwords do not match.');
      return;
    }

    try {
      await dispatch(
        changePassword({ old_password: currentPassword, new_password: newPassword })
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // The auth slice exposes the error message for this dialog.
    }
  };

  const handleLogout = () => {
    dispatch(performLogout());
    setProfileOpen(false);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#f0f6fa] shadow-sm">
      {/* Decorative diagonal background strips */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-32 top-16 h-20 w-[550px] rotate-[-45deg] rounded-full border-2 border-white/80"
          style={{ backgroundColor: SKY_LIGHT, opacity: 0.65 }}
        />
        <div
          className="absolute left-[22%] -top-28 h-20 w-[600px] rotate-[-45deg] rounded-full border-2 border-white/80"
          style={{ backgroundColor: SKY, opacity: 0.5 }}
        />
        <div
          className="absolute left-[55%] top-36 h-20 w-[600px] rotate-[-45deg] rounded-full border-2 border-white/80"
          style={{ backgroundColor: BLUE, opacity: 0.12 }}
        />
        <div
          className="absolute -right-40 -top-12 h-20 w-[600px] rotate-[-45deg] rounded-full border-2 border-white/80"
          style={{ backgroundColor: SKY_LIGHT, opacity: 0.8 }}
        />
        <div
          className="absolute -bottom-36 left-[35%] h-20 w-[600px] rotate-[-45deg] rounded-full border-2 border-white/80"
          style={{ backgroundColor: SKY, opacity: 0.35 }}
        />
      </div>

      {/* Navbar content */}
      <div className="relative z-10 mx-auto flex min-h-[76px] w-full max-w-[1440px] items-center justify-between gap-2 px-3 py-3 sm:min-h-[104px] sm:gap-5 sm:px-5 sm:py-5 lg:px-10">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex min-w-0 shrink items-center rounded-2xl border border-white bg-white px-2.5 py-2 shadow-sm sm:shrink-0 sm:px-3"
          aria-label="Nandgate IT home"
        >
          <Image
            src="/logo.png"
            alt="Nandgate IT Logo"
            width={160}
            height={36}
            className="h-7 w-auto max-w-[120px] object-contain object-left sm:h-9 sm:max-w-none"
            priority
          />
        </Link>

        {/* Desktop navigation — FIXED: items never shrink out of the pill.
            Inactive items show icon only until 2xl; active item always shows its label. */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-between gap-1 rounded-full border border-[#dcebf7] bg-white/95 px-2 py-2 shadow-sm xl:mx-4 xl:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                aria-label={item.name}
                aria-current={active ? 'page' : undefined}
                className={`group flex shrink-0 items-center gap-2 rounded-full py-2 text-[12px] font-semibold transition-all duration-300 2xl:px-3 ${
                  active
                    ? 'pl-2 pr-4 text-white shadow-md'
                    : 'px-2 text-slate-500 hover:bg-[#f0f6fa] hover:text-slate-900'
                }`}
                style={active ? { backgroundColor: BLUE } : undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-[#1b64da] group-hover:bg-[#bfe0f5]'
                  }`}
                >
                  <NavIcon type={item.icon} />
                </span>

                <span className={`whitespace-nowrap ${active ? '' : 'hidden 2xl:inline'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {/* Notifications */}
          <Link
            href="/requests"
            aria-label="Pending requests"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#dcebf7] bg-white text-[#1b64da] shadow-sm transition-all hover:bg-[#bfe0f5] sm:h-11 sm:w-11"
          >
            <BellIcon />
            {notificationCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: BLUE }}
              >
                {notificationCount}
              </span>
            )}
          </Link>

          {/* Account menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full border border-[#dcebf7] bg-white py-1 pl-2 pr-1 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9bcbed] hover:shadow-md sm:pl-3 sm:pr-1.5"
            >
              <span className="hidden text-sm font-semibold text-slate-700 sm:inline">
                {userName}
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#0f172a] sm:h-9 sm:w-9"
                style={{ backgroundColor: SKY }}
              >
                {userName.charAt(0).toUpperCase()}
              </span>
              <ChevronDown
                className={`mr-1 h-4 w-4 text-slate-500 transition-transform duration-200 ${
                  profileOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="account-menu-enter absolute right-0 top-full z-[60] mt-3 w-60 overflow-hidden rounded-2xl border border-[#dcebf7] bg-white p-2 shadow-xl"
              >
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-sm font-bold text-slate-800">{userName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Account settings</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openPasswordModal}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-[#f0f6fa] hover:text-[#1b64da]"
                >
                  <KeyRound className="h-4 w-4 text-[#1b64da]" />
                  Change password
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dcebf7] bg-white text-[#1b64da] shadow-sm transition-colors hover:bg-[#bfe0f5] sm:h-11 sm:w-11 xl:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav
          className="relative z-20 mx-3 mb-3 grid grid-cols-2 gap-2 rounded-3xl border border-[#dcebf7] bg-white p-3 shadow-lg sm:mx-5 sm:mb-5 xl:hidden"
          aria-label="Mobile navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-[#f0f6fa]'
                }`}
                style={active ? { backgroundColor: BLUE } : undefined}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    active ? 'bg-white/20 text-white' : 'text-[#1b64da]'
                  }`}
                  style={!active ? { backgroundColor: SKY_LIGHT } : undefined}
                >
                  <NavIcon type={item.icon} />
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Change password dialog */}
      {passwordOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePasswordModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="account-dialog-enter w-full max-w-md overflow-hidden rounded-3xl border border-[#dcebf7] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#e7f0f7] bg-[#f0f6fa] px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#bfe0f5] text-[#1b64da]">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="change-password-title" className="text-lg font-bold text-slate-900">
                    Change password
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Set a new password for your account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={changingPassword}
                aria-label="Close change password dialog"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 p-6">
              {passwordError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordValidationError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{passwordValidationError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <PasswordField
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={changingPassword}
                show={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((s) => !s)}
                showLabel="current password"
              />
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={8}
                disabled={changingPassword}
                show={showNewPassword}
                onToggle={() => setShowNewPassword((s) => !s)}
                showLabel="new password"
              />
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                minLength={8}
                disabled={changingPassword}
                show={showNewPassword}
              />

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-60"
                  style={{ backgroundColor: BLUE }}
                >
                  {changingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </header>
  );
}