# Art brief: portrait Pilsner backdrop, revision 2

Agreed by the user, GPT and Claude after reviewing revision 1 in the M2
compositing harness (`design/composite.html`). Attach
`design/backdrops/pilsner-portrait-template.png` when handing this off.

## Context

The backdrop sits behind live, animated vector game art: faucet, glass,
beer, foam and training overlays (LINE/STOP bands, BRING UP band, head
gauge). The game art cannot move or change shape; the backdrop fits around
it. Coordinates are in the 390 x 844 phone frame; multiply by 3 for the
1170 x 2532 deliverable.

## North star

**The beer is the brightest warm amber element in the scene.** The room
supports the pour; it never competes with it.

## Keep from revision 1

Brand, mood and palette: charcoal and forest green, warm amber pendant
light, copper tanks, the Riverside sign. The faucet zone stays clear.

## Diagnosis

The game art is flat vector; revision 1 is a sharp photoreal photo with
everything in focus, so the glass and faucet read as stickers. The fix is
mostly composition and focus hierarchy, not more effects:

1. No depth hierarchy: everything is equally sharp.
2. Competing highlights near the pour (pendant, tank highlights behind the
   faucet, shiny bar top).
3. The faucet shank has nothing to mount to.
4. The upright glass floats above the drip rail.
5. The head gauge sits over the plant and sign and is unreadable.

## Required changes

A. **Selective depth of field, not blanket blur.**
   - Foreground bar top and drip tray: sharp.
   - Pour area: calm and readable.
   - Deeper room (tanks, shelves, sign): noticeably softer.

B. **Quiet zone behind the glass** (x 40-320, y 180-490), darker and low
   contrast. The glass is transparent, so everything here shows through the
   beer. Avoid:
   - bright highlights
   - high-contrast or hard architectural edges
   - strong vertical lines (mullions, shelving edges, tank outlines)
   - text or logos

C. **Faucet mount, architectural and subtle.**
   - The live shank exits the right edge at y 123-143.
   - Put a dark steel or matte backsplash, or a clean vertical structural
     edge, at the far right (about x 360-390) so the shank reads as anchored.
   - Avoid shiny new tap structures that compete with the live faucet.
   - No faucet, spout or handle anywhere in the faucet zone (x 195-390,
     y 55-190).

D. **Drip tray supports the landing without dominating.**
   - The upright glass is centred at x 241 with its base at y 480; make that
     the tray's top surface (visible top face roughly y 470-505, front edge
     about y 505, tray about 170 px wide).
   - The tilted pour swings well left (to about x 40), so keep the bar
     readable there.
   - Do not make the tray a bright strip across the full width.

E. **Head gauge corner** (x 0-75, y 105-365): calm and dark, with no sign,
   plant or bright detail.

F. **Branding present but secondary.**
   - The Riverside sign stays, softer and slightly out of focus.
   - Place it upper-left or upper-centre-left, outside the gauge corner.
   - It should establish the place, never become a second focal point.

G. **Light.**
   - One warm key light from above, slightly left, falling on the pour.
   - Tank highlights dimmed, especially near the faucet zone.
   - The bar top can have a soft sheen, but no hot specular streaks.

H. **Controls area** (below y 560): bar front dark and even; buttons and the
   pour pad sit on top of it.

## Format

- Exactly 1170 x 2532 px (390:844). Any other ratio gets cropped and
  shifts the zones.
- PNG or high-quality JPG.
- No text except the brand sign.
- Nothing from the game baked in: no glass, faucet, beer, labels or UI.

## Notes

The game art stays vector. Page-side blends (warm grade, contact shadows,
backdrop blur/dim/vignette, a softer glass edge) are being tested, but the
backdrop should do most of the matching. If a requirement conflicts with the
brand look, say so instead of quietly working around it.
