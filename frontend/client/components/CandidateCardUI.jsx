import { Shortlist, Hold, Reject } from "lucide-react";

export default function CandidateCard({
  candidate,
  isBulk = false,
  onCardClick,
  onShortlist,
  onHold,
  onReject,
}) {
  // For bulk candidates, show basic info like the template
  // For referred candidates, show referrer info
  
  return (
    <div
      onClick={onCardClick}
      className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-lg transition-all cursor-pointer"
      style={{
        backgroundColor: "#ffffff",
        border: "2px solid #dbeafe",
        borderRadius: "1rem",
        padding: "1.5rem",
      }}
    >
      {/* Header: Name and Status */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">{candidate.name}</h3>
          <p className="text-sm text-gray-600">{candidate.email}</p>
        </div>
        {candidate.shortlist_status && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor:
                candidate.shortlist_status === "Shortlisted"
                  ? "#d1fae5"
                  : "#fef3c7",
              color:
                candidate.shortlist_status === "Shortlisted"
                  ? "#047857"
                  : "#92400e",
            }}
          >
            {candidate.shortlist_status}
          </span>
        )}
      </div>

      {/* Skills */}
      {candidate.skills && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {typeof candidate.skills === "string"
              ? candidate.skills.split(",").slice(0, 2).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                  >
                    {skill.trim()}
                  </span>
                ))
              : Array.isArray(candidate.skills)
              ? candidate.skills.slice(0, 2).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))
              : null}
          </div>
        </div>
      )}

      {/* Referred By Section - Only show for non-bulk candidates */}
      {!isBulk && candidate.referred_by && (
        <div
          className="bg-orange-50 border-l-4 border-orange-500 p-3 mb-4 rounded"
          style={{
            backgroundColor: "#fff7ed",
            borderLeft: "4px solid #f97316",
            padding: "0.75rem",
            marginBottom: "1rem",
            borderRadius: "0.25rem",
          }}
        >
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
            Referred by
          </p>
          <p className="text-sm font-semibold text-gray-800">
            {candidate.referred_by}
          </p>
          {candidate.referrer_experience && (
            <p className="text-xs text-gray-600 mt-1">
              {candidate.referrer_experience}
            </p>
          )}
        </div>
      )}

      {/* Action Buttons - Only show for non-bulk candidates */}
      {!isBulk && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShortlist?.(candidate.id);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition-colors"
          >
            <Shortlist size={16} />
            Shortlist
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHold?.(candidate.id);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium transition-colors"
          >
            <Hold size={16} />
            Hold
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject?.(candidate.id);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors"
          >
            <Reject size={16} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
