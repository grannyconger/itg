// Pure simulation math, shared by the student page and tests.
window.Sims = {
  // Casey: bets every day, $300 deposited at the start of each month, no bet if he can't cover it.
  casey(o, rand) {
    rand = rand || Math.random;
    let balance = 0, total = 0;
    const months = [], years = [];
    for (let y = 0; y < o.years; y++) {
      let yr = 0;
      for (let m = 0; m < 12; m++) {
        balance += o.monthlyDeposit;
        let mo = 0;
        for (let d = 0; d < 30; d++) {
          if (balance < o.dailyBet) continue;
          const win = rand() < o.winRate;
          const pl = win ? o.winPays : -o.lossCosts;
          balance += pl; mo += pl;
        }
        months.push(mo); yr += mo;
      }
      years.push(yr); total += yr;
    }
    return {
      total,
      deposited: o.monthlyDeposit * 12 * o.years,
      pctMonthsUp: Math.round((months.filter((x) => x > 0).length / months.length) * 100),
      yearsUp: years.filter((x) => x > 0).length,
      years
    };
  },

  // Powerball: 5 white balls 1-69 (no repeats) + red Powerball 1-26. $2 per ticket.
  PRIZES: { "5P": "JACKPOT", "5": 1000000, "4P": 50000, "4": 100, "3P": 100, "3": 7, "2P": 7, "1P": 4, "0P": 4 },
  draw(rand) {
    rand = rand || Math.random;
    const w = new Set();
    while (w.size < 5) w.add(1 + Math.floor(rand() * 69));
    return { white: [...w], pb: 1 + Math.floor(rand() * 26) };
  },
  powerball(pick, tickets, rand) {
    let won = 0, wins = 0, biggest = 0, jackpot = false;
    const counts = {};
    for (let i = 0; i < tickets; i++) {
      const d = this.draw(rand);
      const hits = pick.white.filter((n) => d.white.includes(n)).length;
      const k = hits + (pick.pb === d.pb ? "P" : "");
      const prize = this.PRIZES[k];
      if (!prize) continue;
      wins++; counts[k] = (counts[k] || 0) + 1;
      if (prize === "JACKPOT") { jackpot = true; continue; }
      won += prize; biggest = Math.max(biggest, prize);
    }
    return { tickets, spent: tickets * 2, won, wins, biggest, jackpot, counts };
  }
};
