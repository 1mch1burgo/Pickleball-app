import { useRef, useState, useEffect } from "react";

import { useReactToPrint } from "react-to-print";
import PrintableSchedule from "./PrintableSchedule";
import "./print.css";
import Papa from "papaparse";
import scheduleData from "./schedule.csv";

export default function PickleballSchedulerApp() {
  const [csvData, setCsvData] = useState([]);
  const [numPlayers, setNumPlayers] = useState("");
  const [playerNames, setPlayerNames] = useState({});
  const [rounds, setRounds] = useState("");
  const [step, setStep] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
const printRef = useRef();
const [showNames, setShowNames] = useState(false);

const maxCourts = csvData.length
  ? Math.max(
      ...csvData
        .filter(r => parseInt(r.Players) === parseInt(numPlayers))
        .map(r =>
          Object.keys(r).filter(k => k.match(/^\d+[a-d]$/))
            .map(k => parseInt(k))
            .length / 4
        )
    )
  : 0;

const handlePrint = useReactToPrint({
  content: () => printRef.current,
  onBeforePrint: () => {
    document.body.classList.toggle("landscape", maxCourts >= 4);
  },
  onAfterPrint: () => {
    document.body.classList.remove("landscape");
  }
});

  useEffect(() => {
    Papa.parse(scheduleData, {
      download: true,
      header: true,
      complete: (result) => setCsvData(result.data.filter(r => r.Players && r.Players.trim() !== "")),
    });
  }, []);

  const handleNameChange = (num, name) => {
    setPlayerNames((prev) => ({ ...prev, [num]: name }));
  };

  const getScheduleForRound = (roundNumber) => {
    if (!csvData.length) return [];
    const filtered = csvData.filter(
      (r) => parseInt(r.Players) === parseInt(numPlayers) && parseInt(r.Round) === roundNumber
    );
    return filtered;
  };

  const renderRound = (roundNumber) => {
    const data = getScheduleForRound(roundNumber);
    if (!data.length) return <p className="text-gray-500">No data for this round.</p>;

    const firstRow = data[0];
    const courts = [];
    const byes = [];

    // extract all court positions (e.g., 1a, 1b, 1c, 1d, 2a, 2b, etc.)
    Object.keys(firstRow).forEach((key) => {
      if (key.match(/^\d+[a-d]$/)) {
        const courtNum = key.match(/^\d+/)[0];
        if (!courts[courtNum]) courts[courtNum] = {};
        courts[courtNum][key.slice(-1)] = firstRow[key];
      } else if (key.startsWith("b")) {
        if (firstRow[key] && firstRow[key] !== "x") byes.push(firstRow[key]);
      }
    });

    return (
      <div className="space-y-4">
        {Object.keys(courts).map((courtNum) => {
          const c = courts[courtNum];
          const team1 = `${playerNames[c["a"]] || `P${c["a"]}`} & ${playerNames[c["b"]] || `P${c["b"]]`}`;
          const team2 = `${playerNames[c["c"]] || `P${c["c"]}`} & ${playerNames[c["d"]] || `P${c["d"]]`}`;
          return (
            <div key={courtNum} className="bg-white rounded-xl p-4 shadow">
              <h3 className="font-bold text-lg mb-2">Court {courtNum}</h3>
              <p className="text-gray-700">{team1} vs {team2}</p>
            </div>
          );
        })}
        {byes.length > 0 && (
          <div className="bg-gray-100 rounded-xl p-4">
            <h3 className="font-semibold">Byes:</h3>
            <p>{byes.map((b) => playerNames[b] || `P${b}`).join(", ")}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto bg-white shadow-xl rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Pickleball Scheduler</h1>

        {step === 1 && (
          <div className="space-y-4">
            <label className="block">
              Number of Players:
              <input
                type="number"
                value={numPlayers}
                onChange={(e) => setNumPlayers(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </label>
            <label className="block">
              Number of Rounds:
              <input
                type="number"
                value={rounds}
                onChange={(e) => setRounds(e.target.value)}
                className="border p-2 w-full rounded"
              />
            </label>
            <button
              onClick={() => setStep(2)}
              disabled={!numPlayers || !rounds}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Enter Player Names</h2>
            {[...Array(Number(numPlayers))].map((_, i) => (
              <input
                key={i}
                placeholder={`Player ${i + 1} name`}
                value={playerNames[i + 1] || ""}
                onChange={(e) => handleNameChange(i + 1, e.target.value)}
                className="border p-2 w-full rounded"
              />
            ))}
            <button
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white px-4 py-2 rounded w-full"
            >
              Generate Schedule
            </button>
          </div>
        )}

     {step === 3 && (
  <div className="space-y-6">
    {/* Round header */}
    <h2 className="text-lg font-bold text-center">
      Round {currentRound} of {rounds}
    </h2>

    {/* Render current round schedule */}
    {renderRound(currentRound)}

    {/* Navigation buttons */}
    <div className="flex justify-between mt-4">
      <button
        onClick={() => setCurrentRound((r) => Math.max(1, r - 1))}
        disabled={currentRound === 1}
        className="bg-gray-300 text-black px-4 py-2 rounded disabled:opacity-50"
      >
        Previous
      </button>

      <button
        onClick={() => setCurrentRound((r) => Math.min(Number(rounds), r + 1))}
        disabled={currentRound >= Number(rounds)}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>

    {/* Print controls */}
    <div className="mt-6 border-t pt-4 space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={showNames}
          onChange={(e) => setShowNames(e.target.checked)}
        />
        Include player names
      </label>

      <button
        onClick={handlePrint}
        className="bg-green-600 text-white px-4 py-2 rounded w-full"
      >
        🖨 Print full schedule
      </button>
    </div>

    {/* Hidden PrintableSchedule for printing */}
    <div style={{ display: "none" }}>
      <PrintableSchedule
        ref={printRef}
        csvData={csvData}
        numPlayers={numPlayers}
        rounds={rounds}
        playerNames={playerNames}
        showNames={showNames}
      />
    </div>
  </div>
)}

/* Close main containers properly */
      </div> {/* closes max-w-xl */}
    </div>   {/* closes min-h-screen */}
