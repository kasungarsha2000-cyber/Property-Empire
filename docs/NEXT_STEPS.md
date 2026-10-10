# Next steps

1. Install the release APK on phones and work through the device checklist in `docs/ANDROID.md`.
2. Play a LAN game between two phones and a computer host on a real router and on a phone hotspot.
3. Measure frame rate on a low-end Android phone at each graphics quality and tune the defaults if needed.
4. Before publishing to a store, confirm the package id (`com.propertyempire.game`), keep the release key backed up, add
   it as repository secrets so CI signs releases, and consider an App Bundle (`bundleRelease`) for Google Play.
5. Optional: phone-only LAN hosting through a native WebSocket plugin that reuses the server's room logic.
