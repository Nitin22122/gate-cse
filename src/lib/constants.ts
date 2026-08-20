export const TIMER_URL = "https://daily-focus-timer-one.vercel.app/";

export const QUOTES = [
  "Doubt kills more dreams than failure ever will. Trust the process.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements are the key to staggering long-term results.",
  "You don't have to be extreme, just consistent.",
  "The rank is earned in the hours nobody sees.",
  "One more lecture. One more PYQ. One step closer.",
  "Motivation gets you started, habit keeps you going.",
];

export function quoteOfTheDay() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length]!;
}
