"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, Linkedin, Globe, Building2, Users, Calendar, Briefcase, Star, TrendingUp, FileText, Award, ChevronRight, ExternalLink, Edit3, X, Check, AlertCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#E2E8F0";
const initials = n => (n||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const avatarBg = name => {
  const c=[["#EFF6FF","#1d4ed8"],["#F3E8FF","#7c3aed"],["#DCFCE7","#15803d"],["#FFF7ED",O]];
  return c[(name||"").charCodeAt(0)%c.length];
};

const TABS = ["Overview","Jobs & JD Performance","Candidates","Documents","Activity Log","Notes"];

export default function RecruiterDetailPage() {
  const router = useRouter();
  const { recruiterId } = useParams();
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [jobs, setJobs] = useState([]);
  const [suspending, setSuspending] = useState(false);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  // Simulated stats (replace with real API when available)
  const stats = {
    jobsPosted: recruiter?.jobs_posted || 0,
    candidatesSubmitted: recruiter?.candidates_submitted || 0,
    shortlisted: recruiter?.shortlisted || 0,
    interviewed: recruiter?.interviewed || 0,
    offers: recruiter?.offers || 0,
    hires: recruiter?.hires || 0,
    successRate: recruiter?.success_rate || 0,
    resumesReceived: recruiter?.resumes_received || 0,
    successfullyParsed: recruiter?.successfully_parsed || 0,
    failedParsing: recruiter?.failed_parsing || 0,
    parsingRate: recruiter?.parsing_rate || 0,
    avgParseTime: recruiter?.avg_parse_time || "—",
    parserCredits: recruiter?.parser_credits || 0,
    recruiterId: recruiter?.recruiter_id || `REC-${String(recruiterId).padStart(4,"0")}`,
  };

  useEffect(() => { fetchRecruiter(); fetchJobs(); }, [recruiterId]);

  const fetchRecruiter = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/recruiter/${recruiterId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Not found");
      const d = await res.json();
      setRecruiter(d);
      // Load saved notes from localStorage
      const saved = localStorage.getItem(`recruiter_notes_${recruiterId}`);
      if (saved) setNotes(JSON.parse(saved));
    } catch (e) { showError(e.message); setTimeout(()=>router.back(),1200); }
    finally { setLoading(false); }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/admin/my-jobs`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      const d = await res.json();
      setJobs(Array.isArray(d) ? d.slice(0,5) : []);
    } catch {}
  };

  const handleSuspend = async () => {
    if (!confirm("Are you sure you want to suspend this recruiter?")) return;
    setSuspending(true);
    try {
      await fetch(`${API_BASE_URL}/api/admin/recruiters/${recruiterId}/reject`, { method:"PUT", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } });
      showSuccess("Recruiter suspended"); router.push("/admin");
    } catch { showError("Failed to suspend"); setSuspending(false); }
  };

  const addNote = () => {
    if (!note.trim()) return;
    const newNote = { text: note, time: new Date().toLocaleString(), author: "Admin" };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`recruiter_notes_${recruiterId}`, JSON.stringify(updated));
    setNote("");
    showSuccess("Note added");
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, border:`3px solid ${O}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
        <p style={{ color:"#64748b", fontWeight:600 }}>Loading recruiter profile…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
  if (!recruiter) return <div style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>Recruiter not found</div>;

  const [abg, afg] = avatarBg(recruiter.name);

  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#0f172a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── STICKY NAV ──────────────────────────────────── */}
      <nav style={{ position:"sticky", top:0, zIndex:200, backgroundColor:"#fff", borderBottom:`1.5px solid ${BORDER}`, padding:"0 40px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
        <button onClick={()=>router.back()}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", fontSize:13, color:"#475569", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#475569";}}>
          <ArrowLeft size={14}/> Back to Approved Recruiters
        </button>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleSuspend} disabled={suspending}
            style={{ padding:"8px 18px", backgroundColor:"#fef2f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:9, fontSize:13, fontWeight:700, cursor:suspending?"not-allowed":"pointer", fontFamily:"inherit" }}>
            {suspending ? "Suspending…" : "Suspend Recruiter"}
          </button>
          <button style={{ padding:"8px 18px", backgroundColor:"#fff", color:"#374151", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            <Edit3 size={13}/> Edit Recruiter
          </button>
          <button style={{ padding:"8px 14px", backgroundColor:"#fff", color:"#374151", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>⋯ More</button>
        </div>
      </nav>

      <div style={{ maxWidth:1240, margin:"0 auto", padding:"28px 40px 64px" }}>

        {/* ── PROFILE HERO ────────────────────────────────── */}
        <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"28px 32px", marginBottom:24 }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:24, alignItems:"flex-start" }}>
            {/* Avatar */}
            <div style={{ width:80, height:80, borderRadius:18, backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:700, border:`2px solid ${BORDER}`, flexShrink:0 }}>
              {initials(recruiter.name)}
            </div>

            {/* Basic info */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6, flexWrap:"wrap" }}>
                <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{recruiter.name}</h1>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:999, backgroundColor:"#DCFCE7", color:"#15803d", border:"1px solid #86efac" }}>● Approved</span>
              </div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>
                <span style={{ fontWeight:600, color:"#374151" }}>{recruiter.company_name||recruiter.company||"Independent Recruiter"}</span>
                {recruiter.company_name && <span> · Recruiter at {recruiter.company_name}</span>}
              </div>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {recruiter.email && (
                  <a href={`mailto:${recruiter.email}`} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#64748b", textDecoration:"none" }}>
                    <Mail size={13} color={O}/> {recruiter.email}
                  </a>
                )}
                {recruiter.phone && (
                  <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#64748b" }}>
                    <Phone size={13} color={O}/> {recruiter.phone}
                  </span>
                )}
                {recruiter.linkedin && (
                  <a href={recruiter.linkedin} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#1d4ed8", textDecoration:"none" }}>
                    <Linkedin size={13}/> LinkedIn Profile
                  </a>
                )}
              </div>
            </div>

            {/* Company card */}
            <div style={{ backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"18px 22px", minWidth:220 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:44, height:32, borderRadius:8, backgroundColor:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#1d4ed8", letterSpacing:"0.05em" }}>
                  {(recruiter.company_name||recruiter.company||"CO").split(" ").map(w=>w[0]).slice(0,3).join("").toUpperCase()}
                </div>
                <div style={{ fontSize:13, fontWeight:700 }}>{recruiter.company_name||recruiter.company||"—"}</div>
              </div>
              {[
                ["Industry", recruiter.industry || "Information Technology"],
                ["Company Size", recruiter.company_size || "—"],
                ["Company Site", recruiter.company_website],
                ["Headquarters", recruiter.headquarters || recruiter.current_location || "—"],
              ].map(([l,v])=>v&&(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${BORDER}` }}>
                  <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600 }}>{l}</span>
                  {l==="Company Site" ? (
                    <a href={v.startsWith("http")?v:`https://${v}`} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#1d4ed8", fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:3 }}>{v} <ExternalLink size={9}/></a>
                  ) : (
                    <span style={{ fontSize:11, color:"#374151", fontWeight:600 }}>{v}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Meta pills */}
          <div style={{ display:"flex", gap:12, marginTop:18, paddingTop:18, borderTop:`1.5px solid ${BORDER}`, flexWrap:"wrap" }}>
            {[
              ["Registered On", fmtDate(recruiter.created_at)],
              ["Approved On", fmtDate(recruiter.recruiter_approved_at)],
              ["Approved By", "Admin"],
              ["Status", "Active"],
              ["Partner Since", fmtDate(recruiter.recruiter_approved_at)],
              ["Recruiter ID", stats.recruiterId],
            ].map(([l,v])=>(
              <div key={l} style={{ backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:10, padding:"10px 16px", minWidth:130 }}>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{v||"—"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS ROW ──────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:12, marginBottom:24 }}>
          {[
            { icon:"💼", label:"Jobs Posted", value:stats.jobsPosted, sub:"Total Jobs", color:"#1d4ed8" },
            { icon:"👥", label:"Candidates Submitted", value:stats.candidatesSubmitted, sub:"Total Candidates", color:"#7c3aed" },
            { icon:"⭐", label:"Shortlisted", value:stats.shortlisted, sub:"% of submitted", color:"#d97706" },
            { icon:"🗣️", label:"Interviewed", value:stats.interviewed, sub:"% of submitted", color:"#059669" },
            { icon:"📋", label:"Offers", value:stats.offers, sub:"% of submitted", color:O },
            { icon:"✅", label:"Hires", value:stats.hires, sub:"", color:"#15803d" },
            { icon:"📈", label:"Success Rate", value:`${stats.successRate}%`, sub:"from Offer", isHighlight:true, color:"#7c3aed" },
          ].map(s=>(
            <div key={s.label} style={{ backgroundColor:"#fff", border:`1.5px solid ${s.isHighlight?s.color:BORDER}`, borderRadius:12, padding:"14px 12px", textAlign:"center", boxShadow:s.isHighlight?`0 2px 12px ${s.color}22`:"none" }}>
              <div style={{ fontSize:18, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#0f172a", marginBottom:2 }}>{s.label}</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ──────────────────────────────────────── */}
        <div style={{ display:"flex", gap:0, borderBottom:`1.5px solid ${BORDER}`, marginBottom:24, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"12px 20px", border:"none", borderBottom:`2.5px solid ${tab===t?O:"transparent"}`, backgroundColor:"transparent", color:tab===t?O:"#64748b", fontSize:13, fontWeight:tab===t?700:500, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all 0.15s" }}>
              {t}
              {t==="Notes" && notes.length>0 && <span style={{ marginLeft:6, fontSize:10, backgroundColor:O, color:"#fff", padding:"1px 6px", borderRadius:999 }}>{notes.length}</span>}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                  */}
        {/* ══════════════════════════════════════════════ */}
        {tab==="Overview" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Recent Jobs Posted */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Recent Jobs Posted</span>
                <button style={{ fontSize:12, color:O, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View all jobs →</button>
              </div>
              {jobs.length===0 ? (
                <div style={{ padding:"32px", textAlign:"center", color:"#94a3b8", fontSize:13 }}>No jobs posted yet</div>
              ) : (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 1fr 1fr", gap:8, padding:"9px 20px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:10, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                    <span>Job Title</span><span>Job ID</span><span>Location</span><span>Posted On</span><span>Status</span>
                  </div>
                  {jobs.map((j,i)=>(
                    <div key={j.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.2fr 1fr 1fr", gap:8, padding:"12px 20px", borderBottom:i<jobs.length-1?`1px solid ${BORDER}`:"none", alignItems:"center" }}
                      onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FAFBFC"}
                      onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{j.job_title||"—"}</span>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>JOB-{String(j.id).padStart(4,"0")}</span>
                      <span style={{ fontSize:12, color:"#475569" }}>{j.location||"Remote"}</span>
                      <span style={{ fontSize:11, color:"#94a3b8" }}>{j.created_at?new Date(j.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999, backgroundColor:j.status==="active"?"#DCFCE7":"#F8FAFC", color:j.status==="active"?"#15803d":"#64748b", border:`1px solid ${j.status==="active"?"#86efac":BORDER}` }}>{j.status||"Active"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resume Parser Usage */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
              <div style={{ padding:"16px 20px", borderBottom:`1.5px solid ${BORDER}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Resume Parser Usage (Overall)</span>
                <button style={{ fontSize:12, color:O, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View detailed →</button>
              </div>
              <div style={{ padding:"20px" }}>
                {[
                  { label:"Resumes Received", value:stats.resumesReceived, icon:"📥", color:"#374151" },
                  { label:"Successfully Parsed", value:stats.successfullyParsed, icon:"✅", color:"#15803d" },
                  { label:"Failed Parsing", value:stats.failedParsing, icon:"❌", color:"#dc2626" },
                  { label:"Parsing Success Rate", value:`${stats.parsingRate}%`, icon:"📊", color:"#7c3aed", highlight:true },
                  { label:"Avg. Parsing Time", value:stats.avgParseTime, icon:"⏱️", color:"#d97706" },
                  { label:"Parser Credits Used", value:stats.parserCredits, icon:"🎯", color:O },
                ].map(s=>(
                  <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${BORDER}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15 }}>{s.icon}</span>
                      <span style={{ fontSize:13, color:"#475569" }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recruiter Timeline */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Recruiter Timeline</span>
                <button style={{ fontSize:12, color:O, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View full →</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { icon:"📝", text:"Registration Submitted", sub:"Profile created and documents submitted", time:fmtDate(recruiter.created_at), color:"#EFF6FF", fg:"#1d4ed8" },
                  { icon:"✅", text:"Recruiter Approved", sub:"Account verified and access granted", time:fmtDate(recruiter.recruiter_approved_at), color:"#DCFCE7", fg:"#15803d" },
                  { icon:"💼", text:"First Job Posted", sub:"Started recruiting on the platform", time:"—", color:"#FFF7ED", fg:O },
                  { icon:"🎯", text:"Active Recruiter", sub:"Regularly submitting candidates", time:"Ongoing", color:"#F3E8FF", fg:"#7c3aed" },
                ].map((e,i)=>(
                  <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:34, height:34, borderRadius:"50%", backgroundColor:e.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{e.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{e.text}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{e.sub}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>{e.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <span style={{ fontWeight:700, fontSize:14 }}>Recent Activity</span>
                <button style={{ fontSize:12, color:O, fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View all →</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { icon:"💼", text:"Recruiter account created", time:fmtDate(recruiter.created_at), color:"#EFF6FF", fg:"#1d4ed8" },
                  { icon:"✅", text:"Recruiter profile approved", time:fmtDate(recruiter.recruiter_approved_at), color:"#DCFCE7", fg:"#15803d" },
                  { icon:"🔒", text:"Account active and verified", time:"Current", color:"#F3E8FF", fg:"#7c3aed" },
                ].map((a,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <div style={{ width:30, height:30, borderRadius:"50%", backgroundColor:a.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{a.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:"#374151" }}>{a.text}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: DOCUMENTS                                 */}
        {/* ══════════════════════════════════════════════ */}
        {tab==="Documents" && (
          <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"24px" }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 20px" }}>Verification Documents</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
              {[
                { name:"GST Certificate", status:"Verified", icon:"📄" },
                { name:"PAN Card", status:"Verified", icon:"🪪" },
                { name:"Company Registration", status:"Verified", icon:"🏢" },
                { name:"NDH", status:"Pending", icon:"📋" },
                { name:"Company Logo", status:recruiter.company_logo?"Uploaded":"Not Uploaded", icon:"🖼️" },
              ].map(d=>{
                const isVerified=d.status==="Verified"||d.status==="Uploaded";
                return (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:20 }}>{d.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600 }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:999, backgroundColor:isVerified?"#DCFCE7":"#FEF3C7", color:isVerified?"#15803d":"#d97706", border:`1px solid ${isVerified?"#86efac":"#fde68a"}` }}>
                      {isVerified?"✓":"⏳"} {d.status}
                    </span>
                  </div>
                );
              })}
            </div>
            <button style={{ marginTop:16, padding:"10px 20px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              View All Documents →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: NOTES                                     */}
        {/* ══════════════════════════════════════════════ */}
        {tab==="Notes" && (
          <div>
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px", marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 12px" }}>Add Internal Note</h3>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4}
                placeholder="Add a private note about this recruiter (only visible to admins)..."
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }}
                onFocus={e=>e.target.style.borderColor=O} onBlur={e=>e.target.style.borderColor=BORDER}/>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
                <button onClick={addNote}
                  style={{ padding:"9px 22px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Add Note
                </button>
              </div>
            </div>
            {notes.length===0 ? (
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"48px", textAlign:"center", color:"#94a3b8" }}>
                No notes yet. Add the first note above.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {notes.map((n,i)=>(
                  <div key={i} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderLeft:`4px solid ${O}`, borderRadius:12, padding:"16px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{n.author}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{n.time}</div>
                    </div>
                    <div style={{ fontSize:13, color:"#475569", lineHeight:1.6 }}>{n.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Other tabs placeholder                         */}
        {/* ══════════════════════════════════════════════ */}
        {["Jobs & JD Performance","Candidates","Activity Log"].includes(tab) && (
          <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"60px", textAlign:"center" }}>
            <div style={{ fontSize:44, marginBottom:14 }}>🚧</div>
            <h3 style={{ margin:"0 0 6px", fontWeight:700 }}>{tab}</h3>
            <p style={{ color:"#94a3b8", margin:0 }}>This section will be available once the recruiter starts using the platform actively.</p>
          </div>
        )}
      </div>
    </div>
  );
}
