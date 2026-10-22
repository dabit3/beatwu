export type Suit = "♠" | "♥" | "♦" | "♣";

export const SUITS: readonly Suit[] = ["♠", "♥", "♦", "♣"];

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Rank = (typeof RANKS)[number];

export interface PlayingCard {
  rank: Rank;
  suit: Suit;
  value: number;
}

const SUIT_NAME: Record<Suit, string> = { "♠": "spades", "♥": "hearts", "♦": "diamonds", "♣": "clubs" };
const RANK_NAME: Partial<Record<Rank, string>> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

export function card(rank: Rank, suit: Suit): PlayingCard {
  return { rank, suit, value: RANKS.indexOf(rank) + 1 };
}

export function isRed(suit: Suit): boolean {
  return suit === "♥" || suit === "♦";
}

export function cardName(c: PlayingCard): string {
  return `${RANK_NAME[c.rank] ?? c.rank} of ${SUIT_NAME[c.suit]}`;
}

export function fullDeck(): PlayingCard[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => card(rank, suit)));
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
