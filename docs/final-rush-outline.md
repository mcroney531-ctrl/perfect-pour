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
- **Stout overlap:** kept as an architectural capability (park, pure `advance()`, resume), so a stout can settle while the next order is poured. **Whether to enable it is decided later.** Until then, the settle plays in place.

## Scoring (results screen)
Per order:
- Pass or fail, with the station's own primary cause line.
- Time against target.

**Shift summary:**
- Correct pours out of 6, the headline.
- Then the precision notes and the time notes.

**Rating:**
- Labels such as "Rush Complete" or "Excellent Shift".
- **Never "Ready for service"** or any wording that implies real-world bartending qualification. Final Rush completion is a virtual training achievement, consistent with the M6 certificate wording.
- The rating weights passes far above time: time only separates equal pass counts.

**Certification and unlock (locked):**
- Final Rush unlocks only when **all three stations are certified**.
- It has its own completion mark.
- Rush does not replace station certification, and a Rush pour does not count toward it.

## What it reuses
- The station modules unchanged, through the contract (`mode`, `lockMode`, `order`, `served.durationS`, the optional `park`/`advance`/`resume`).
- Progress: a **separate** `finalRush` completion record, a top-level sibling of `stations`, not a fourth entry in it. That way the "X of 3 certified" count and the three-station certification collection stay untouched. It requires the backward-compatible progress loading first (architecture §6.1).
- The hub anchor already exists (`hub-scenes.js` `finalRush` on the floor medallion).

## Not in v1
- Customers, tips, rounds and leaderboards.
- Speed-run modes.
- Pours running at the same time (only one station is mounted at a time).

## Open decisions
1. Whether to enable stout parking (the capability stays in the architecture).
2. Exact rating labels (within the wording rule above) and the time-target multiplier.
3. Number of orders: 6, or 5–8?
