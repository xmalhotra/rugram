# Flow category navigation

The first level now groups comparable concepts: Fitness, Tech, Lifestyle and Nutrition. Specific interests such as Running, HYROX and Coding are children rather than competing broad categories. Both first-time Home and the Flows tab use FlowTopicBrowser. A tap drills down, with a labelled Back action; no additional radio selection/submit step or fixed starter-flow footer is needed. Existing focus/flow identifiers and user subscriptions are unchanged.

Admin → Content → App settings → Flow category groups controls names, illustrations, order and focus references. Existing settings without the field use the four default groups; Admin can add the optional field to override them. Unassigned custom focus topics remain reachable through More topics. Duplicate references resolve once; archived/missing focus entries disappear. Nutrition retains its existing meal/hydration/training nutrition paths and source-linked supplement guides.

This implements progressive disclosure rather than importing a different UI framework. References reviewed:

- Apple navigation design: https://developer.apple.com/videos/play/wwdc2022/10001/
- Apple stable tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Material hierarchical navigation: https://m2.material.io/design/navigation/
- Nielsen Norman Group progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/

Automated checks do not substitute for physical iPhone navigation and accessibility testing.
