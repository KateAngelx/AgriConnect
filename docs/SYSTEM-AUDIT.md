# AgriConnect system audit (Step 1)

## Working

- Custom session auth with Supabase-backed store sync (service role)
- Multi-role buyers / sellers / delivery / admin via `profiles.roles`
- Applications workflow (draft, needs-info, admin review)
- Catalog, cart, wishlist, seller product CRUD, stock updates
- Checkout with stock validation; split orders per seller
- Delivery assignment flow with commissions and service-area matching
- In-app notifications
- PayMongo hook when `PAYMONGO_SECRET_KEY` is set

## Improved in this pass

- Checkout summary grouped by seller with pickup locations
- Buyer order timeline labels aligned to pickup vs delivery
- Delivery assignment preview vs full detail (server-side redaction)
- Phone + email registration/login (OTP when Supabase SMS enabled)
- AI marketplace assistant (DB-grounded), seller inventory + admin application assist APIs
- Role backfill script and E2E checklist

## Incomplete / configuration-dependent

- **Phone OTP**: requires Supabase Phone auth + SMS provider + `SUPABASE_PHONE_AUTH_ENABLED=1`
- **PayMongo**: requires secret key
- **AI**: requires `OPENAI_API_KEY`
- **Palengke prices**: no verified external feed; assistant must not fabricate market prices
- **RLS for delivery privacy**: app uses service role; privacy enforced in server assignment views. Direct anon SQL access to `orders.delivery_address` should be restricted in Supabase if clients ever query with user JWTs.

## Not implemented

- GPS geolocation (still text service-area matching)
- Automatic application approval by AI
- iProG or custom SMS for auth OTP (use Supabase Auth SMS only)
