"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { showError } from "@/utils/toast";

export default function BulkCandidatesListPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserRole();
    fetchBulkCandidates();
  }, []);

  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "${API_BASE_URL}/api/profile/user",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserRole(response.data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchBulkCandidates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "${API_BASE_URL}/api/admin/bulk-candidates",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCandidates(response.data || []);
    } catch (error) {
      console.error("Error fetching bulk candidates:", error);
      showError("Failed to fetch bulk candidates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Uploaded Candidates</h1>
          <p className="text-gray-600">
            Candidates uploaded via bulk CSV import ({candidates.length} total)
          </p>
        </div>

        {/* Candidates Grid */}
        {candidates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-600 text-lg">No bulk candidates yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() => {
                  // Could navigate to a detail page here
                }}
              >
                {/* Candidate Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {candidate.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{candidate.email}</p>
                  {candidate.contact && (
                    <p className="text-sm text-gray-600 mb-2">
                      📞 {candidate.contact}
                    </p>
                  )}
                  {candidate.role && (
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {candidate.role}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-700 border-t pt-4">
                  {candidate.current_company_name && (
                    <p>
                      <span className="font-semibold">Company:</span>{" "}
                      {candidate.current_company_name}
                    </p>
                  )}
                  {candidate.experience && (
                    <p>
                      <span className="font-semibold">Experience:</span>{" "}
                      {candidate.experience}
                    </p>
                  )}
                  {candidate.current_ctc && (
                    <p>
                      <span className="font-semibold">Current CTC:</span>{" "}
                      {candidate.current_ctc}
                    </p>
                  )}
                  {candidate.expected_ctc && (
                    <p>
                      <span className="font-semibold">Expected CTC:</span>{" "}
                      {candidate.expected_ctc}
                    </p>
                  )}
                  {candidate.current_location && (
                    <p>
                      <span className="font-semibold">Location:</span>{" "}
                      {candidate.current_location}
                    </p>
                  )}
                  {candidate.notice_period && (
                    <p>
                      <span className="font-semibold">Notice Period:</span>{" "}
                      {candidate.notice_period}
                    </p>
                  )}
                  {candidate.skills && (
                    <p>
                      <span className="font-semibold">Skills:</span>{" "}
                      {candidate.skills}
                    </p>
                  )}
                  {candidate.reason_for_change && (
                    <p>
                      <span className="font-semibold">Reason for Change:</span>{" "}
                      {candidate.reason_for_change}
                    </p>
                  )}
                  {candidate.offer_in_hand && (
                    <p>
                      <span className="font-semibold">Offer in Hand:</span>{" "}
                      {candidate.offer_in_hand}
                    </p>
                  )}
                </div>

                {/* Links */}
                <div className="flex gap-2 flex-wrap pt-4 border-t">
                  {candidate.linkedin && (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      LinkedIn ↗
                    </a>
                  )}
                  {candidate.resume_link && (
                    <a
                      href={candidate.resume_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Resume ↗
                    </a>
                  )}
                  {candidate.technical_skills && (
                    <span className="text-purple-600 text-sm">
                      Technical: {candidate.technical_skills}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
