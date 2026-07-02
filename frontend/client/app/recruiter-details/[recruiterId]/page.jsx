"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, ExternalLink, Edit3, X, Save } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

const O = "#E87722", O_LITE = "#FFF3E8", O_MID = "#FBBF7A", BORDER = "#E2E8F0";
const initials = n => (n||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const avatarBg = name => {
  const c=[["#EFF6FF","#1d4ed8"],["#F3E8FF","#7c3aed"],["#DCFCE7","#15803d"],["#FFF7ED",O]];
  return c[(name||"").charCodeAt(0)%c.length];
};

const TABS = ["Overview","Jobs","Documents","Notes"];

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRecruiter(); fetchJobs(); }, [recruiterId]);

  const fetchRecruiter = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/recruiter/${recruiterId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Recruiter not found");
      const d = await res.json();
      setRecruiter(d);
      setEditForm({
        name: d.name || "",
        phone: d.phone || "",
        company_name: d.company_name || d.company || "",
        company_website: d.company_website || "",
      });
      const saved = localStorage.getItem(`recruiter_notes_${recruiterId}`);
      if (saved) setNotes(JSON.parse(saved));
    } catch (e) {
      showError(e.message);
      setTimeout(() => router.back(), 1500);
    } finally { setLoading(false); }
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/jobs/admin/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json();
      setJobs(Array.isArray(d) ? d : []);
    } catch {}
  };

  const handleSuspend = async () => {
    if (!confirm(`Suspend ${recruiter?.name}? They will lose platform access.`)) return;
    setSuspending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/recruiters/${recruiterId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed");
      showSuccess("Recruiter suspended successfully");
      router.push("/admin");
    } catch {
      showError("Failed to suspend recruiter");
      setSuspending(false);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editForm)
      });
      setRecruiter(r => ({ ...r, ...editForm }));
      showSuccess("Recruiter updated");
      setShowEditModal(false);
    } catch {
      showError("Failed to update");
    } finally { setSaving(false); }
  };

  const addNote = () => {
    if (!note.trim()) return;
    const n = { text: note.trim(), time: new Date().toLocaleString("en-IN"), author: "Admin" };
    const updated = [n, ...notes];
    setNotes(updated);
    localStorage.setItem(`recruiter_notes_${recruiterId}`, JSON.stringify(updated));
    setNote("");
    showSuccess("Note saved");
  };

  const deleteNote = (idx) => {
    const updated = notes.filter((_,i) => i !== idx);
    setNotes(updated);
    localStorage.setItem(`recruiter_notes_${recruiterId}`, JSON.stringify(updated));
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:44, height:44, border:`3px solid ${O}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 14px" }}/>
        <p style={{ color:"#64748b", fontWeight:600 }}>Loading recruiter profile…</p>
      </div>
    </div>
  );

  if (!recruiter) return (
    <div style={{ padding:60, textAlign:"center", color:"#94a3b8", fontFamily:"-apple-system,sans-serif" }}>
      <p style={{ fontSize:16 }}>Recruiter not found</p>
      <button onClick={()=>router.back()} style={{ marginTop:12, padding:"8px 18px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>Go Back</button>
    </div>
  );

  const [abg, afg] = avatarBg(recruiter.name);
  const recruiterId4 = `REC-${String(recruiterId).padStart(4,"0")}`;

  return (
    <div style={{ minHeight:"100vh", backgroundColor:"#F8FAFC", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#0f172a" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}`}</style>

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:200, backgroundColor:"#fff", borderBottom:`1.5px solid ${BORDER}`, padding:"0 40px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
        <button onClick={()=>router.back()}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 16px", border:`1.5px solid ${BORDER}`, borderRadius:9, backgroundColor:"#fff", fontSize:13, color:"#475569", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=O;e.currentTarget.style.color=O;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.color="#475569";}}>
          <ArrowLeft size={14}/> Back to Approved Recruiters
        </button>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowEditModal(true)}
            style={{ padding:"8px 18px", backgroundColor:"#fff", color:"#374151", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.backgroundColor="#F8FAFC"}
            onMouseLeave={e=>e.currentTarget.style.backgroundColor="#fff"}>
            <Edit3 size={13}/> Edit Recruiter
          </button>
          <button onClick={handleSuspend} disabled={suspending}
            style={{ padding:"8px 18px", backgroundColor:"#fef2f2", color:"#dc2626", border:"1.5px solid #fecaca", borderRadius:9, fontSize:13, fontWeight:700, cursor:suspending?"not-allowed":"pointer", fontFamily:"inherit" }}>
            {suspending ? "Suspending…" : "⛔ Suspend"}
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 40px 64px" }}>

        {/* PROFILE CARD */}
        <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:18, padding:"28px 32px", marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:24, alignItems:"flex-start" }}>
            {/* Avatar */}
            <div style={{ width:80, height:80, borderRadius:18, backgroundColor:abg, color:afg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, flexShrink:0 }}>
              {initials(recruiter.name)}
            </div>
            {/* Info */}
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>{recruiter.name}</h1>
                <span style={{ fontSize:11, fontWeight:700, padding:"3px 11px", borderRadius:999, backgroundColor:"#DCFCE7", color:"#15803d", border:"1px solid #86efac" }}>● Approved</span>
              </div>
              <p style={{ fontSize:13, color:"#64748b", margin:"0 0 12px" }}>
                Recruiter at <strong style={{ color:"#374151" }}>{recruiter.company_name||recruiter.company||"Independent"}</strong>
              </p>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {recruiter.email && (
                  <a href={`mailto:${recruiter.email}`} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#64748b", textDecoration:"none" }}
                    onMouseEnter={e=>e.currentTarget.style.color=O} onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
                    <Mail size={13} color={O}/> {recruiter.email}
                  </a>
                )}
                {recruiter.phone && (
                  <a href={`tel:${recruiter.phone}`} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#64748b", textDecoration:"none" }}
                    onMouseEnter={e=>e.currentTarget.style.color=O} onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
                    <Phone size={13} color={O}/> {recruiter.phone}
                  </a>
                )}
                {recruiter.company_website && (
                  <a href={recruiter.company_website.startsWith("http")?recruiter.company_website:`https://${recruiter.company_website}`} target="_blank" rel="noreferrer"
                    style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#1d4ed8", textDecoration:"none" }}>
                    <ExternalLink size={12}/> {recruiter.company_website}
                  </a>
                )}
              </div>
            </div>
            {/* Company badge */}
            <div style={{ backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"16px 20px", minWidth:200 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <div style={{ width:40, height:28, borderRadius:6, backgroundColor:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"#1d4ed8" }}>
                  {(recruiter.company_name||recruiter.company||"CO").split(" ").map(w=>w[0]).slice(0,3).join("").toUpperCase()}
                </div>
                <span style={{ fontSize:13, fontWeight:700 }}>{recruiter.company_name||recruiter.company||"—"}</span>
              </div>
              {[
                ["Registered", fmtDate(recruiter.created_at)],
                ["Approved", fmtDate(recruiter.recruiter_approved_at)],
                ["Recruiter ID", recruiterId4],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderTop:`1px solid ${BORDER}` }}>
                  <span style={{ fontSize:11, color:"#94a3b8" }}>{l}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meta pills */}
          <div style={{ display:"flex", gap:10, marginTop:18, paddingTop:18, borderTop:`1.5px solid ${BORDER}`, flexWrap:"wrap" }}>
            {[
              ["Registered On", fmtDate(recruiter.created_at)],
              ["Approved On", fmtDate(recruiter.recruiter_approved_at)],
              ["Status", "Active"],
              ["Recruiter ID", recruiterId4],
            ].map(([l,v])=>(
              <div key={l} style={{ backgroundColor:"#F8FAFC", border:`1.5px solid ${BORDER}`, borderRadius:9, padding:"8px 14px" }}>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:700 }}>{v||"—"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:20 }}>
          {[
            { emoji:"💼", label:"Jobs Posted", value:"—", color:"#1d4ed8", bg:"#EFF6FF" },
            { emoji:"👥", label:"Candidates", value:"—", color:"#7c3aed", bg:"#F3E8FF" },
            { emoji:"⭐", label:"Shortlisted", value:"—", color:"#d97706", bg:"#FEF3C7" },
            { emoji:"🗣️", label:"Interviewed", value:"—", color:"#059669", bg:"#DCFCE7" },
            { emoji:"📋", label:"Offers", value:"—", color:O, bg:O_LITE },
            { emoji:"✅", label:"Hires", value:"—", color:"#15803d", bg:"#DCFCE7" },
          ].map(s=>(
            <div key={s.label} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:12, padding:"16px 12px", textAlign:"center" }}>
              <div style={{ width:38, height:38, borderRadius:10, backgroundColor:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, margin:"0 auto 8px" }}>{s.emoji}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, fontWeight:600, color:"#64748b", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display:"flex", borderBottom:`1.5px solid ${BORDER}`, marginBottom:20 }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"11px 22px", border:"none", borderBottom:`2.5px solid ${tab===t?O:"transparent"}`, backgroundColor:"transparent", color:tab===t?O:"#64748b", fontSize:13, fontWeight:tab===t?700:500, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", whiteSpace:"nowrap" }}>
              {t}
              {t==="Notes" && notes.length>0 && (
                <span style={{ marginLeft:6, fontSize:10, backgroundColor:O, color:"#fff", padding:"1px 6px", borderRadius:999 }}>{notes.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {tab==="Overview" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Timeline */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px" }}>Recruiter Timeline</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[
                  { icon:"📝", text:"Registration submitted", sub:"Profile and company details added", time:fmtDate(recruiter.created_at), done:true },
                  { icon:"✅", text:"Account approved", sub:"Verified by admin", time:fmtDate(recruiter.recruiter_approved_at), done:!!recruiter.recruiter_approved_at },
                  { icon:"💼", text:"First job posted", sub:"Started recruiting on platform", time:"—", done:false },
                  { icon:"🎯", text:"Active recruiter", sub:"Regularly submitting candidates", time:"Ongoing", done:false },
                ].map((e,i)=>(
                  <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", backgroundColor:e.done?"#DCFCE7":"#F8FAFC", border:`2px solid ${e.done?"#86efac":BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{e.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{e.text}</div>
                      <div style={{ fontSize:11, color:"#94a3b8" }}>{e.sub}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>{e.time}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Company info */}
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px" }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 16px" }}>Company Information</h3>
              <div style={{ display:"grid", gap:10 }}>
                {[
                  ["Company Name", recruiter.company_name||recruiter.company||"—"],
                  ["Email", recruiter.email||"—"],
                  ["Phone", recruiter.phone||"—"],
                  ["Website", recruiter.company_website||"—"],
                  ["Approved On", fmtDate(recruiter.recruiter_approved_at)],
                  ["Recruiter ID", recruiterId4],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${BORDER}` }}>
                    <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{l}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#374151", maxWidth:200, textAlign:"right", wordBreak:"break-all" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: JOBS */}
        {tab==="Jobs" && (
          <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"16px 24px", borderBottom:`1.5px solid ${BORDER}` }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:0 }}>Jobs Posted ({jobs.length})</h3>
            </div>
            {jobs.length===0 ? (
              <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>No jobs posted yet on the platform</div>
            ) : (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 1fr", gap:8, padding:"10px 24px", backgroundColor:"#F8FAFC", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                  <span>Job Title</span><span>Department</span><span>Location</span><span>Posted On</span><span>Status</span>
                </div>
                {jobs.map((j,i)=>(
                  <div key={j.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 1fr", gap:8, padding:"13px 24px", borderBottom:i<jobs.length-1?`1px solid ${BORDER}`:"none", alignItems:"center" }}
                    onMouseEnter={e=>e.currentTarget.style.backgroundColor="#FAFBFC"}
                    onMouseLeave={e=>e.currentTarget.style.backgroundColor="transparent"}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{j.job_title||"—"}</span>
                    <span style={{ fontSize:12, color:"#475569" }}>{j.department||"—"}</span>
                    <span style={{ fontSize:12, color:"#475569" }}>{j.location||"Remote"}</span>
                    <span style={{ fontSize:11, color:"#94a3b8" }}>{j.created_at?new Date(j.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999, backgroundColor:j.status==="active"?"#DCFCE7":"#F8FAFC", color:j.status==="active"?"#15803d":"#64748b", display:"inline-block" }}>{j.status||"Active"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {tab==="Documents" && (
          <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"24px" }}>
            <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 18px" }}>Verification Documents</h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { name:"GST Certificate", icon:"📄", status:"Verified" },
                { name:"PAN Card", icon:"🪪", status:"Verified" },
                { name:"Company Registration", icon:"🏢", status:"Verified" },
                { name:"NDA", icon:"📋", status:"Pending" },
                { name:"Company Logo", icon:"🖼️", status:recruiter.company_logo?"Uploaded":"Not Uploaded" },
                { name:"Address Proof", icon:"📍", status:"Pending" },
              ].map(d=>{
                const ok = d.status==="Verified"||d.status==="Uploaded";
                return (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", backgroundColor:"#F8FAFC", border:`1.5px solid ${ok?'#86efac':BORDER}`, borderRadius:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:20 }}>{d.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600 }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999, backgroundColor:ok?"#DCFCE7":"#FEF3C7", color:ok?"#15803d":"#d97706" }}>
                      {ok?"✓":"⏳"} {d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: NOTES */}
        {tab==="Notes" && (
          <div>
            <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"20px", marginBottom:14 }}>
              <h3 style={{ fontSize:14, fontWeight:700, margin:"0 0 10px" }}>Add Internal Note</h3>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
                placeholder="Add a private note about this recruiter (only visible to admins)..."
                style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontFamily:"inherit", resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }}
                onFocus={e=>e.target.style.borderColor=O} onBlur={e=>e.target.style.borderColor=BORDER}/>
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
                <button onClick={addNote}
                  style={{ padding:"8px 22px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Save Note
                </button>
              </div>
            </div>
            {notes.length===0 ? (
              <div style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderRadius:14, padding:"48px", textAlign:"center", color:"#94a3b8" }}>
                No notes yet. Add one above.
              </div>
            ) : notes.map((n,i)=>(
              <div key={i} style={{ backgroundColor:"#fff", border:`1.5px solid ${BORDER}`, borderLeft:`4px solid ${O}`, borderRadius:12, padding:"14px 18px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>{n.author}</span>
                    <span style={{ fontSize:11, color:"#94a3b8", marginLeft:10 }}>{n.time}</span>
                  </div>
                  <button onClick={()=>deleteNote(i)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex", padding:2 }}
                    onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                    onMouseLeave={e=>e.currentTarget.style.color="#94a3b8"}>
                    <X size={14}/>
                  </button>
                </div>
                <p style={{ fontSize:13, color:"#475569", lineHeight:1.6, margin:0 }}>{n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowEditModal(false); }}>
          <div style={{ backgroundColor:"#fff", borderRadius:18, width:"100%", maxWidth:520, padding:"28px 32px", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", animation:"fadeIn 0.15s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
              <h2 style={{ fontSize:17, fontWeight:700, margin:0 }}>Edit Recruiter Info</h2>
              <button onClick={()=>setShowEditModal(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex" }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ display:"grid", gap:14 }}>
              {[
                ["Full Name","name","text"],
                ["Phone Number","phone","tel"],
                ["Company Name","company_name","text"],
                ["Company Website","company_website","url"],
              ].map(([label,key,type])=>(
                <div key={key}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#475569", marginBottom:5 }}>{label}</label>
                  <input type={type} value={editForm[key]||""} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))}
                    style={{ width:"100%", padding:"10px 13px", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
                    onFocus={e=>e.target.style.borderColor=O} onBlur={e=>e.target.style.borderColor=BORDER}/>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:22 }}>
              <button onClick={()=>setShowEditModal(false)}
                style={{ padding:"9px 20px", backgroundColor:"#fff", color:"#475569", border:`1.5px solid ${BORDER}`, borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ padding:"9px 22px", backgroundColor:O, color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
                <Save size={13}/> {saving?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
