import React, { useState, useEffect } from "react";
import Papa from "papaparse";

export default function ScheduleViewer({ playerNames = [] }) {
  const [data, setData] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Papa.parse("/schedule.csv", {
      download: true,
      header: true,
      complete: (results) => {
        setData(results.data.filter(row => row.Round)); // remove blanks
        setLoading(false);
      },
    });
  }, []);

  if (loading) return <p className="text-center text-gray-500">Loading schedule...</p>;
  if (!data.length) return <p className="text-center text-red-500">No schedule data found.</p>;

  const currentRound = data[roundIndex];
  const headers = Object.keys(currentRound).filter((h) => h !== "Round");

  // ✅ Replace player numbers with names if available
  const getPlayerName = (value) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= playerNames.length) {
      return playerNames[num - 1];
    }
    return value; // x or empty stays as-is
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-2xl">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Round {currentRound.Round}
      </h1>

      <table className="w-full border border-gray-300 text-center">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border px-2 py-1 text-sm">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {headers.map((header) => (
              <td key={header} className="border px-2 py-1">
                {getPlayerName(currentRound[header])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between mt-6">
        <button
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          onClick={() => setRoundIndex(roundIndex - 1)}
          disabled={roundIndex === 0}
        >
          ⬅ Previous
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={() => setRoundIndex(roundIndex + 1)}
          disabled={roundIndex === data.length - 1}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
}

