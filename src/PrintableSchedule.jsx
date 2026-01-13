import React, { forwardRef } from "react";

const PrintableSchedule = forwardRef(
  ({ csvData, numPlayers, rounds, playerNames, showNames }, ref) => {

    const display = (p) =>
      showNames ? `${p} (${playerNames[p] || ""})` : p;

    const buildRounds = () => {
      const output = [];

      for (let r = 1; r <= rounds; r++) {
        const roundData = csvData.filter(
          row =>
            parseInt(row.Players) === parseInt(numPlayers) &&
            parseInt(row.Round) === r
        );

        if (!roundData.length) continue;

        const row = roundData[0];
        const courts = {};
        const byes = [];

        Object.keys(row).forEach(key => {
          if (key.match(/^\d+[a-d]$/)) {
            const court = key.match(/^\d+/)[0];
            if (!courts[court]) courts[court] = {};
            courts[court][key.slice(-1)] = row[key];
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
      <div ref={ref}>
        {roundsData.map(r => (
          <div key={r.round} className="round">
            <div className="round-title">ROUND {r.round}</div>

            <div className="courts-row">
              {Object.keys(r.courts).map(courtNum => {
                const c = r.courts[courtNum];
                return (
                  <div key={courtNum} className="court">
                    <strong>C{courtNum}:</strong>{" "}
                    {display(c.a)} {display(c.b)}
                    <span className="vs">vs</span>
                    {display(c.c)} {display(c.d)}
                  </div>
                );
              })}
            </div>

            {r.byes.length > 0 && (
              <div className="byes">
                <strong>Byes:</strong>{" "}
                {r.byes.map(display).join(" ")}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

export default PrintableSchedule;
