# Final Rush outline — for review

**Status:** outline only. Nothing is implemented.
**Prerequisite:** all three stations are playable.

## Purpose
- Final Rush checks **retention and switching**: can the learner pour each beer correctly when orders are mixed and a little time pressure is on?
- It keeps the north star: procedure first, precision second, speed third.
- Speed never outweighs a correct pour.

## Shape
- **Orders:** about **6 mixed orders** per shift, for example Pilsner, Stout, Hefeweizen, Pilsner, Hefeweizen, Stout.
  - The sequence is deterministic per attempt seed (testable, no randomness in sims).
  - It never puts the same beer three times in a row.
- **Mode:** each order mounts the station module in **Solo with the tabs locked** (`ctx.mode = 'solo'`, `lockMode = true`).
  - No marks, no cues and no hints: independent recall.
- **Rush HUD (owned by the shell):**
  - An order ticket ("Table 4: Nitro Stout").
  - A soft shift clock.
  - The orders done.
  - A "settling" chip when a stout is parked.
- **Gentle time pressure:**
  - Each order has a generous target time: about 2× the Watch demo duration, GAME.
  - Going over shows "a little slow" in the results. It never fails the order and never ends the shift.
  - No countdown buzzer, no lives.
- **Stout overlap (optional):**
  - After stage one, the stout can be parked (`park()`) while the next order is poured. Rush advances it with the stout module's pure `advance()`.
  - A ticket prompts the return for the top-up.
  - Owner decision. Without it, the settle plays in place.

## Scoring (results screen)
Per order:
- Pass or fail, with the station's own primary cause line.
- Time against target.

**Shift summary:**
- Correct pours out of 6, the headline.
- Then the precision notes and the time notes.

**Rating:**
- Example: all six passes = "Ready for service".
- The rating weights passes far above time: time only separates equal pass counts.
- Labels are GAME and the owner's choice.

**Certification:**
- Rush does **not** replace station certification.
- Proposed: Final Rush unlocks once all three stations are certified, and has its own completion mark.
- A Rush pour does not count toward station certification (each station already has its own Solo gate).

## What it reuses
- The station modules unchanged, through the contract (`mode`, `lockMode`, `order`, `served.durationS`, the optional `park`/`advance`/`resume`).
- Progress: a new `finalRush` record. **Requires the progress migration first** (architecture §6.1).
- The hub anchor already exists (`hub-scenes.js` `finalRush` on the floor medallion).

## Not in v1
- Customers, tips, rounds and leaderboards.
- Speed-run modes.
- Pours running at the same time (only one station is mounted at a time).

## Open decisions
1. Unlock rule: all three certified, or always open?
2. Stout parking in v1, or the settle in place?
3. Rating labels and the time-target multiplier.
4. Number of orders: 6, or 5–8?
