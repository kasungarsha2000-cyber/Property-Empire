# Ownership and trading redesign

User intent: make the interface substantially clearer, especially identifying owned properties and creating trades. The illustrated deeds and property models remain part of this redesign.

The match interface puts opponents in a compact top strip, the user's portfolio in a persistent left panel, the board and current action in the center, and the selected deed in the right panel. Portfolio groups show ownership progress and missing deeds; developed and mortgaged properties carry text labels. Board labels identify the owner and highlight the user's tiles. The all-deeds gallery supports ownership filters.

Trading uses two visual columns: what the user gives and what they receive. Property cards are selectable, developed groups explain why they cannot be traded, and cash/jail cards remain explicit. A live summary shows mortgage transfer interest, cash after the exchange, and completed color groups. Review is a separate step before an offer is sent. Incoming offers present the same comparison before acceptance. A missing deed can preselect its owner and start a trade.

Visual system: deep slate #183944 for the header and primary text, clean paper #FFFDF5, teal #32735C for primary actions and ownership emphasis, warm gold #D4AA62 for active turn indicators, district colors for property identity. Fredoka headings and Nunito body text remain local; currency uses tabular numerals. Cards have distinct hierarchy, clear labels and strong contrast. Touch controls remain at least 44 px; narrow screens put the board and turn controls first, followed by the portfolio and deed with usable trade columns.

Implementation order: tested portfolio/trade presentation helpers; match layout and ownership markers; visual trade selection/review; browser journeys and responsive inspection; production build and final independent review. No engine or multiplayer protocol changes are required.


Verification: 46 automated tests, strict TypeScript, production frontend/server builds, and three production Chrome scripts pass. The UI journey includes actual offer acceptance by a bot and actual acceptance of an incoming debt offer. Incoming debt repayment explanation was corrected after independent review. Board rendering and desktop/mobile trade screenshots were inspected. Test artifacts remain local under `test-artifacts/`.


2026-10-09 refinement: replaced the large turn panel with compact action buttons. A normal roll prompt shows only Roll dice beneath the board; other players' controls are hidden. Phase guidance and the named latest roll now appear separately in the match overview above the board. The board uses the reclaimed space. Purchase, auction, jail, debt and trade decisions keep their required controls.
