# Shared category sliders and item shelves

Flows, Picks and Events now share a horizontally swipeable illustrated CategoryRail above compact BrowseShelf cards. The selected category has an outlined top, filled panel and accent underline; sibling categories remain visible and reachable. The implementation follows the supplied screenshots' arrangement, not their brand colours, promotions or checkout design.

The selected treatment now uses one continuous SVG cutout path rather than separately joined native borders: outward bottom curves join the baseline, and the open tab shares the content background below. The inactive band uses the muted card surface. The same connected treatment applies to compact text-only subcategory rows; these remain smaller than the illustrated primary row. The Expo-compatible react-native-svg package renders the path; custom development builds need rebuilding after this dependency change, while Expo Go already includes its native support.

Cards use a shared 168-point width and 180-point snap interval, leaving part of the next item visible on smaller screens. Product photos and seller links, flow illustrations and ownership state, and event date/location/price remain connected to existing details. Event art is an illustration rather than an invented event photograph. No cart, claimed discount or review score was added.

Fitness/Tech/Lifestyle/Nutrition remain the main flow groups. Their topics now switch through a second rail rather than replacing the navigation with full-screen grids. Nutrition preferences, electronics types and supplement goals use the same pattern. Existing deep-linked focus IDs still select the right group/topic. Admin still controls category definitions and published content.

Picks no longer leads with Browse/Saved segmented tabs. Saved picks are retained behind a compact Saved count action and remain available in the profile. Credit-card shelves retain My Cards and their existing details; native event approval, creator hosting and city filtering are unchanged.

Physical iPhone swipe, Dynamic Type and VoiceOver checks are still required. Unit/source checks and bundle export do not establish visual correctness on a device.
