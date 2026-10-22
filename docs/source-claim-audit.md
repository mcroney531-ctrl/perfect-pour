# Source and CLAIM audit — for review

**Status:** proposed corrections only. No copy, sim or scoring was changed
in this pass.

## How the sources were accessed (read this first)

**No primary source was opened first-hand.** The build environment's network
policy refuses the source sites. Direct fetches from this pass:

| Host | Result |
|---|---|
| `www.brewersassociation.org` | proxy 403 |
| `www.cicerone.org` | proxy 403 |
| `www.guinness.com` | proxy 403 |
| `www.draughtquality.org` | proxy 403 |
| `brewersassociation.org` (WebFetch) | DNS failure |

What *was* available: web-search result excerpts, meaning short passages
quoted by the search tool from the pages below.

| Label | Meaning |
|---|---|
| **excerpt** | A passage was seen in a search excerpt. The page itself was not opened. |
| **listed** | The source was named earlier (`docs/pour-procedure.md`) but not re-checked this pass. |
| **verified** | Read first-hand. **No source has this status yet.** |

Before shipping copy, someone with normal internet access should open each
**excerpt** link and change it to verified, or correct it. Start with the
Brewers Association *Draught Beer Quality Manual* (the most authoritative US
source) and the Cicerone CBS material.

## Sources

### Draught pour (Pilsner, and the general technique for Hefeweizen)

**1. Brewers Association, consumer pouring guidance.**
- Link: https://brewersassociation.org/?p=59734 (search result URL).
- Status: **excerpt.**
- Passage:
  > "Hold the glass at a 45-degree angle about two inches below the spout so that beer will initially flow down the side of the glass. As the glass fills, gradually tilt it upright so that you finish pouring straight down the middle of the glass to build the foam head. Close faucet quickly to avoid wasteful overflow."

**2. Brewers Association, *Draught Beer Quality Manual*.**
- Edition: the search showed the ISBN 9781938469602 edition. Earlier notes cited the 4th edition, 2019; the edition needs confirming.
- Status: **not read.** Its pouring section did not appear in the excerpts.

**3. Cicerone, CBS Prep Talks answers 07.**
- Link: https://www.cicerone.org/sites/default/files/pdfs/CBS_Prep_Talks/PrepTalks_Answers_07.pdf
- Status: **excerpt** (paraphrased by the search tool, not quoted).
- What the excerpt said:
  - A beer-clean glass at about 45°, its rim about an inch under the tap.
  - Open the faucet fully; partly open pours foamy.
  - Pour down the side to about half full, then upright, down the centre.
  - About a 1-inch head for most American ales and lagers.
  - Close once the foam reaches the rim.
  - Never let the faucet touch the glass or the beer.

**4. Cicerone, "Perfect Pour at Home" (PDF).**
- Link: https://www.cicerone.org/sites/default/files/resources/Perfect_Pour_at_Home.pdf
- Status: **excerpt.**
- What the excerpt said:
  - The switch to upright comes "a little past half way".
  - Too little foam means move to the middle sooner next time.

**5. Cicerone blog, "How to Pour The Perfect Beer in 5 Simple Steps".**
- Link: https://cicerone.org/us-en/node/7093
- Status: **excerpt.**
- What the excerpt said:
  - Adjust the transition later for too much foam, sooner for too little.
  - A ½–1 inch (1–3 cm) head is typical.

**6. open-exam-prep, CBS study guide.**
- Link: https://open-exam-prep.com/study-guides/cicerone-beer-server/keeping-and-serving-beer/bottled-canned-service
- Status: **excerpt** (third-party).
- What the excerpt said: a 45° start, upright at 50%, a 1-inch collar.

**7. Axonify, "Bar Essentials — Pouring and Serving Draught Beer".**
- Link: https://marketplace.axonify.com/content-marketplace/p/bar-essentials-pouring-and-serving-draught-beer
- Status: **excerpt.**
- What the excerpt said: close the faucet when about one inch from the top.

**8. Previously listed, not re-checked this pass:**
- Steam Whistle: a 1–1.5 inch head for pilsner.
- Ticket Fairy SOPs.
- Burkett, citing American Bartenders School: two-thirds.
- WebstaurantStore.
- Pilsner Urquell (Czech pours).

All are **listed**; links are in `docs/pour-procedure.md`.

**Discrepancies found:**
- **Glass distance below the faucet:** BA says about 2 inches; Cicerone says about 1 inch. This is not modelled, so there is no impact.
- **Straighten point:** half (Cicerone, BA "as the glass fills") versus two-thirds (Burkett) versus three-quarters (one general guide). The game's 50–67% sits inside this range.
- **Where to stop:** Cicerone closes "once the foam reaches the rim". The game's LINE at 95% of height is a **GAME** abstraction (a visible target), not sourced service practice. Recommend saying so in the README, with no copy change in the station.

### Hefeweizen
**9. VinePair and Publix, general bottle pouring.**
- Status: **excerpt.**
- What the excerpts said:
  - Tilt to 45°, straighten at about half.
  - For hefeweizen, pour most of the bottle, swirl the rest to rouse the yeast, and top off.
  - One says to stay tilted "almost the entire pour".
- Applicability: **bottle service. Not applicable to draft.**

**10. Business Insider ("How to pour beer like a German") and Orlando German Club.**
- Status: **excerpt.**
- What the excerpts said:
  - Rinse in cold water, don't dry.
  - Bottle-in-glass, with the bottle removed at about two-thirds.
  - A head "about three finger's width".
  - A Bavarian bartender's angle is almost horizontal.
- Applicability: mostly bottle service. Rinse and head size apply to draft too.

**11. Not found:** any authoritative draft-specific hefeweizen procedure.

### Nitro Stout
**12. Trade and consumer articles on the Guinness two-part pour.**
- Sources:
  - Alcohol Professor: https://www.alcoholprofessor.com/blog-posts/blog/2017/03/16/the-perfect-pint
  - KegWorks: https://www.kegworks.com/blog/how-to-pour-a-guinness-the-right-way-but-does-it-really-matter
  - Chowhound: https://chowhound.com/1686408/right-way-pour-guinness-draft
  - VinePair: https://vinepair.com/articles/ways-to-pour-guinness-stout/
- Status: **excerpt.**
- What the excerpts said:
  - 45°, upright as it reaches the harp, about ¾.
  - Settle.
  - Top up with the handle pushed back (slower).
  - A Guinness brewery ambassador gives 119.5 s from the start of the first pour to ready-to-top-up. Another source gives an "86 s settle".
- A Guinness primary page was **not** reached (403).

**13. Retailer and manufacturer stout-faucet pages.**
- Sources:
  - Keg Outlet: https://kegoutlet.com/when-using-the-nitro-infuser-is-it-still-necessary-to-use-a-stout-tap.html
  - Howdy Brewer (Taprite): https://www.howdybrewer.com/products/stout-faucet-polished-304-s-s-taprite-12s07161
  - Micro Matic: https://micromatic.com/en-us/stout-ale-faucet/p-Zj5OZPM7u0ig7s8zeZtrKA
- Status: **excerpt.**
- What the excerpts said:
  - A restrictor disc knocks nitrogen out of solution, which gives the cascade.
  - A two-step pour; settle about 60 s (one page) or 90–120 s (another).
  - The whole process about 120 s.
  - One faucet must not be pulled past 45°.

## The three kinds of number

| Kind | Definition | Where |
|---|---|---|
| PHYSICAL | Follows from glass geometry | `GLASS`, capacity and the spill limit, "head spills first" |
| SOURCED | A service rule seen in sources (currently excerpt only) | 45°, open fully, straighten at half to two-thirds, finish upright, about a 1-inch head |
| GAME | Chosen for feel or teaching | Every band width, the 35° and 15° thresholds, the 0.5 s upright minimum, the foam constants, the 95% LINE, the verdict grace bands, the pad travel |

**Recommendation:** two CLAIM lines in `sim.js` describe geometry, not
service guidance. Relabel them PHYSICAL in a later comment-only change:
- `tiltSpill`: "a tilted glass spills sooner".
- `overflow`: "the head spills first".

## CLAIM copy audit (`js/sim.js` COPY, captions, and app copy)

| Where | Current text | Support | Verdict and proposed change (not applied) |
|---|---|---|---|
| `COPY.upright` | "The stream dropped straight onto the beer and turned **mostly** to foam. Tilt first." | Direction supported (BA: tilt so beer runs down the side; pouring down the middle builds foam). "Mostly" is the sim's magnitude, not a sourced fact. | Soften: "The stream dropped straight onto the beer and made a lot of foam. Tilt first so the beer runs down the side." |
| `COPY.notUpright` | "Bring the glass upright and finish the pour into the middle to build the head." | BA and Cicerone excerpts | Keep. |
| `COPY.tiltSpill` | "Beer ran over the lip while the glass was still tilted… bring it upright sooner." | PHYSICAL | Keep; relabel PHYSICAL. |
| `COPY.overflow` | "…The head spills first." | PHYSICAL (foam sits on top) | Keep; relabel PHYSICAL. |
| `COPY.early` | "More of the pour landed upright, which builds foam…" | BA (finish down the middle to build foam); Cicerone adjust-timing advice | Keep. |
| `COPY.stayedTilted` | "…Start bringing it up around half to two-thirds full." | Sourced range | Keep. |
| `GHOST[0]` caption | "Tilt the glass to about 45°…" | Sourced | Keep. |
| `GHOST` | "Open the tap fully. Pour down the side." | Sourced | Keep. |
| `GHOST` | "Finish upright to build the head." | Sourced | Keep. |
| `GHOST` | "The beer reached the LINE: let go, then serve." | GAME target | Keep (it names the training mark, not a service rule). |
| `PILSNER.headBand` comment | "~1 inch on a pint-size pilsner" | 8–16% of about a 7.5–8 in glass is about 0.6–1.3 in | Keep. |
| `docs/pour-procedure.md` | "Status: sources found, not yet verified first-hand." | Still true | Keep. Add a pointer to this audit. |
| Intro goal (`brewery.js`) | "tilt first, bring the glass upright gradually, and stop at the line with the right amount of foam" | Sourced + GAME line | Keep. |
| M6 certificate | "virtual Pilsner training" | Scoped wording per the M6 spec | Keep. |

**Net:** one wording softening (`COPY.upright`) and two relabels. Everything
else holds against the excerpts. The precision and speed of the bands remain
GAME and are honestly labelled.

**Not modelled, but sourced (possible debrief notes, owner's call):**
- Keep the faucet out of the beer.
- Close the faucet quickly.
- Use a beer-clean glass.
