// App.js
import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";

export default function App() {
  const [csvData, setCsvData] = useState([]);
  const [playersOptions, setPlayersOptions] = useState([]);
  const [courtsOptions, setCourtsOptions] = useState([]);
  const [roundsOptions, setRoundsOptions] = useState([]);

  const [selectedPlayers, setSelectedPlayers] = useState("");
  const [selectedCourts, setSelectedCourts] = useState("");
  const [selectedNumRounds, setSelectedNumRounds] = useState("");

  const [playerNames, setPlayerNames] = useState([]);
  const previousNamesRef = useRef([]);
  const [filteredRounds, setFilteredRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [view, setView] = useState("input"); // input | schedule | matrix

  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  // Load CSV
  useEffect(() => {
    Papa.parse("/schedule.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const raw = res.data.filter((r) => r && r.Round);
        setCsvData(raw);
        const playerSet = [...new Set(raw.map((r) => r.Players).filter(Boolean))];
        setPlayersOptions(playerSet.sort((a, b) => parseInt(a) - parseInt(b)));
      },
      error: (err) => console.error("CSV load error:", err),
    });
  }, []);

  // Prevent mobile overscroll / pull-to-refresh
  useEffect(() => {
    const prev = document.documentElement.style.overscrollBehavior;
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overscrollBehavior = prev;
    };
  }, []);

  // Compute courts options
  useEffect(() => {
    if (!selectedPlayers) return;
    const rowsForPlayers = csvData.filter((r) => r.Players === String(selectedPlayers));
    const courtsSet = [...new Set(rowsForPlayers.map((r) => r.Courts).filter(Boolean))];
    setCourtsOptions(courtsSet.sort((a, b) => parseInt(a) - parseInt(b)));

    const needed = parseInt(selectedPlayers, 10) || 0;
    setPlayerNames((cur) => {
      const copy = cur.slice(0, needed);
      while (copy.length < needed) copy.push("");
      return copy;
    });
  }, [selectedPlayers, csvData]);

  // Compute rounds options
  useEffect(() => {
    if (!selectedPlayers || !selectedCourts) return;
    const rows = csvData.filter(
      (r) => r.Players === String(selectedPlayers) && r.Courts === String(selectedCourts)
    );
    const max = rows.length;
    const opts = Array.from({ length: max }, (_, i) => String(i + 1));
    setRoundsOptions(opts);
  }, [selectedPlayers, selectedCourts, csvData]);

  // Extract matches and byes
  const extractMatches = (row) => {
    const keys = Object.keys(row);
    const courtNums = new Set();
    keys.forEach((k) => {
      const m = k.match(/^(\d+)a$/);
      if (m) courtNums.add(m[1]);
    });
    const matches = [];
    Array.from(courtNums)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((court) => {
        const a = row[`${court}a`];
        const b = row[`${court}b`];
        const c = row[`${court}c`];
        const d = row[`${court}d`];
        if (a && b && c && d && a !== "x" && b !== "x" && c !== "x" && d !== "x") {
          matches.push({ court, team1: [a, b], team2: [c, d] });
        }
      });
    return matches;
  };

  const extractByes = (row) => {
    const byes = [];
    for (let i = 1; i <= 12; i++) {
      const key = `b${i}`;
      if (row[key] && row[key] !== "x") byes.push(row[key]);
    }
    return byes;
  };

  const buildFilteredRounds = () => {
    if (!selectedPlayers || !selectedCourts || !selectedNumRounds) return;
    const rows = csvData.filter(
      (r) => r.Players === String(selectedPlayers) && r.Courts === String(selectedCourts)
    );
    const n = parseInt(selectedNumRounds, 10);
    const rounds = rows.slice(0, n).map((r) => ({
      roundLabel: r.Round,
      matches: extractMatches(r),
      byes: extractByes(r),
    }));
    setFilteredRounds(rounds);
    setCurrentRoundIndex(0);
    setView("schedule");
  };

  const replaceNumbersWithNames = (numStr) => {
    const idx = parseInt(numStr, 10);
    if (isNaN(idx)) return numStr;
    const name = playerNames[idx - 1];
    return name && name.trim() !== "" ? name.trim() : String(idx);
  };

  const handleRefresh = () => {
    if (window.confirm("Do you really want to refresh? This will lose any unsaved data.")) {
      window.location.reload();
    }
  };

  const maxPlayerCount = parseInt(selectedPlayers || 0, 10);

  const nextRound = () => {
    if (currentRoundIndex < filteredRounds.length - 1) setCurrentRoundIndex((i) => i + 1);
  };
  const prevRound = () => {
    if (currentRoundIndex > 0) setCurrentRoundIndex((i) => i - 1);
  };

  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchMove = (e) => {
    touchEndXRef.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = () => {
    const s = touchStartXRef.current;
    const e = touchEndXRef.current;
    if (s == null || e == null) return;
    const diff = s - e;
    const threshold = 50;
    if (diff > threshold) nextRound();
    if (diff < -threshold) prevRound();
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

// Build teammate matrix
const renderMatrix = () => {
  if (!filteredRounds.length) return null;

  const names = playerNames.map((p, i) => p || String(i + 1));
  const n = names.length;

  // Initialize matrices
  const teammateMatrix = Array.from({ length: n }, () => Array(n).fill(0)); // for blue highlight
  const courtMatrix = Array.from({ length: n }, () => Array(n).fill(0)); // for counts
  const byesCount = Array(n).fill(0);

  filteredRounds.forEach((round) => {
    // Count byes
    round.byes.forEach((b) => {
      const idx = parseInt(b, 10) - 1;
      if (idx >= 0 && idx < n) byesCount[idx]++;
    });

    // Count teammates (a+b, c+d)
    round.matches.forEach((m) => {
      const t1 = m.team1.map((x) => parseInt(x, 10) - 1);
      const t2 = m.team2.map((x) => parseInt(x, 10) - 1);

      // Teammates for blue highlight
      if (t1[0] >= 0 && t1[1] >= 0) {
        teammateMatrix[t1[0]][t1[1]]++;
        teammateMatrix[t1[1]][t1[0]]++;
      }
      if (t2[0] >= 0 && t2[1] >= 0) {
        teammateMatrix[t2[0]][t2[1]]++;
        teammateMatrix[t2[1]][t2[0]]++;
      }

      // Count all courtmates for numbers (a+b+c+d combinations)
      const allPlayers = [...t1, ...t2];
      for (let i = 0; i < allPlayers.length; i++) {
        for (let j = i + 1; j < allPlayers.length; j++) {
          const p1 = allPlayers[i];
          const p2 = allPlayers[j];
          if (p1 >= 0 && p2 >= 0) {
            courtMatrix[p1][p2]++;
            courtMatrix[p2][p1]++;
          }
        }
      }
    });
  });

  return (
    <div className="overflow-auto max-h-[500px]">
      <table className="border-collapse border border-gray-400 text-xs table-auto">
        <thead>
          <tr>
            <th className="border px-1 py-1 bg-gray-200 sticky top-0 left-0 z-10">Player</th>
            {names.map((n, i) => (
              <th
                key={i}
                className="border px-1 py-1 bg-gray-200 sticky top-0 z-5"
              >
                {n}
              </th>
            ))}
            <th className="border px-1 py-1 bg-gray-200 sticky top-0 z-5">Byes</th>
            <th className="border px-1 py-1 bg-gray-200 sticky top-0 z-5">Not played with</th>
          </tr>
        </thead>
        <tbody>
          {names.map((rowName, i) => (
            <tr key={i}>
              <td className="border px-1 py-1 font-semibold bg-gray-200 sticky left-0 z-5">{rowName}</td>
              {names.map((_, j) => {
                const isDiagonal = i === j;
                const bgColor = isDiagonal
                  ? "bg-gray-300"
                  : teammateMatrix[i][j] > 0
                  ? "bg-blue-300"
                  : "";
                return (
                  <td key={j} className={`border px-1 py-1 text-center ${bgColor}`}>
                    {isDiagonal ? "" : courtMatrix[i][j] > 0 ? courtMatrix[i][j] : ""}
                  </td>
                );
              })}
              <td className="border px-1 py-1 text-center">{byesCount[i]}</td>
              <td className="border px-1 py-1 text-center">
                {courtMatrix[i].filter((v, j) => i !== j && v === 0).length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

  const genDisabled = !selectedPlayers || !selectedCourts || !selectedNumRounds;

  return (
    <div className="min-h-screen bg-gray-100 py-3 px-3 relative">
      <div
        className="mx-auto max-w-sm bg-white rounded-2xl shadow p-3"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
       <h1 className="text-center text-xl font-bold mb-2">🏓 Pickleball Scheduler</h1>

{/* Summary of current selection */}
{selectedPlayers && selectedCourts && selectedNumRounds && (
  <div className="text-center text-sm text-gray-600 mb-3">
    Players: <strong>{selectedPlayers}</strong> | Courts: <strong>{selectedCourts}</strong> | Rounds: <strong>{selectedNumRounds}</strong>
  </div>
)}

        {view === "input" && (
          <>
            {/* Players dropdown */}
            <div className="mb-3">
              <label className="text-xs text-gray-600">Players</label>
              <select
                className="w-full border rounded p-2 mt-1 text-sm"
                value={selectedPlayers}
                onChange={(e) => setSelectedPlayers(e.target.value)}
              >
                <option value="">Select number of players</option>
                {playersOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Courts dropdown */}
            {courtsOptions.length > 0 && (
              <div className="mb-3">
                <label className="text-xs text-gray-600">Courts</label>
                <select
                  className="w-full border rounded p-2 mt-1 text-sm"
                  value={selectedCourts}
                  onChange={(e) => setSelectedCourts(e.target.value)}
                >
                  <option value="">Select courts</option>
                  {courtsOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Rounds dropdown */}
            {roundsOptions.length > 0 && (
              <div className="mb-3">
                <label className="text-xs text-gray-600">Number of Rounds to show</label>
                <select
                  className="w-full border rounded p-2 mt-1 text-sm"
                  value={selectedNumRounds}
                  onChange={(e) => setSelectedNumRounds(e.target.value)}
                >
                  <option value="">Select rounds</option>
                  {roundsOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={buildFilteredRounds}
              className={`${genDisabled ? "w-full bg-gray-400 text-white p-2 rounded text-sm cursor-not-allowed" : "w-full bg-blue-600 text-white p-2 rounded text-sm"}`}
              disabled={genDisabled}
            >
              Generate Schedule
            </button>
          </>
        )}

        {view === "schedule" && (
          <>
            {/* Top summary + buttons */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-3">
                <button
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded shadow"
                  onClick={handleRefresh}
                >
                  🔄 Refresh
                </button>
                <button
                  className="text-xs text-blue-600 underline"
                  onClick={() => setView("matrix")}
                >
                  📊 Matrix
                </button>
              </div>

              <button
                className="text-xs text-blue-600 underline"
                onClick={() => setView("input")}
              >
                ✏️ Edit
              </button>
            </div>

            {/* Round display */}
            {filteredRounds.length === 0 ? (
              <p className="text-sm text-center text-gray-500">No rounds available.</p>
            ) : (
              <>
                <div className="mb-2 text-center">
                  <div className="text-lg text-gray-600">Round</div>
                  <div className="text-lg font-semibold">
                    {filteredRounds[currentRoundIndex].roundLabel}
                  </div>
                </div>

                <div>
                  {filteredRounds[currentRoundIndex].matches.map((m, idx) => (
                    <div key={idx} className="bg-blue-50 rounded-lg p-3 mb-3 border">
                      <div className="text-center text-lg text-gray-500">Court {m.court}</div>
                      <div className="mt-1 text-center text-md font-semibold">
                        <div>{m.team1.map(replaceNumbersWithNames).join("   /   ")}</div>
                        <div className="text-center text-sm font-semibold mt-1 mb-1">--------</div>
                        <div>{m.team2.map(replaceNumbersWithNames).join("   /   ")}</div>
                      </div>
                    </div>
                  ))}
                  {filteredRounds[currentRoundIndex].byes.length > 0 && (
                    <div className="text-center text-sm text-gray-600 mt-1">
                      <strong>Byes:</strong>{" "}
                      {filteredRounds[currentRoundIndex].byes.map(replaceNumbersWithNames).join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={prevRound}
                    disabled={currentRoundIndex === 0}
                    className={`px-3 py-1 rounded text-white text-sm ${currentRoundIndex === 0 ? "bg-gray-300" : "bg-blue-600"}`}
                  >⬅</button>
                  <div className="text-xs text-gray-600">{currentRoundIndex + 1} / {filteredRounds.length}</div>
                  <button
                    onClick={nextRound}
                    disabled={currentRoundIndex === filteredRounds.length - 1}
                    className={`px-3 py-1 rounded text-white text-sm ${currentRoundIndex === filteredRounds.length - 1 ? "bg-gray-300" : "bg-blue-600"}`}
                  >➡</button>
                </div>
              </>
            )}
          </>
        )}

        {view === "matrix" && (
          <>
            {renderMatrix()}
            <button
              onClick={() => setView("schedule")}
              className="mt-2 w-full bg-blue-600 text-white p-2 rounded text-sm"
            >
              ⬅ Return to Schedule
            </button>
          </>
        )}
      </div>
    </div>
  );
}
