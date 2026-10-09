# Living city and unified gameplay presentation

**Goal:** Carry out the user's requested compact UI, unified deed popup, landscaped property plots, separated dice, animated city and smoother popup transitions.

**Design:** Preserve the ivory (#fffdf0), forest (#315c48), blue ink (#183b46), brass (#d7b263) and lawn (#86a66c) tabletop palette with Nunito labels and Fredoka headings. On desktop put status, centered tools and dice in one row; narrow screens retain a bounded internal tool scroll. A single title deed includes illustration, ownership, rent table, costs and actions. Property faces have landscaped lawns, paths and tiny shrubs with unobstructed names/prices; district colors follow a thin tile perimeter and small external markers. Keep houses/hotels tied to actual development.

**Architecture:** UI/deed presentation stays separate from Three scene work. New cosmetic CityLife owns traffic, people, aircraft, weather and day/night illumination; it never blocks turns or changes rules and freezes under reduced motion. Dice poses use fixed separated lanes with conservative rotated-cube clearance rather than crossed endpoint interpolation. Popup motion preserves positioning and reading/arrival priority.

**Authorized execution:** Implement directly in the existing workspace under the user's explicit change request. Parallel independent UI and city modules have distinct file ownership; parent integrates the renderer and verifies the whole game.

- [x] Reproduce crossed dice trajectories with sampled old positions; add clearance/landing regressions and fix continuous poses.
- [x] Consolidate desktop status/tools/dice and title-deed details; preserve actions, keyboard access and responsive bounds.
- [x] Replace physical/painted color strips with lawns, paths, shrubs and external district markers; preserve undeveloped empty plots. Apply the user's later request for a thin district-colored perimeter around the lawn/title.
- [x] Add bounded ambient city routes, people, airplane, clouds/rain and cyclical daylight/window lighting; support quality/reduced-motion and background pauses.
- [x] Improve popup entrances and deck flights without repeated transitions or hidden decisions. Consolidate duplicated financial/purchase/rent confirmations, extend reading time and retain queued rent until arrival.
- [x] Run core/LAN/build and targeted/full Chrome verification, inspect screenshots, obtain independent review, update production and commit.

**Review focus:** Dice separation during full rotations and endpoint swaps; deed controls while purchased/developed/mortgaged; mobile overflow and board height; ambient animation never counted as pending pawn movement; reduced-motion and tab visibility; card resolution still waits for reading.
