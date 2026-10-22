# M6 spec: certification and progress (agreed, not yet implemented)

Status: product rules locked by the user and GPT. Implementation is on hold
until one M5 validation check is done: a fresh-learner playtest. (The
Storyline Web Object test was dropped: the app ships as a standalone 16:9 web
app.)

## Rules

1. **One successful Solo pour certifies the Pilsner station.** "Successful"
   is the existing simulation pass (tilted first, finished upright, head,
   level and spill in range). No second consecutive pass, no new thresholds.
2. **Only Solo certifies.** Watch and Guided never award certification. The
   station already emits `served` with `{ mode, pass }`; today `brewery.js`
   forwards only `pass` to progress. M6 must keep `mode` and certify only on
   `mode === 'solo' && pass === true`.
3. **Certification persists.** Later failed replays never revoke it. Only an
   intentional progress reset, or an explicitly managed future criteria or
   version change, can affect it. The transition is idempotent: repeated
   successes don't award it again.
4. **Acknowledgement and hub.** On the first certifying pour, show the
   Riverside seal (from the M2 component sheet) without hiding the pour
   debrief. On the hub, Pilsner shows Certified with the seal and its action
   becomes Replay.
5. **Wording.** The certificate states completion of the *virtual Pilsner
   training*. It is not evidence of real-world professional bartending
   competency, and no copy may imply it is.
   Progress lives in the learner's browser, so the seal and wording must not
   present it as a centrally verified staff-training record either.
6. **Final Rush** stays locked until all three stations are actually
   certified. No simulated certifications for Hefeweizen or Nitro Stout.
7. **No Storyline/LMS reporting.** The app is delivered standalone; progress
   is local to the learner's browser. Nothing is built for an LMS unless a
   reporting requirement appears later.

## Tests required

- A successful Guided pour does not certify.
- A failed Solo pour does not certify.
- A successful Solo pour certifies exactly once.
- Certification survives reload and returning visits.
- A failed replay does not revoke certification.
- The hub shows Certified and Replay correctly.
- Final Rush stays locked with only Pilsner certified.
- Attempt counters, logging and abandonment behave as before.
- The Pilsner simulation tests are unchanged and pass.
