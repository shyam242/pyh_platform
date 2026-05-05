"use client";
import { motion } from "framer-motion";

export default function PipelineBoard({ referrals, updateStatus }) {

  const columns = [
    "pending",
    "shortlisted",
    "hold",
    "rejected",
  ];

  return (
    <div style={{ display: "flex", gap: 20 }}>

      {columns.map((col) => (
        <div key={col} style={column}>
          <h3 style={{ textTransform: "capitalize" }}>
            {col}
          </h3>

          {referrals
            .filter((r) => r.status === col)
            .map((r) => (
              <motion.div
                key={r.id}
                whileHover={{ scale: 1.03 }}
                style={card}
              >
                <h4>{r.name}</h4>
                <p>{r.email}</p>

                <select
                  value={r.status}
                  onChange={(e) =>
                    updateStatus(r.id, e.target.value)
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="shortlisted">Shortlist</option>
                  <option value="hold">Hold</option>
                  <option value="rejected">Reject</option>
                </select>
              </motion.div>
            ))}
        </div>
      ))}

    </div>
  );
}

const column = {
  background: "rgba(255,255,255,0.7)",
  padding: 20,
  borderRadius: 14,
  minWidth: 260,
};

const card = {
  background: "white",
  padding: 15,
  borderRadius: 12,
  marginTop: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
};
