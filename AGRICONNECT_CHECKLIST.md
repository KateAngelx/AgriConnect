# AgriConnect Improvement Checklist

## Priority fixes
- [x] Add mobile public navigation and accessible menu controls.
- [x] Fix Next.js production build TypeScript handling for Supabase Edge Functions.
- [x] Repair the SMS Edge Function authorization header.
- [x] Restyle the branded not-found page.
- [x] Replace the homepage category anchor `id="2"` with `id="categories"`.
- [x] Preserve product filters during sorting and pagination.

## UI consistency
- [x] Standardize brand colors into shared Tailwind design tokens.
- [x] Standardize typography, heading, card, input, and button sizes.
- [x] Standardize button corner radii across public and dashboard interfaces.
- [x] Reuse dashboard cards, status badges, alerts, and shared controls consistently.
- [x] Add visible keyboard focus styles to all interactive controls.
- [x] Use one application-wide font stack.

## Role-based workflows
- [x] Audit buyer, seller, delivery, and admin permissions.
- [x] Add role-specific dashboard and workspace links to mobile navigation.
- [x] Keep notifications available for every authenticated role.

## Location and delivery maps
- [x] Add interactive pickup and delivery coordinate pins.
- [x] Persist seller pickup and buyer delivery coordinates with orders.
- [x] Add current-location capture with browser permission and error handling.
- [x] Render pickup, delivery, and delivery-route maps.
- [ ] Verify saved pins on real mobile devices and supported browsers.
- [ ] Improve pickup/delivery location estimates.

## Public marketplace improvements
- [x] Add mobile cart, wishlist, and notification counts for buyers.
- [ ] Add search suggestions and recent searches.
- [ ] Replace generic image placeholders with category or seller imagery.
- [ ] Add seller storefront previews.
- [ ] Add low-stock and out-of-stock indicators consistently.
- [ ] Improve seller, product, and checkout trust cues.

## Account and order workflows
- [x] Improve order-tracking timelines and status explanations.
- [x] Add saved buyer addresses, delivery pins, and reusable checkout selection.
- [ ] Add saved payment preferences without storing sensitive payment credentials.
- [ ] Add buyer ratings and reviews.
- [x] Allow buyers to cancel orders before seller confirmation and restore stock.

## Seller tools
- [ ] Add low-stock and out-of-stock seller alerts.
- [ ] Add inventory trend and restocking suggestions.
- [ ] Improve seller storefront previews and settings.

## Delivery tools
- [ ] Improve route map presentation.
- [ ] Add more accurate distance and arrival estimates.
- [ ] Add clearer job prioritization and pickup instructions.

## Notifications and admin
- [ ] Add mark-all-read notifications actions.
- [x] Add audit-log filters.
- [x] Add report and audit CSV exports.
- [ ] Add terms-acceptance and account-verification indicators.

## General polish
- [ ] Complete footer contact details and optional social links.
- [ ] Add skeleton loaders for products, dashboards, and lists.
- [ ] Add confirmation dialogs for destructive actions.
- [ ] Preserve filter parameters in pagination and improve accessible pagination labels.
- [ ] Add SEO metadata for public marketplace and profile pages.
- [ ] Add Open Graph metadata for sharing product and seller pages.
- [ ] Standardize marketplace and dashboard empty states.
- [x] Add geographic and order-status unit tests and production-build validation. Role, interaction, accessibility, and mobile-device suites remain for browser automation.
