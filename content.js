// Lesson content: Investing vs Trading vs Gambling
// Everything students read lives here so it can be edited in one place.
// Pre-test and post-test answer keys are NOT here. They are a secret on the Worker.
// If you change scenarios s7 to s12, the CER prompts, or the rubric, the Worker copy (itg-content.js) must change too.
window.LESSON = {
  id: "itg-2026-11-24",
  title: "Invest, Trade, or Bet?",
  classCodes: ["2B", "4B"],

  phases: [
    { id: "pre", name: "Pre-test", minutes: 6 },
    { id: "hook", name: "Question of the day", minutes: 2 },
    { id: "table", name: "Three ways to use money", minutes: 8 },
    { id: "lab", name: "Simulation lab", minutes: 14 },
    { id: "cer", name: "CER practice", minutes: 10 },
    { id: "sort", name: "Scenario sorter", minutes: 8 },
    { id: "post", name: "Post-test", minutes: 11 },
    { id: "done", name: "Wrap up", minutes: 1 }
  ],

  // ---------- PRE-TEST ----------
  pre: {
    mc: [
      {
        id: "pre1",
        q: "Kayla checks crypto prices all day and buys and sells within a few hours, hoping to profit from price swings. Which statement BEST describes her approach?",
        choices: [
          "She is investing, because she owns crypto",
          "She is trading, which carries more risk because it depends on correctly predicting short-term price moves",
          "She is investing, because crypto grows about 7% per year",
          "She is trading, which lowers her risk because she never holds anything for long"
        ],
        tag: "trading"
      },
      {
        id: "pre2",
        q: "All of the following are true about investing in an S&P 500 index fund, EXCEPT...",
        choices: [
          "You own small pieces of hundreds of companies",
          "It guarantees you will never lose money",
          "Its value can go down in the short term",
          "It has historically grown over long periods of time"
        ],
        tag: "investing"
      },
      {
        id: "pre3",
        q: "Ava invests $1,000 at age 20. Ben invests $1,000 at age 45. Neither adds more money, and both earn the same average return until age 65. Which statement BEST explains the outcome?",
        choices: [
          "Ava ends with more money because her money had more years to grow",
          "Ava ends with more money because younger people earn a higher rate of return",
          "Ben ends with more money because his money had less time to lose value",
          "They end with the same amount because they each invested $1,000"
        ],
        tag: "time"
      },
      {
        id: "pre4",
        q: "A sports bettor places $10 bets. A win pays $9 and a loss costs $10. If he wins exactly half of his bets, what happens over many bets?",
        choices: [
          "He breaks even",
          "He slowly loses money",
          "He slowly makes money",
          "He doubles his money"
        ],
        tag: "house-edge"
      },
      {
        id: "pre5",
        q: "Why do lotteries offer lots of small $4 and $7 prizes?",
        choices: [
          "Because the law requires every player to win something",
          "To keep players feeling like they are winning, while paying out very little",
          "Because small prizes cost the lottery more money than the jackpot",
          "To make the jackpot easier to win"
        ],
        tag: "gambling"
      }
    ],
    cer: {
      id: "preCER",
      prompt: "Your friend says buying $20 of lottery tickets every week is a smart way to get rich. Is she right? Write a Claim, Evidence, and Reasoning.",
      factBox: [
        "Odds of winning the Powerball jackpot: about 1 in 292 million",
        "Odds of winning ANY Powerball prize: about 1 in 25, and most prizes are $4 or $7",
        "Americans spent about $109 billion on lottery tickets in 2025",
        "$20 a week is $1,040 a year"
      ]
    }
  },

  // ---------- POST-TEST ----------
  post: {
    mc: [
      {
        id: "post1",
        q: "Marcus checks stock prices several times a day and often buys and sells shares within the same week, hoping to profit from price swings. Which statement BEST describes his approach?",
        choices: [
          "He is investing, because he is putting his money into the stock market",
          "He is trading, which carries more risk because it depends on correctly predicting short-term price movements",
          "He is investing, because he is counting on the market's long-term average growth of about 7% per year",
          "He is trading, which lowers his risk because he never holds any single stock for long"
        ],
        tag: "trading", source: "NGPF exit ticket"
      },
      {
        id: "post2",
        q: "All of the following are reasons to invest, EXCEPT...",
        choices: [
          "To minimize the impact of inflation on purchasing power",
          "To earn a consistent rate of return with lower risk than typical savings accounts",
          "To build wealth by reinvesting your returns and letting them grow",
          "To earn higher average rates of return than you would in a typical savings account"
        ],
        tag: "investing", source: "NGPF exit ticket"
      },
      {
        id: "post3",
        q: "James and Tomas each invest $2,000 and never add more money. James invests at age 25, and Tomas invests at age 40. Both earn the same average annual return of 7% until age 65. Which statement BEST explains the outcome?",
        choices: [
          "James ends with more money because his investment had more years to grow",
          "James ends with more money because early investments earn a higher rate of return",
          "Tomas ends with more money because his investment had less time to lose value",
          "They end with the same amount because they each invested the same amount"
        ],
        tag: "time", source: "NGPF exit ticket"
      },
      {
        id: "post4",
        q: "Casey bets $10 a day. A win pays $9 and a loss costs $10. To break even, about what percent of bets does he need to win?",
        choices: ["45%", "50%", "About 53%", "75%"],
        tag: "house-edge"
      },
      {
        id: "post5",
        q: "Which of these is gambling?",
        choices: [
          "Putting $100 a month into an index fund for 30 years",
          "Betting $25 on a game where the sportsbook keeps a cut of every bet",
          "Buying a stock in the morning and selling it in the afternoon",
          "Putting money in a savings account"
        ],
        tag: "gambling"
      }
    ],
    cer: {
      id: "postCER",
      prompt: "Your cousin wants to get rich by betting $10 a day on sports. Should he? Write a Claim, Evidence, and Reasoning. Use at least one number from your notes sheet.",
      factBox: null
    }
  },

  // ---------- HOOK ----------
  hook: {
    q: "How much do Americans spend on lottery tickets each year?",
    choices: ["$1 billion", "$12 billion", "$55 billion", "$109 billion"],
    answer: 3,
    reveal: "About $109 billion in 2025 (Statista)."
  },

  // ---------- 3-COLUMN TABLE ----------
  table: {
    rows: [
      { label: "What you do", investing: "Buy and hold something that can grow", trading: "Buy and sell fast to profit from price swings", gambling: "Bet money on an outcome" },
      { label: "Time frame", investing: "Years to decades", trading: "Minutes to weeks", gambling: "Seconds to one game" },
      { label: "Who has the odds?", investing: "Over long periods, the odds have favored you", trading: "Hard to call, most short-term traders lose to the market", gambling: "The house, every time" },
      { label: "Everyday analogy", investing: "Planting an orchard", trading: "Flipping sneakers", gambling: "A carnival game" }
    ],
    blanks: [
      { id: "t1", text: "Investing is about the ____ term.", answers: ["long"] },
      { id: "t2", text: "Trading depends on predicting ____-term price moves.", answers: ["short"] },
      { id: "t3", text: "In gambling, the ____ always has the edge.", answers: ["house", "casino", "sportsbook"] }
    ]
  },

  // ---------- SIM LAB ----------
  lab: {
    jordan: {
      url: "https://dqydj.com/sp-500-periodic-reinvestment-calculator-dividends/",
      steps: [
        "Open the S&P 500 calculator (button below).",
        "Set the starting month to November 2016.",
        "Set the ending month to the newest month it allows.",
        "Starting amount: $0. Monthly investment: $300.",
        "Leave everything else alone. Click Calculate.",
        "Type the Final Portfolio Value below."
      ],
      invested: 36000
    },
    casey: { dailyBet: 10, winPays: 9, lossCosts: 10, winRate: 0.5, monthlyDeposit: 300, years: 10, runs: 5 },
    powerball: { ticket: 2, budgets: [100, 1000, 10000] }
  },

  // ---------- CER PRACTICE ----------
  cer: {
    detective: "Evidence is the CLUE. Reasoning is the detective explaining what the clue MEANS.",
    tests: {
      C: "Claim: your answer. One sentence. Could start with Yes or No.",
      E: "Evidence: something you can POINT TO. A number, a fact, something you saw.",
      R: "Reasoning: WHY the evidence proves the claim. Usually has because, so, or this means."
    },
    dailyLife: [
      { topic: "Weather", C: "I should bring a jacket today.", E: "My weather app says it will be 41 degrees at 3 pm.", R: "41 degrees is cold enough that I'll be freezing walking to my car, so a jacket keeps me comfortable." },
      { topic: "Phone", C: "I need to charge my phone before practice.", E: "My battery is at 12%.", R: "12% won't last the 3 hours I'll be gone, so my phone will die before I can call for a ride." },
      { topic: "Food", C: "This milk has gone bad.", E: "The date says Nov 10 and it smells sour.", R: "Milk two weeks past its date that smells sour has spoiled, so drinking it could make me sick." },
      { topic: "Sports", C: "Coach should start Jayden at quarterback.", E: "Jayden completed 70% of his passes in the last 3 games.", R: "Completing more passes means fewer turnovers, which gives the team a better chance to win." },
      { topic: "Shopping", C: "The 2-pack is the better deal.", E: "One costs $3. The 2-pack costs $5.", R: "The 2-pack works out to $2.50 each, so I save 50 cents on every one." },
      { topic: "Gaming", C: "The Wi-Fi is making my game lag.", E: "My ping jumped from 30 to 250 when my brother started streaming.", R: "A higher ping means a slower connection, and it spiked right when he started using the internet." }
    ],
    openers: {
      C: ["I think...", "I believe...", "My answer is...", "Yes, ___ should...", "No, ___ should not...", "___ is an example of (investing / trading / gambling).", "The better choice is..."],
      E: ["The data shows...", "In the simulation, ...", "According to my notes, ...", "I saw that...", "For example, ...", "___ out of ___ times, ...", "The number ___ shows that..."],
      R: ["This shows that... because...", "This matters because...", "This means...", "Because of the house edge, ...", "Over a long time, this means...", "This proves my claim because...", "If this keeps happening, ..."]
    },
    items: [
      {
        id: "c1", type: "match", title: "Matching: running late",
        prompt: "Match each sentence to Claim, Evidence, or Reasoning.",
        sentences: [
          { text: "It's 7:52 and the bus comes at 7:55.", answer: "E" },
          { text: "I'm going to miss the bus.", answer: "C" },
          { text: "It takes me 6 minutes to walk to the stop, so 3 minutes isn't enough time.", answer: "R" }
        ]
      },
      {
        id: "c2", type: "label", title: "Label it: Casey's bets",
        prompt: "Label each sentence C, E, or R.",
        sentences: [
          { text: "Betting $10 a day is not a good way for Casey to build wealth.", answer: "C" },
          { text: "In my simulation, Casey lost money in all 5 of his 10-year runs.", answer: "E" },
          { text: "A win only pays $9 but a loss costs $10, so even winning half the time slowly drains his money.", answer: "R" },
          { text: "Casey finished only 1 out of 10 years with a profit.", answer: "E" }
        ]
      },
      {
        id: "c3", type: "mc", title: "Spot the mistake",
        prompt: "Dante wrote this CER. Which part did he label WRONG?\n\nClaim: Jordan made a smart choice.\nEvidence: Jordan put in $36,000 and ended with way more than that.\nReasoning: Jordan's account was worth more than he put in.",
        choices: [
          "The Claim is really Evidence",
          "The Reasoning is really more Evidence. It repeats what happened instead of explaining WHY",
          "The Evidence is really the Claim",
          "Nothing is wrong"
        ],
        answer: 1,
        explain: "His 'reasoning' just repeats a fact you can point to. Real reasoning explains why: the index fund owns real companies that grow over time, so time works for Jordan."
      },
      {
        id: "c4", type: "fill", title: "Fill in the blank",
        prompt: "Complete the Reasoning: \"Because the sportsbook keeps a small cut called the ______ ______, a bettor who wins half the time loses money over time.\"",
        answers: ["house edge", "the house edge", "vig", "vigorish", "juice"],
        explain: "The house edge is the built-in advantage. It's why a win pays $9 instead of $10."
      },
      {
        id: "c5", type: "label", title: "Label it: Jordan's plan",
        prompt: "Label each sentence C, E, or R.",
        sentences: [
          { text: "Over 10 years, Jordan's $300 a month grew to more than the $36,000 he put in.", answer: "E" },
          { text: "An index fund owns pieces of hundreds of companies, so when those companies grow over years, Jordan's money grows with them.", answer: "R" },
          { text: "Jordan's plan was a better way to build wealth than Casey's.", answer: "C" }
        ]
      },
      {
        id: "c6", type: "mc", title: "Pick the best evidence",
        prompt: "Claim: The lottery is a bad way to get rich. Which is the BEST evidence?",
        choices: [
          "The lottery is really bad.",
          "The odds of winning the Powerball jackpot are about 1 in 292 million.",
          "This means you will probably lose your money.",
          "My uncle says it's a waste."
        ],
        answer: 1,
        explain: "Evidence is something you can point to, like a number. 'This means...' is reasoning. 'My uncle says' is an opinion, not a fact."
      },
      {
        id: "c7", type: "mc", title: "Pick the best reasoning",
        prompt: "Claim: Day trading is riskier than investing.\nEvidence: Most day traders lose money over a year.\nWhich is the BEST reasoning?",
        choices: [
          "Day traders buy and sell a lot.",
          "Most day traders lose money.",
          "Day traders have to guess short-term price swings correctly over and over, and one bad guess can wipe out a week of gains, so the risk keeps adding up.",
          "I would never day trade."
        ],
        answer: 2,
        explain: "Choice C explains WHY the evidence proves the claim. B just repeats the evidence. A is a fact without a 'why.' D is an opinion."
      },
      {
        id: "c8", type: "short", title: "Write the Reasoning",
        prompt: "Claim: I should not spend my whole paycheck on scratch-offs.\nEvidence: I spent $50 on scratch-offs and won back $12.\nWrite ONE Reasoning sentence. Use an opener like \"This shows... because...\"",
        model: "This shows I lost $38, and because the lottery is designed to pay out less than it takes in, spending more would most likely mean losing more.",
        keywords: ["because", "so", "means", "shows", "since", "therefore"]
      }
    ]
  },

  // ---------- SCENARIO SORTER ----------
  sorter: {
    round1: [
      { id: "s1", text: "Maya puts $50 a month into an S&P 500 index fund and plans to leave it until she's 60.", answer: "investing", why: "Long time frame and she owns pieces of hundreds of companies." },
      { id: "s2", text: "Devon buys a hyped stock at 9:45 am and sells it at 2 pm to grab a quick jump.", answer: "trading", why: "Bought and sold the same day to profit from a price swing." },
      { id: "s3", text: "Jalen puts $20 on a 4-team parlay for Sunday's games.", answer: "gambling", why: "A bet on game outcomes where the sportsbook sets the odds." },
      { id: "s4", text: "Aria spends $100 on scratch-offs hoping to hit $10,000.", answer: "gambling", why: "The lottery pays out less than it takes in. The house has the edge." },
      { id: "s5", text: "The market drops 20%, and Sam keeps adding $100 a month to his index fund.", answer: "investing", why: "He holds through a short-term drop because he's in it for the long term." },
      { id: "s6", text: "Priya buys shares of a company the day before it reports earnings and plans to sell the next morning.", answer: "trading", why: "A one-day bet on a price move. Short time frame." }
    ],
    round2: [
      { id: "s7", text: "Chris buys a meme coin because TikTok says it will \"moon\" this week. He plans to sell Friday.", answer: "trading", accept: ["trading", "gambling"], why: "Short time frame on a price swing. It's so hype-driven it acts a lot like gambling, so either label works with strong reasoning." },
      { id: "s8", text: "Elijah's grandma gives him $500. He puts it in a retirement fund and won't touch it for 40 years.", answer: "investing", why: "Very long time frame, money stays invested to grow." },
      { id: "s9", text: "Nia plays $5 hands of online blackjack on her phone.", answer: "gambling", why: "A casino game where the house has a built-in edge." },
      { id: "s10", text: "Owen uses an app to buy and sell Tesla shares about 15 times a week.", answer: "trading", why: "Frequent buying and selling to catch short-term price moves." },
      { id: "s11", text: "Bella buys 10 Super Bowl squares at $10 each.", answer: "gambling", why: "Money on a game outcome decided by chance." },
      { id: "s12", text: "Leo researches 3 companies, buys their shares, and plans to hold them for 10+ years.", answer: "investing", why: "Owns businesses he researched for the long term." }
    ]
  },

  rubric: {
    4: "Clear claim. Specific evidence with a number. Reasoning explains WHY using an idea from class (house edge, time, owning companies).",
    3: "All three parts. Reasoning is there but general.",
    2: "A part is missing, or evidence and reasoning are mixed up.",
    1: "Claim only, or off topic."
  }
};
