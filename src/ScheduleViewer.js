import React, { useState, useEffect } from "react";
import Papa from "papaparse";

export default function ScheduleViewer({ playerNames }) {
  const [data, setData] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Papa.parse("/schedule.csv", {
      download: true,
      header: true,
      complete: (results) => {
        const validRows = results.data.filter(row => row.Round);
        setData(validRows);
        setLoading(false);
      },
    });
  }, []);

  if (loading) return <p className="text-center text-gray-500">Loading schedule...</p>;
  if (!data.length) return <p className="text-center text-red-500">No schedule data found.</p>;

  const currentRound = data[roundIndex];
  const roundNumber = currentRound.Round;

  // --- helper: map numbers to player names ---
  const getName = (val) => {
    if (!val || val.toLowerCase() === "x") return "—";
    const num = parseInt(val);
    return playerNames[num - 1] || val;
  };

  // --- group columns into courts and byes ---
  const courtGroups = {};
  const byes = [];
  for (const [key, value] of Object.entries(currentRound)) {
    if (key.toLowerCase().startsWith("b")) {
      if (value && value !== "x") byes.push(getName(value));
    } else if (key.match(/^(\d+)/)) {
      const courtNum = key.match(/^(\d+)/)[1];
      if (!courtGroups[courtNum]) courtGroups[courtNum] = [];
      courtGroups[courtNum].push(getName(value));
    }
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white shadow-xl rounded-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        Round {roundNumber}
      </h1>

      {/* Courts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(courtGroups).map(([courtNum, players]) => {
          const team1 = players.slice(0, 2);
          const team2 = players.slice(2, 4);
          return (
            <div
              key={courtNum}
              className="bg-blue-50 rounded-2xl shadow-md p-4 border border-blue-200"
            >
              <h2 className="text-lg font-semibold mb-3 text-blue-800 text-center">
                Court {courtNum}
              </h2>

              <div className="flex flex-col gap-3">
                <div className="bg-white rounded-xl p-3 shadow-inner border text-center">
                  <p className="font-semibold">{team1.join(" & ")}</p>
                </div>
                <div className="text-center font-bold text-gray-500">vs</div>
                <div className="bg-white rounded-xl p-3 shadow-inner border text-center">
                  <p className="font-semibold">{team2.join(" & ")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Byes */}
      {byes.length > 0 && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
          <h3 className="font-bold text-yellow-700 mb-2 text-lg">Byes</h3>
          <p className="text-gray-700">{byes.join(", ")}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          onClick={() => setRoundIndex(roundIndex - 1)}
          disabled={roundIndex === 0}
        >
          ⬅ Previous
        </button>
        <button
          className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          onClick={() => setRoundIndex(roundIndex + 1)}
          disabled={roundIndex === data.length - 1}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
}
