"use client";
import { useState } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { API_BASE_URL } from "@/utils/api";

export default function CandidateCard({ candidate, onStatusUpdate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidate.id, status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      showSuccess(`Status updated to ${newStatus}`);
      onStatusUpdate?.(candidate.id, newStatus);
    } catch (err) {
      showError(err.message || "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCv = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/recruiter/${candidate.id}/cv/download`
      );
      
      if (!response.ok) throw new Error("Failed to download CV");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate.name}-CV.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess("CV downloaded successfully");
    } catch (err) {
      showError(err.message || "Failed to download CV");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-700 border-yellow-300",
      accepted: "bg-blue-500/20 text-blue-700 border-blue-300",
      shortlist: "bg-green-500/20 text-green-700 border-green-300",
      hold: "bg-orange-500/20 text-orange-700 border-orange-300",
      reject: "bg-red-500/20 text-red-700 border-red-300",
    };
    return colors[status] || colors.pending;
  };

  const avatarUrl = candidate.candidate_image_url || "/user.svg";

  return (
    <>
      {/* Card View */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition">
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={avatarUrl}
                alt={`${candidate.name} avatar`}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{candidate.name}</h3>
              <p className="text-sm text-gray-600">{candidate.company}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(candidate.status)}`}>
            {candidate.status}
          </span>
        </div>

        <div className="space-y-2 text-sm mb-6">
          <div className="flex items-center text-gray-700">
            <span className="mr-2 font-semibold text-gray-800">Email:</span>
            <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">
              {candidate.email}
            </a>
          </div>
          <div className="flex items-center text-gray-700">
            <span className="mr-2 font-semibold text-gray-800">Phone:</span>
            {candidate.phone}
          </div>
          <div className="flex items-center text-gray-700">
            <span className="mr-2 font-semibold text-gray-800">Experience:</span>
            {candidate.experience} years
          </div>
          {candidate.linkedin && (
            <div className="text-gray-700">
              <span className="font-semibold text-gray-800">LinkedIn:</span>
              <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                View profile
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setShowDetails(true)}
            className="flex-1 min-w-30 bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700 transition text-sm"
          >
            View Details
          </button>
          {candidate.cv_file && (
            <button
              onClick={handleDownloadCv}
              className="flex-1 min-w-30 bg-purple-600 text-white py-2 px-4 rounded font-semibold hover:bg-purple-700 transition text-sm"
            >
              Download CV
            </button>
          )}
        </div>

        {/* Status Change Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleStatusChange("shortlist")}
            disabled={isLoading || candidate.status === "shortlist"}
            className="flex-1 bg-green-500 text-white py-2 rounded font-semibold hover:bg-green-600 transition disabled:opacity-50 text-sm"
          >
            Shortlist
          </button>
          <button
            onClick={() => handleStatusChange("hold")}
            disabled={isLoading || candidate.status === "hold"}
            className="flex-1 bg-blue-500 text-white py-2 rounded font-semibold hover:bg-blue-600 transition disabled:opacity-50 text-sm"
          >
            Hold
          </button>
          <button
            onClick={() => handleStatusChange("reject")}
            disabled={isLoading || candidate.status === "reject"}
            className="flex-1 bg-red-500 text-white py-2 rounded font-semibold hover:bg-red-600 transition disabled:opacity-50 text-sm"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 p-6 flex justify-between items-center border-b">
              <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-600 hover:text-gray-900 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Contact Information</h3>
                <p className="text-gray-600">
                  <strong>Email:</strong> {candidate.email}
                </p>
                <p className="text-gray-600">
                  <strong>Phone:</strong> {candidate.phone}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Job Details</h3>
                <p className="text-gray-600">
                  <strong>Company:</strong> {candidate.company}
                </p>
                <p className="text-gray-600">
                  <strong>Experience Required:</strong> {candidate.experience} years
                </p>
              </div>

              {candidate.linkedin && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">LinkedIn</h3>
                  <a
                    href={candidate.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {candidate.linkedin}
                  </a>
                </div>
              )}

              {candidate.cv_file && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => {
                      handleDownloadCv();
                      setShowDetails(false);
                    }}
                    className="w-full bg-purple-600 text-white py-3 rounded font-semibold hover:bg-purple-700 transition"
                  >
                    Download CV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
