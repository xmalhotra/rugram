# Nutrition drill-down (historical)

Superseded on 25 October 2026 by [Nutrition: one idea per card](nutrition-visual-ideas.md).
Current browsing has one broad flow per topic, with food and drink ideas inside it;
the old sport/preference records below remain only for saved-content compatibility.

After OTP and choosing Nutrition, the user sees five choices: Everyday protein,
Hydration & electrolytes, Pre-workout, Intra-workout and Post-workout.

Protein branches by food preference (plant-based, vegetarian with dairy, or
including eggs/meat/fish). Hydration branches to everyday life or Running, Gym,
HYROX. Pre/intra/post each branch to Running, Gym and HYROX. “Intra-workout” is
explained as food/fluids during the session, when needed. There is no Cooking
category or instruction that everyone must “get extra salts in”.

One choice is shown at a time. Back navigation changes the context or category
without changing the saved top-level focus. The resulting card opens a central
library flow; “Add flow” saves its stable ID using the existing API. Subpath
selection is temporary discovery state; an adopted flow preserves the exact
category/activity in its ID. Existing saved nutrition flow IDs remain available.

`shared/nutrition.ts` defines 16 context-specific editorial starter flows and
the navigation mapping. They ask users to consider duration, effort, heat,
meal timing and tolerance rather than pretending the sport name determines a
personal fuelling, protein, sodium or supplement prescription. Protein examples
use familiar food groups and account for dietary restrictions. Pre-workout
flows can open the existing optional drink Picks; these mixes are not equated
with carbohydrate fuel. Intra-workout flows do not automatically promote those
products. No new product efficacy claims, products or prices are invented.

Primary background sources checked:

- https://www.sportsdietitians.com.au/factsheets/pre-exercise-fuelling/
- https://www.ausport.gov.au/ais/nutrition/education-modules/modules/hydration
- https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/

These are general educational habits, not medical advice, individual dietary
targets, or a complete sports nutrition plan. No safety screening or clinical
assessment is implemented. The app warns against automatic extra salt, forced
fluid intake and required supplements, and refers individual strategies to
qualified professionals. No physical-device UI automation was performed.
