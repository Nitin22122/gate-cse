export const TIMER_URL = "/timer";

export const QUOTES = [
  "Doubt kills more dreams than failure ever will. Trust the process.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements are the key to staggering long-term results.",
  "You don't have to be extreme, just consistent.",
  "The rank is earned in the hours nobody sees.",
  "One more lecture. One more PYQ. One step closer.",
  "Motivation gets you started, habit keeps you going.",
  "The expert in anything was once a beginner. Every lecture you watch today is a step toward AIR 1.",
  "Don't wish it were easier. Wish you were better. GATE rewards those who outwork everyone else.",
  "You don't rise to the level of your goals. You fall to the level of your systems. Build the system.",
  "It's not about having time. It's about making time. Open the sprint. Do the lecture.",
  "Hard work beats talent when talent doesn't work hard. And you're doing both.",
  "The pain of discipline is far less than the pain of regret. Study now. Celebrate in Feb 2027.",
  "One lecture at a time. One day at a time. That's how GATE gets cracked.",
  "Consistency over intensity. Show up every single day — that's the only secret.",
  "Your future self is watching you right now through your memories. Make them proud.",
  "Champions aren't made in the gyms. They're made from something deep inside — a desire, a dream, a vision.",
  "The difference between ordinary and extraordinary is that little 'extra'. Give it today.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Don't count the days. Make the days count.",
  "Knowledge is not power. Applied knowledge is power. Solve PYQs. Apply what you learn.",
  "Every hour you study today is an investment that compounds before Feb 6, 2027.",
  "The secret of getting ahead is getting started. Right now. Close this. Open the sprint.",
  "Doubt kills more dreams than failure ever will. Trust the process.",
  "Sleep when you're done. Rest when you've earned it. There's work to do today.",
  "You've already decided to crack GATE. Now let your daily actions prove it.",
  "The best time to study was yesterday. The second best time is right now.",
  "It always seems impossible until it's done. One day at a time.",
  "Your rank in GATE will be a direct reflection of the hours you put in this year.",
  "Motivation gets you started. Discipline keeps you going. Build discipline.",
];

export function quoteOfTheDay() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length]!;
}
