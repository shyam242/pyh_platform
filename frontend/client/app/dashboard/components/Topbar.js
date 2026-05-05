"use client";

export default function Topbar() {
  return (
    <div
      style={{
        background: "white",
        padding: "20px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      <h3>Recruiter Dashboard</h3>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          window.location.href = "/signin";
        }}
      >
        Logout
      </button>
    </div>
  );
}
