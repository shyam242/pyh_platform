"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Briefcase, Users, Star, CalendarCheck, PauseCircle,
  Search, Sparkles, BarChart2, User, ShieldCheck, Bell, ChevronDown,
  LogOut, Clock, UploadCloud,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api";

export const O = "#E87722";
export const O_LITE = "#FFF3E8";
export const O_MID = "#FBBF7A";
export const BORDER = "#EBEBEB";

const NAV_ITEMS = [
  { key: "dashboard",    label: "Dashboard",           icon: LayoutDashboard, href: "/recruiter" },
  { key: "candidates",   label: "Candidates",           icon: Users,           href: "/recruiter/candidates" },
  { key: "shortlisted",  label: "Shortlisted",          icon: Star,            href: "/recruiter/shortlisted" },
  { key: "interviews",   label: "Interviews Scheduled", icon: CalendarCheck,   href: "/recruiter/interviews" },
  { key: "onhold",       label: "On Hold",              icon: PauseCircle,     href: "/recruiter/on-hold" },
  { key: "projects",     label: "Search by Project",    icon: Search,          href: "/recruiter/search-by-project" },
  { key: "jdmatch",      label: "JD → CV Match",        icon: Sparkles,        href: "/jd-match", badge: "AI" },
  { key: "expcheck",     label: "Experience Check",     icon: ShieldCheck,     href: "/fake-experience-check", badge: "AI" },
  { key: "reports",      label: "Reports",              icon: BarChart2,       href: "/candidate-reports" },
  { key: "profile",      label: "My Profile",           icon: User,            href: "/profile" },
];

const getInitials = name =>
  !name ? "R" : name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 6px", borderRadius: 999, border: `1px solid ${BORDER}`, backgroundColor: "#fff", cursor: "pointer", fontFamily: "inherit" }}
      >
        <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: O, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {getInitials(user?.name)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{user?.name?.split(" ")[0] || "Recruiter"}</span>
        <ChevronDown size={14} color="#94a3b8" />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200, backgroundColor: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 50 }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{user?.name || "Recruiter"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{user?.email || ""}</div>
          </div>
          <div onClick={() => router.push("/profile")} style={{ padding: "10px 14px", fontSize: 13, color: "#334155", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <User size={14} /> My Profile
          </div>
          <div
            onClick={() => { localStorage.removeItem("token"); window.location.href = "/signin"; }}
            style={{ padding: "10px 14px", fontSize: 13, color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderTop: `1px solid ${BORDER}` }}
          >
            <LogOut size={14} /> Log out
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecruiterSidebarLayout({ active, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/signin"; return; }

    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/profile/user`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setUser(await r.json());
      } catch {}
      try {
        const r = await fetch(`${API_BASE_URL}/api/recruiter/approval-status`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        setIsApproved(!!d.is_recruiter_approved);
      } catch { setIsApproved(false); }
      try {
        const r = await fetch(`${API_BASE_URL}/api/recruiter/candidate-statuses`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        const last24h = (d.statuses || []).filter(s => Date.now() - new Date(s.updated_at).getTime() < 24 * 60 * 60 * 1000);
        setNotifCount(last24h.length);
      } catch {}
    })();
  }, []);

  const activeKey = active || NAV_ITEMS
    .filter(n => pathname === n.href || pathname?.startsWith(n.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.key;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F6FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 240, flexShrink: 0, backgroundColor: "#fff", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", color: "#0f172a" }}>
            PICK<span style={{ color: O }}>YOUR</span>HIRE
          </span>
        </div>

        <nav style={{ flex: 1, padding: "14px 12px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.key === activeKey;
            return (
              <div
                key={item.key}
                onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  padding: "10px 12px", borderRadius: 9, marginBottom: 3, cursor: "pointer",
                  backgroundColor: isActive ? O_LITE : "transparent",
                  borderLeft: `3px solid ${isActive ? O : "transparent"}`,
                  color: isActive ? O : "#475569",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13.5,
                  transition: "background-color 0.12s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "#F8FAFC"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <item.icon size={16} color={isActive ? O : "#94a3b8"} />
                  {item.label}
                </div>
                {item.badge && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", backgroundColor: O, padding: "1.5px 6px", borderRadius: 999 }}>{item.badge}</span>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ margin: 14, padding: "16px 16px", borderRadius: 14, background: `linear-gradient(160deg, ${O_LITE}, #fff)`, border: `1px solid ${O_MID}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "#7A3600", marginBottom: 6 }}>
            <Sparkles size={13} /> AI-Powered Hiring
          </div>
          <p style={{ fontSize: 11.5, color: "#92400e", margin: "0 0 12px", lineHeight: 1.5 }}>
            Upload a JD and let our AI find the best matching candidates for you.
          </p>
          <button
            onClick={() => router.push("/jd-match")}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px 0", borderRadius: 9, backgroundColor: O, color: "#fff", border: "none", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <UploadCloud size={13} /> Upload JD
          </button>
        </div>

        <div style={{ padding: "12px 20px", fontSize: 10.5, color: "#94a3b8", borderTop: `1px solid ${BORDER}` }}>
          © {new Date().getFullYear()} PickYourHire<br />All rights reserved.
        </div>
      </aside>

      {/* ── MAIN COLUMN ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <div style={{ height: 60, flexShrink: 0, backgroundColor: "#fff", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, padding: "0 28px", position: "sticky", top: 0, zIndex: 40 }}>
          <div style={{ position: "relative", cursor: "pointer" }}>
            <Bell size={19} color="#475569" />
            {notifCount > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, minWidth: 15, height: 15, borderRadius: 999, backgroundColor: O, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </div>
          <UserMenu user={user} />
        </div>

        <div style={{ padding: "32px 40px 56px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
          {isApproved === false && (
            <div style={{ backgroundColor: "#FFF7ED", border: `1.5px solid ${O_MID}`, borderLeft: `4px solid ${O}`, borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Clock size={20} color={O} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#C2410C", marginBottom: 4 }}>Awaiting admin approval</div>
                <div style={{ fontSize: 13, color: "#92400e" }}>Your recruiter profile is under review. You'll get an email once approved, with full access to candidate data.</div>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
