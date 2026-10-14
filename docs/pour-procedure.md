# Pilsner draught pour: what the game teaches, and where it comes from

Status: **sources found, not yet verified first-hand.** Everything below was
gathered from search-result excerpts; the source pages themselves could not be
opened from the build environment. Before any copy ships, someone should read
each source directly and update the "Checked" column.

The game keeps three kinds of rule apart. They are labelled in the code
(`PHYSICAL`, `SOURCED`, `GAME` in the `<script id="sim">` block) and here.

## 1. The procedure (SOURCED)

| Step | What the sources say | Sources | Checked |
|---|---|---|---|
| Tilt first | Hold the glass at about 45°, about an inch below the faucet. | Cicerone Certified Beer Server prep material; Ticket Fairy pourer SOP | no |
| Open fully | Pull the tap to fully open; a partly open faucet pours foamy. | Cicerone CBS prep; Ticket Fairy | no |
| Pour down the side | Let the beer run down the side of the tilted glass. | Cicerone; WebstaurantStore; Burkett | no |
| Start straightening | At about **half** full (Cicerone bottle-service guidance, WebstaurantStore) to about **two-thirds** full (Cicerone draft guide; Burkett citing American Bartenders School). Several sources say to tilt upright **gradually**. | as listed | no |
| Finish upright | Finish pouring into the middle of the glass to build the head. | Cicerone draft guide | no |
| Head | About **1 inch** for most American ales and lagers (Cicerone). Steam Whistle (a pilsner brewery) gives 1-1.5 inches. | Cicerone; Steam Whistle | no |
| Don't let the faucet touch the beer; close it cleanly | Keep the faucet out of the beer and close it quickly. | Ticket Fairy | no (not modelled) |

Source links (from search; confirm directly):

- Cicerone Certified Beer Server prep answers: https://www.cicerone.org/sites/default/files/pdfs/CBS_Prep_Talks/PrepTalks_Answers_07.pdf
- Cicerone bottled-beer service study notes: https://open-exam-prep.com/study-guides/cicerone-beer-server/keeping-and-serving-beer/bottled-canned-service
- Steam Whistle, "How to Pour a Pilsner": https://steamwhistle.ca/blogs/news/pilsner-pour-techniques-bottles-cans-kegs
- Ticket Fairy, pourer training SOPs: https://www.ticketfairy.com/blog/pourer-training-academy-draft-etiquette-service-sops-for-beer-festivals
- Burkett, "How to pour a perfect draft beer": https://www.burkett.com/blogs/resources/how-to-pour-a-perfect-draft-beer
- WebstaurantStore, "How to Pour the Perfect Pint" (bar management article)
- Brewers Association, *Draught Beer Quality Manual* (4th ed., 2019) covers pouring technique; not read. Probably the most authoritative US source to check first.

### Decision needed: which pilsner pour?

Czech pilsner tradition pours with far more foam. Pilsner Urquell's standard
*hladinka* has a thick head (the brewery describes about three fingers; one
news piece says about a quarter of the glass), and their *šnyt* and *mlíko*
are mostly foam. Sources:

- https://live.pilsnerurquell.com/stories/foam-is-flavour-three-pilsner-urquell-pours/
- https://business.inquirer.net/?p=252934

The game currently teaches the **general American draught standard** (about
45°, straighten at half to two-thirds, about a 1-inch head). If the fictional
brewery pours Czech-style, the head band and straightening point change, and
the copy should say which style it is.

## 2. Physical constraints (PHYSICAL)

These follow from the glass shape, not from any service guide.

- **The glass** is a tapered pilsner shape (`GLASS` in the sim: bottom half-width
  0.107, top 0.177, height 1). Volume is the area of that 2D section. That is a
  simplification, but the sim and the renderer use the same functions, so the
  drawn level is always the scored level.
- **Spill limit.** A tilted glass holds less before beer reaches the lower lip:
  about 79% of its volume at 45°, 66% at 60°, 100% upright. Past that, beer
  spills, head first. This is why staying tilted to the end fails on its own,
  without a rule to forbid it.
- **Level and head are measured as heights in the upright glass**, which is
  what the player sees and what "an inch of head" means.

## 3. Game rules (GAME, placeholders)

| Rule | Value | Why it exists |
|---|---|---|
| Fill zone | 93-97% of glass height, centred on the drawn LINE at 95% (v2.2 and earlier: 91-95%) | Gives a target; real service is "near the top". Centred so releasing at the line passes. |
| Head band | 8-16% of glass height | About 0.7-1.3 inches on a pint-size pilsner, around the sourced 1 inch. |
| Spill allowed | ≤ 2% | Some drips are normal. |
| "Tilted" | ≥ 35° at the moment the tap opens | A forgiving reading of "about 45°". |
| "Upright" | ≤ 15° | |
| Finish upright | Tap last closed at ≤ 15°, after ≥ 0.5 s of upright pouring | So a flick upright at the last instant does not count. |
| Straightening window (feedback) | 50-67% full | The sourced half-to-two-thirds range. Used to say *early* or *late*, not to fail on its own. |
| Head holds after the tap closes | | So the time taken to press Serve can't change the verdict. |
| Bring-up style (v2.3) | "Gradual" if reaching upright takes ≥ 0.8 s after straightening starts | Information only, shown in the debrief. Reflects the sourced "gradually"; never scored. |
| Pad travel (v2.3) | 70 px of thumb slide per 45°, 8 px dead zone | Comfortable on a phone without being twitchy. |
| Staged straighten rate | 18°/s (about 2.5 s from 45°) | Fixed and predictable; it does not adapt to the fill, so starting early or late still shows. |
| BRING UP mark (v2.1) | 50-67% of glass height | The sourced range, drawn on the glass as a training mark in Watch and Guided. Not on real glassware. |
| Live action verdicts (v2.2) | Straighten: early < 37%, a little early 37-50%, in range 50-67%, a little late 67-71%, late > 71%. Stop: the fill zone. | Bands measured against the scoring so a verdict can't contradict the result. |
| Dial stages (v2.1 only) | Tilted until the level reaches 50%; then bring up; "upright" once the glass is ≤ 15° | One sourced trigger. No second fill number. |
| Coaching zone | Lower edge 30° until half full, then down to upright by 72%; upper edge is the spill limit minus 2% | v2 only. In v2.1 it is no longer shown; it remains only as the logged `zoneShare`. Never scored. |
| Foam model | `k` 0.4, `d` 0.08, `r` 0.3, flow 0.12/s | Tuned so the demo lands mid-band. Not measured from real beer. |

## 4. How the game assesses

**Pass = technique + pour.**

- Technique: *tilted first* and *finished upright*. These are the two steps a
  learner can plainly get wrong.
- Pour: head, level and spill inside the bands above.

Straightening timing is not a pass/fail rule by itself. It shows up in the
head it produces, and the feedback names it ("you started straightening early,
at about 38% full"). Leaving the coaching zone briefly does not fail a pour.
With the current tuning, a player who straightens anywhere from about 40% to
65% full and stops in the fill zone passes.
