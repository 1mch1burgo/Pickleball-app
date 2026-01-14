import React, { forwardRef } from "react";

const PrintableSchedule = forwardRef(
  ({ csvData, numPlayers, rounds, playerNames, showNames }, ref) => {

    // Helper to display player number with optional name
    const display = (p) => (showNames ? `${p} (${playerNames[p] || ""})` : p);

    // Build rounds data from CSV
    const buildRounds = () => {
      const output = [];

      for (let r = 1; r <= rounds; r++) {
        const roundData = csvData.filter(
          (row) =>
            parseInt(row.Players) === parseInt(numPlayers) &&
            parseInt(row.Round) === r
        );

        if (!roundData.length) continue;

        const row = roundData[0];
        const courts = {};
        const byes = [];

        Object.keys(row).forEach((key) => {
          if (/^\d+[a-d]$/.test(key)) {
            const courtNum = key.match(/^\d+/)[0];
            if (!courts[courtNum]) courts[courtNum] = {};
            courts[courtNum][key.slice(-1)] = row[key];
          } else if (key.startsWith("b") && row[key] && row[key] !== "x") {
            byes.push(row[key]);
          }
        });

        output.push({ round: r, courts, byes });
      }

      return output;
    };

    const roundsData = buildRounds();

    return (
      <div ref={ref} className="printable-schedule">
        {roundsData.map((r) => (
          <div key={r.round} className="round mb-6">
            <h3 className="text-xl font-bold mb-2">ROUND {r.round}</h3>

            <div className="space-y-2">
              {Object.keys(r.courts).map((courtNum) => {
                const c = r.courts[courtNum];
                return (
                  <div key={courtNum} className="court p-2 border rounded">
                    <strong>Court {courtNum}:</strong>{" "}
                    {display(c.a)} {display(c.b)}{" "}
                    <span className="font-semibold">vs</span>{" "}
                    {display(c.c)} {display(c.d)}
                  </div>
                );
              })}
            </div>

            {r.byes.length > 0 && (
              <div className="byes mt-2">
                <strong>Byes:</strong> {r.byes.map(display).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

export default PrintableSchedule;
