# Graphics upgrade — 8 October 2026

The board now uses a walnut base, brass inlays, textured green felt and raised property bands. A twelve-building downtown includes stepped towers, windows, roof equipment, storefront awnings, street markings, cars, lamps and a park with fountain and benches. Card decks and a dice tray are physical scene objects.

The renderer uses filmic tone mapping, warm/cool directional lighting, environment reflections and soft shadows. Contact shadows preserve depth when Low quality disables dynamic shadows. Shared geometry/materials, instanced city windows, retained building groups and cached shadow maps limit recurring work. The scene renders when changed or animating.

Eight tokens are distinct models: roadster, rocket, sailboat, robot, crown, airship, cat and gem. Setup names and ledger icons identify them. Coin bases and ownership markers use the player's color. Crowded tiles use smaller tokens and stable offsets. Rounded ivory/teal dice show the authoritative result on top and valid opposite-face pairs.

Camera reset fits the board to the available stage. Property focus moves closer to the selected tile; zoom, orbit and touch controls remain available. Switching games replaces changed token styles and clears prior movement paths. Removed player objects and shared gem geometry avoid retaining obsolete scene resources.

Verification includes strict TypeScript/production builds, the existing 34 core/server tests, thirteen production Chrome gameplay journeys with offline resume, and `tests/graphics_review.py` captures at desktop/mobile/tablet sizes. Screenshots are under `test-artifacts/graphics-*.png`. Browser review also exercises all eight token options, camera zoom/reset, an eight-player match and dice movement. Physical-device frame rate remains unmeasured.
