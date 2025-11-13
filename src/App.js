import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import "./App.css";

/**
 * App.js - Pickleball scheduler UI
 * - CSV expected at public/schedule.csv
 * - Adds floating "Refresh" button (prevents accidental reload)
 */

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
  const [editing, setEditing] = useState(true);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  // 🔄 Refresh button state
  const [showRefresh, setShowRefresh] = useState(true);
  const lastScrollY = useRef(0);

  // 🧱 Prevent pull-to-refresh on mobile
  useEffect(() => {
    document.body.style.overscrollBehaviorY = "contain";
  }, []);

  // 👀 Detect scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 50) {
        setShowRefresh(false);
      } else {
        setShowRefresh(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      error: (err) => {
        console.error("CSV load error:", err);
      },
    });
  }, []);

  // Options setup
  useEffect(() => {
    if (!selectedPlayers) {
      setCourtsOptions([]);
      setSelectedCourts("");
      setRoundsOptions([]);
      setSelectedNumRounds("");
      return;
    }
    const rowsForPlayers = csvData.filter((r) => r.Players === String(selectedPlayers));
    const courtsSet = [...new Set(rowsForPlayers.map((r) => r.Courts).filter(Boolean))];
    setCourtsOptions(courtsSet.sort((a, b) => parseInt(a) - parseInt(b)));
    setSelectedCourts("");
    setRoundsOptions([]);
    setSelectedNumRounds("");
    const needed = parseInt(selectedPlayers, 10) || 0;
    setPlayerNames((cur) => {
      const copy = cur.slice(0, needed);
      while (copy.length < needed) copy.push("");
      return copy;
    });
  }, [selectedPlayers, csvData]);

  useEffect(() => {
    if (!selectedPlayers || !selectedCourts) {
      setRoundsOptions([]);
      setSelectedNumRounds("");
      return;
    }
    const rows = csvData.filter(
      (r) => r.Players === String(selectedPlayers) && r.Courts === String(selectedCourts)
    );
    const max = rows.length;
    const opts = Array.from({ length: max }, (_, i) => String(i + 1));
    setRoundsOptions(opts);
    setSelectedNumRounds("");
  }, [selectedCourts, selectedPlayers, csvData]);

  // Helpers
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
          matches.push({
            court: court,
            team1: [a, b],
            team2: [c, d],
          });
        }
      });
    return matches;
  };

  const extractByes = (row) => {
    const byes = [];
    for (let i = 1; i <= 12; i++) {
      const key = `b${i}`;
      if (key in row) {
        const val = row[key];
        if (val && val !== "x") byes.push(val);
      }
    }
    return byes;
  };

  const buildFilteredRounds = () => {
    if (!selectedPlayers || !selectedCourts || !selectedNumRounds) {
      setFilteredRounds([]);
      return;
    }
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
  };

  const replaceNumbersWithNames = (numStr) => {
    const idx = parseInt(numStr, 10);
    if (isNaN(idx)) return numStr;
    const name = playerNames[idx - 1];
    return name && name.trim() !== "" ? name.trim() : String(idx);
  };

  const handleNameChange = (i, v) => {
    setPlayerNames((cur) => {
      const copy = cur.slice();
      copy[i] = v;
      return copy;
    });
  };

  const randomizePlayers = () => {
    previousNamesRef.current = playerNames.slice();
    const filled = playerNames.filter((p) => p && p.trim() !== "");
    const blanks = playerNames.filter((p) => !p || p.trim() === "");
    for (let i = filled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filled[i], filled[j]] = [filled[j], filled[i]];
    }
    setPlayerNames([...filled, ...blanks]);
  };

  const undoRandomize = () => {
    if (previousNamesRef.current && previousNamesRef.current.length)
      setPlayerNames(previousNamesRef.current.slice());
  };

  const nextRound = () => {
    if (currentRoundIndex < filteredRounds.length - 1) {
      setCurrentRoundIndex((i) => i + 1);
    }
  };
  const prevRound = () => {
    if (currentRoundIndex > 0) setCurrentRoundIndex((i) => i - 1);
  };

  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchMove = (e) => {
    touchEndXRef.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = () => {
    const s = touchStartXRef.current;
    const e = touchEndXRef.current;
    if (s == null || e == null) {
      touchStartXRef.current = null;
      touchEndXRef.current = null;
      return;
    }
    const diff = s - e;
    const threshold = 50;
    if (diff > threshold) nextRound();
    if (diff < -threshold) prevRound();
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleRefresh = () => {
    if (window.confirm("Start new session? All current data will be cleared.")) {
      window.location.reload();
    }
  };

  const maxPlayerCount = parseInt(selectedPlayers || 0, 10);
const [showRefresh, setShowRefresh] = useState(true);

useEffect(() => {
  let lastY = window.scrollY;
  const onScroll = () => {
    const currentY = window.scrollY;
    setShowRefresh(currentY < lastY || currentY < 20); // hide when scrolling down
    lastY = currentY;
  };
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);
  return (
    <div className="min-h-screen bg-gray-100 py-3 px-3 app-container">
      {/* 🔄 Refresh Button */}
      {showRefresh && (
        <button className="refresh-button" onClick={handleRefresh}>
          🔄 Refresh
        </button>
      )}

      <div
        className="mx-auto max-w-sm bg-white rounded-2xl shadow p-3"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
       <div className="header-bar">
  <div className="header-title">
    🏓 Pickleball Scheduler
  </div>
  <button
    className={`refresh-button ${showRefresh ? "" : "hidden"}`}
    onClick={() => window.location.reload()}
  >
    🔄 Refresh
  </button>
</div>

        {editing ? (
          <>
            <div className="mb-3">
              <label className="text-xs text-gray-600">Players</label>
              <select
                className="w-full border rounded p-2 mt-1 text-sm"
                value={selectedPlayers}
                onChange={(e) => setSelectedPlayers(e.target.value)}
              >
                <option value="">Select number of players</option>
                {playersOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

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
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedPlayers && (
              <div className="mb-3">
                <label className="text-xs text-gray-600">Player names (scroll)</label>
                <div className="border rounded h-44 overflow-y-auto p-2 bg-blue-50 mt-1">
                  {Array.from({ length: maxPlayerCount }).map((_, i) => (
                    <div key={i} className="flex gap-2 items-center mb-1">
                      <div className="w-6 text-xs text-gray-500">{i + 1}</div>
                      <input
                        className="flex-1 p-1 border rounded text-sm"
                        value={playerNames[i] || ""}
                        onChange={(e) => handleNameChange(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <button
                className="flex-1 bg-yellow-500 text-white p-2 rounded text-sm"
                onClick={randomizePlayers}
                disabled={!selectedPlayers}
              >
                🎲 Randomize
              </button>
              <button
                className="flex-1 bg-gray-400 text-white p-2 rounded text-sm"
                onClick={undoRandomize}
                disabled={!previousNamesRef.current.length}
              >
                ↩ Undo
              </button>
            </div>

            <button
              onClick={() => {
                buildFilteredRounds();
                setEditing(false);
              }}
              className="w-full bg-blue-600 text-white p-2 rounded text-sm"
              disabled={!selectedPlayers || !selectedCourts || !selectedNumRounds}
            >
              Generate Schedule
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs text-gray-600">
                <div>Players: <strong>{selectedPlayers}</strong></div>
                <div>Courts: <strong>{selectedCourts}</strong></div>
                <div>Rounds: <strong>{selectedNumRounds}</strong></div>
              </div>
              <button
                className="text-xs text-blue-600 underline"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit
              </button>
            </div>

            {filteredRounds.length === 0 ? (
              <p className="text-sm text-center text-gray-500">
                No rounds available for this selection.
              </p>
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
                      <div className="text-center text-lg text-gray-500">
                        Court {m.court}
                      </div>
                      <div className="mt-1 text-center text-md font-semibold">
                        <div>{m.team1.map(replaceNumbersWithNames).join(" / ")}</div>
                        <div className="text-center text-sm font-semibold mt-1 mb-1">
                          --------
                        </div>
                        <div>{m.team2.map(replaceNumbersWithNames).join(" / ")}</div>
                      </div>
                    </div>
                  ))}

                  {filteredRounds[currentRoundIndex].byes.length > 0 && (
                    <div className="text-center text-sm text-gray-600 mt-1">
                      <strong>Byes:</strong>{" "}
                      {filteredRounds[currentRoundIndex].byes
                        .map(replaceNumbersWithNames)
                        .join(", ")}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={prevRound}
                    disabled={currentRoundIndex === 0}
                    className={`px-3 py-1 rounded text-white text-sm ${
                      currentRoundIndex === 0 ? "bg-gray-300" : "bg-blue-600"
                    }`}
                  >
                    ⬅
                  </button>
                  <div className="text-xs text-gray-600">
                    {currentRoundIndex + 1} / {filteredRounds.length}
                  </div>
                  <button
                    onClick={nextRound}
                    disabled={currentRoundIndex === filteredRounds.length - 1}
                    className={`px-3 py-1 rounded text-white text-sm ${
                      currentRoundIndex === filteredRounds.length - 1
                        ? "bg-gray-300"
                        : "bg-blue-600"
                    }`}
                  >
                    ➡
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
