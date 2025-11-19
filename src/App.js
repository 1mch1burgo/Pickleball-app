// App.js
import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";

export default function App() {
  // Prevent Android Back Button from closing PWA
  useEffect(() => {
    window.history.pushState({ page: 1 }, "", "");

    const stopBackClose = () => {
      window.history.pushState({ page: 1 }, "", "");
    };

    window.addEventListener("popstate", stopBackClose);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        setTimeout(() => {
          window.history.pushState({ page: 1 }, "", "");
        }, 10);
      }
    });

    return () => {
      window.removeEventListener("popstate", stopBackClose);
    };
  }, []);

  const [csvData, setCsvData] = useState([]);
  const [playersOptions, setPlayersOptions] = useState([]);
  const [courtsOptions, setCourtsOptions] = useState([]);
  const [roundsOptions, setRoundsOptions] = useState([]);

  const [selectedPlayers, setSelectedPlayers] = useState(
    sessionStorage.getItem("selectedPlayers") || ""
  );
  const [selectedCourts, setSelectedCourts] = useState(
    sessionStorage.getItem("selectedCourts") || ""
  );
  const [selectedNumRounds, setSelectedNumRounds] = useState(
    sessionStorage.getItem("selectedNumRounds") || ""
  );

  const [playerNames, setPlayerNames] = useState(
    JSON.parse(sessionStorage.getItem("playerNames") || "[]")
  );
  const previousNamesRef = useRef([]);
  const [filteredRounds, setFilteredRounds] = useState(
    JSON.parse(sessionStorage.getItem("filteredRounds") || "[]")
  );
  const [currentRoundIndex, setCurrentRoundIndex] = useState(
    parseInt(sessionStorage.getItem("currentRoundIndex") || "0", 10)
  );
  const [view, setView] = useState("input"); // input | schedule | matrix

  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);

  // Persist data to session storage
  useEffect(() => {
    sessionStorage.setItem("selectedPlayers", selectedPlayers);
  }, [selectedPlayers]);

  useEffect(() => {
    sessionStorage.setItem("selectedCourts", selectedCourts);
  }, [selectedCourts]);

  useEffect(() => {
    sessionStorage.setItem("selectedNumRounds", selectedNumRounds);
  }, [selectedNumRounds]);

  useEffect(() => {
    sessionStorage.setItem("playerNames", JSON.stringify(playerNames));
  }, [playerNames]);

  useEffect(() => {
    sessionStorage.setItem("filteredRounds", JSON.stringify(filteredRounds));
  }, [filteredRounds]);

  useEffect(() => {
    sessionStorage.setItem("currentRoundIndex", currentRoundIndex);
  }, [currentRoundIndex]);

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
      sessionStorage.clear();
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

  const onTouchStart = (e) => { touchStartXRef.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchMove = (e) => { touchEndXRef.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = () => {
    const s = touchStartXRef.current, e = touchEndXRef.current;
    if (s == null || e == null) return;
    const diff = s - e;
    const threshold = 50;
    if (diff > threshold) nextRound();
    if (diff < -threshold) prevRound();
    touchStartXRef.current = null; touchEndXRef.current = null;
  };

  // Matrix logic
  const renderMatrix = () => {
    if (!filteredRounds.length) return null;
    const names = playerNames.map((p, i) => p || String(i + 1));
    const n = names.length;

    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    const byesCount = Array(n).fill(0);

    filteredRounds.forEach((round) => {
      round.byes.forEach((b) => {
        const idx = parseInt(b, 10) - 1;
        if (idx >= 0 && idx < n) byesCount[idx]++;
      });
      round.matches.forEach((m) => {
        const all = [...m.team1, ...m.team2].map((x) => parseInt(x, 10) - 1);
        for (let i = 0; i < all.length; i++) {
          for (let j = 0; j < all.length; j++) {
            if (i !== j) matrix[all[i]][all[j]]++;
          }
        }
      });
    });

    return (
      <div className="overflow-auto max-h-[70vh]">
        <table className="border-collapse border border-gray-400 text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="border px-1 py-1 sticky left-0 z-20 bg-gray-100">Player</th>
              {names.map((n, i) => (
                <th key={i} className="border px-1 py-1">{n}</th>
              ))}
              <th className="border px-1 py-1">Byes</th>
              <th className="border px-1 py-1">Not played with</th>
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={i}>
                <td className="border px-1 py-1 font-semibold sticky left-0 bg-gray-100">{rowName}</td>
                {matrix[i].map((val, j) => {
                  const isTeammate = filteredRounds.some((r) =>
                    r.matches.some((m) =>
                      (m.team1.includes(String(i+1)) && m.team1.includes(String(j+1))) ||
                      (m.team2.includes(String(i+1)) && m.team2.includes(String(j+1)))
                    )
                  );
                  return (
                    <td
                      key={j}
                      className={`border px-1 py-1 text-center ${
                        i === j ? "bg-gray-400" :
                        isTeammate ? "bg-blue-300" : ""
                      }`}
                    >
                      {i === j ? "" : val>=0 ? val : ""}
                    </td>
                  );
                })}
                <td className="border px-1 py-1 text-center">{byesCount[i]}</td>
                <td className="border px-1 py-1 text-center">
                  {matrix[i].filter((v, j) => j !== i && v === 0).length}
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
      <div className="mx-auto max-w-sm bg-white rounded-2xl shadow p-3"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        {/* Refresh button on first page */}
        {view === "input" && (
          <div className="mb-2 flex justify-start">
            <button className="text-xs bg-red-500 text-white px-2 py-1 rounded shadow" onClick={handleRefresh}>🔄 Refresh</button>
          </div>
        )}

        <h1 className="text-center text-xl font-bold mb-1">🏓 Pickleball Scheduler</h1>
        {view === "schedule" && (
          <div className="text-center text-sm text-gray-600 mb-2">
            Players: {selectedPlayers} | Courts: {selectedCourts} | Rounds: {selectedNumRounds}
          </div>
        )}

        {/* rest of your input / schedule / matrix JSX remains unchanged */}
        {/* ... same as your original code ... */}
      </div>
    </div>
  );
}
