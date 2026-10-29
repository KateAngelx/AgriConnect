# AgriConnect E2E checklist (dev / staging only)

Run after `pnpm dev`, schema + migrations, and seed. Do not run destructive tests on production.

## Auth

- [ ] Register with email → login with email + password
- [ ] Register with phone (requires `SUPABASE_PHONE_AUTH_ENABLED=1` + Supabase SMS) → OTP verify → login with phone + password
- [ ] Login rejects unverified phone-only accounts until OTP succeeds
- [ ] Existing email users still sign in

## Applications & roles

- [ ] Submit seller / delivery application
- [ ] Admin approve / reject / needs-info
- [ ] `node scripts/backfill-profile-roles.mjs` updates roles without overwriting admin grants

## Marketplace & cart

- [ ] Browse products, add to cart, wishlist
- [ ] Marketplace assistant returns answers grounded in listings (or clear error if `OPENAI_API_KEY` missing)

## Checkout

- [ ] Pickup: order summary shows each seller farm name + pickup location
- [ ] Delivery: address + per-order delivery fee saved on order
- [ ] Multi-seller cart creates one order per seller

## Orders & delivery

- [ ] Buyer timeline shows pickup vs delivery stages with readable labels
- [ ] Seller advances order; buyer notification received
- [ ] Courier sees redacted areas before accept; full address after accept
- [ ] Status transitions: delivery-assigned, courier-picked-up, out-for-delivery, delivered

## Payments & integrations

- [ ] Cash on pickup / COD flows
- [ ] PayMongo (if `PAYMONGO_SECRET_KEY` set)

## Permissions

- [ ] Non-admin cannot access `/admin`
- [ ] Unapproved seller/delivery dashboards blocked

## External gaps to document

- [ ] SMS OTP without Supabase phone provider
- [ ] PayMongo without secret key
- [ ] AI without `OPENAI_API_KEY`
- [ ] Verified palengke price feed (not connected)
