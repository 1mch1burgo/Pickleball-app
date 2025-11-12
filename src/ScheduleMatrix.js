// src/ScheduleMatrix.js
import React from "react";
import { Link } from "react-router-dom";

<Link to="/">
  <button
    style={{
      marginBottom: "20px",
      padding: "10px 20px",
      borderRadius: "8px",
      border: "none",
      backgroundColor: "#28a745",
      color: "white",
      cursor: "pointer",
      fontSize: "16px",
    }}
  >
    ← Back to Schedule
  </button>
</Link>
export default function ScheduleMatrix() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">📋 Schedule Matrix</h1>
      <p className="text-gray-700 text-center">
        This is the new schedule matrix page.
      </p>
    </div>
  );
}