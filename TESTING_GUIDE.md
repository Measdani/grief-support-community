# Testing Guide: Free Tier vs Premium Tier

## Overview

This guide provides step-by-step instructions for testing the subscription system, including free tier restrictions, premium features, and Stripe webhook integration.

## Test Setup

### Prerequisites
1. Database migrations (001-024) must be completed
2. Stripe test keys configured in `.env.local`
3. Stripe webhook secret configured
4. Development server running: `npm run dev`

### Test Accounts
Create two test accounts:
- **Free User**: Email: `free@test.com` (Premium: NO)
- **Premium User**: Email: `premium@test.com` (Premium: YES)

---

## Test 1: Free Tier Restrictions

### 1.1 Messaging Page Redirect

**Expected Behavior**: Free tier users cannot access `/messages`, should redirect to `/pricing`

**Steps:**
1. Log in as `free@test.com`
2. Verify profile shows `subscription_tier: free`
3. Navigate to `/messages`
4. **PASS** ✅ - Should be redirected to `/pricing` page

**Debug Info:**
- Check Supabase: `SELECT id, email, subscription_tier FROM profiles WHERE email = 'free@test.com'`
- Check browser console for any errors

---

### 1.2 Connections/Friends Page Redirect

**Expected Behavior**: Free tier users cannot access `/connections`, should redirect to `/pricing`

**Steps:**
1. Log in as `free@test.com`
2. Navigate to `/connections`
3. **PASS** ✅ - Should be redirected to `/pricing` page

**Verification:**
- Connections page code (line 44-54): `if (profile?.subscription_tier !== 'premium') { router.push('/pricing') }`

---

### 1.3 Pricing Page Display

**Expected Behavior**: Pricing page should clearly show feature differences

**Steps:**
1. As free user, go to `/pricing`
2. Verify:
   - ✅ Free tier card shows "Your Current Plan"
   - ✅ Premium card shows "Upgrade Now" button
   - ✅ Feature comparison table shows restricted features for free tier:
     - ❌ Messaging & Friends
     - ❌ Join Gatherings (RSVP)
     - ❌ View Full Gathering Details
     - ❌ See Attendee Lists
     - ❌ Create/Host Gatherings

**Features Available in Free Tier:**
- ✅ Profile & Memorials
- ✅ Browse Resources
- ✅ Suggest Resources
- ✅ View Gathering Titles (limited preview only)

**Note:** Free users can see gathering titles but cannot RSVP, view full details, or see attendee lists.

---

## Test 2: Subscription Checkout Flow

### 2.1 Initiate Stripe Checkout (Test Mode)

**Prerequisites:**
- `STRIPE_PREMIUM_PRICE_ID` is set in `.env.local`
- Using Stripe test mode keys (`pk_test_` and `sk_test_`)

**Steps:**
1. Log in as `free@test.com`
2. Go to `/pricing`
3. Click "Upgrade Now" button in Premium card
4. **PASS** ✅ - Should redirect to Stripe Checkout page

**Stripe Test Cards:**
- **Successful Payment**: `4242 4242 4242 4242` (Exp: any future date, CVC: any 3 digits)
- **Failed Payment**: `4000 0000 0000 0002`
- **Declined Card**: `4000 0000 0000 0069`

---

### 2.2 Complete Payment

**Steps:**
1. On Stripe checkout page, fill in:
   - Card: `4242 4242 4242 4242`
   - Exp: `12/25`
   - CVC: `123`
   - Email: `premium@test.com`
2. Click "Pay"
3. **PASS** ✅ - Should redirect to success URL: `/settings/billing?success=true`

---

### 2.3 Verify Subscription in Database

**After successful payment:**

```sql
-- Check profile subscription status
SELECT
  id, email,
  subscription_tier,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_started_at,
  subscription_ends_at
FROM profiles
WHERE email = 'premium@test.com';

-- Expected:
-- subscription_tier: 'premium'
-- subscription_status: 'active' or 'trialing'
-- stripe_customer_id: 'cus_...'
-- stripe_subscription_id: 'sub_...'
```

---

### 2.4 Check Stripe Events Logged

**Verify webhook events were processed:**

```sql
SELECT
  id, stripe_event_id, event_type,
  processed, processed_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 5;

-- Expected events:
-- 1. customer.subscription.created
-- 2. (optional) checkout.session.completed
```

---

## Test 3: Premium Features Access

### 3.1 Messaging Access

**After upgrading to premium:**

**Steps:**
1. Log in as `premium@test.com`
2. Go to `/messages`
3. **PASS** ✅ - Should load messages page, NOT redirect
4. Page should show:
   - "Messages" heading
   - "No messages yet" or list of conversations
   - Ability to start new conversations

---

### 3.2 Connections/Friends Access

**Steps:**
1. Log in as `premium@test.com`
2. Go to `/connections`
3. **PASS** ✅ - Should load connections page
4. Page should show:
   - Three tabs: Friends, Requests, Sent
   - "No Connections Yet" message (for new account)
   - Ability to manage connections

---

### 3.3 Gathering Features

**Join Gatherings (Requires: Premium)**

Steps:
1. As premium user, go to `/gatherings` (or similar gathering list)
2. Click on a gathering
3. **PASS** ✅ Should see:
   - Full gathering details (premium feature)
   - "RSVP" button to join (premium feature)
   - Attendee list (premium feature)
4. Click RSVP to join gathering

**Create/Host Gatherings (Requires: Premium + Approved Background Check)**

Steps:
1. As premium user, go to `/host-gatherings`
2. Should see background check status
3. If background check not approved yet:
   - Should see "Apply for Background Check" form
   - Fill required fields: name, DOB, address
   - Submit application
4. If background check approved:
   - Should see "Create Gathering" option
   - Can create and publish gatherings

---

## Test 4: Subscription Cancellation

### 4.1 Downgrade from Premium to Free

**Steps:**
1. Log in as `premium@test.com`
2. Go to `/dashboard/settings/billing`
3. Click "Manage Subscription" or "Cancel Subscription"
4. **PASS** ✅ - Should show Stripe customer portal
5. Cancel subscription in portal

**Verify in Database:**

```sql
-- After cancellation webhook processes
SELECT
  email, subscription_tier,
  subscription_status,
  subscription_cancelled_at
FROM profiles
WHERE email = 'premium@test.com';

-- Expected:
-- subscription_tier: 'free' (or downgraded status)
-- subscription_status: 'cancelled'
-- subscription_cancelled_at: NOT NULL
```

---

### 4.2 Loss of Premium Access

**After cancellation:**

**Steps:**
1. Refresh page
2. Try to access `/messages`
3. **PASS** ✅ - Should redirect to `/pricing`

---

## Test 5: Webhook Events (Using Stripe CLI)

### 5.1 Setup Stripe CLI Webhook Testing

```bash
# Install Stripe CLI (if not already installed)
# Mac: brew install stripe/stripe-cli/stripe
# Windows: choco install stripe-cli
# Linux: https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This command will output a webhook secret. **Copy this and update `.env.local`:**

```env
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

Restart your dev server after updating.

### 5.2 Test Webhook Events

```bash
# Test checkout.session.completed
stripe trigger checkout.session.completed --override metadata=user_id:test-user-id

# Test subscription.created
stripe trigger customer.subscription.created --override metadata=user_id:test-user-id

# Check console output in your terminal for webhook processing logs
```

---

## Test 6: Webhook Event Logging

### 6.1 Verify Webhook Events are Logged

**After triggering webhooks:**

```sql
SELECT
  id, stripe_event_id, event_type,
  event_data, processed,
  error_message, processed_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- `stripe_event_id` - Unique Stripe event ID
- `event_type` - Event type (e.g., `customer.subscription.created`)
- `processed` - Should be `true` after processing
- `error_message` - `NULL` if no errors

---

## Test 7: Payment Failures & Retries

### 7.1 Simulate Payment Failure

**Using test card:**
1. At checkout, use card: `4000 0000 0000 0002`
2. Click "Pay"
3. Payment should fail

**Verify in Database:**

```sql
-- Check subscription status
SELECT
  email, subscription_tier,
  subscription_status
FROM profiles
WHERE email = 'test@test.com';

-- Should show: subscription_status = 'incomplete' or 'incomplete_expired'
```

### 7.2 Automatic Retry on Invoice Renewal

**Steps:**
1. Simulate failed payment (as above)
2. Wait for next billing period
3. Stripe automatically retries payment
4. Check webhook logs for `invoice.payment_failed` events

---

## Test 8: Background Check System (Premium Feature Requirement)

### 8.1 Background Check Application

**Requirements to Create Gatherings:**
- ✅ Premium subscription (active)
- ✅ Approved background check (valid for 1 year)

**Steps:**
1. As premium user, go to `/host-gatherings`
2. Click "Apply for Background Check"
3. Fill form with required info:
   - Full legal name
   - Date of birth
   - SSN last 4 digits
   - Complete address
   - Consent checkbox
4. Submit application

**Verify in Database:**

```sql
SELECT
  id, user_id, status,
  created_at, approved_at
FROM background_check_applications
ORDER BY created_at DESC
LIMIT 5;
```

### 8.2 Admin Approval

**As admin user:**
1. Go to `/admin/background-checks`
2. See list of pending applications
3. Click "Review" on an application
4. Review submitted information
5. Click "Approve" button

**Verify in Database:**

```sql
SELECT
  id, email,
  background_check_status,
  background_check_approved_at,
  background_check_expires_at
FROM profiles
WHERE background_check_status = 'approved'
ORDER BY background_check_approved_at DESC;

-- Expected: background_check_expires_at = current_date + 1 year
```

### 8.3 Background Check Expiration

**Background checks expire after 1 year:**

```sql
-- Check expiration logic
SELECT
  email,
  background_check_status,
  background_check_approved_at,
  background_check_expires_at,
  (background_check_expires_at < NOW()) as is_expired
FROM profiles
WHERE background_check_status = 'approved';

-- Users with expired background checks cannot create new gatherings
-- They must reapply for a new background check
```

---

## Troubleshooting

### Issue: Stripe Checkout Button Not Working

**Check:**
1. `STRIPE_PREMIUM_PRICE_ID` is set in `.env.local`
2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
3. Dev server restarted after env changes
4. Check browser console for errors (F12 > Console)

### Issue: Webhooks Not Processing

**Check:**
1. Webhook secret is correct: `STRIPE_WEBHOOK_SECRET`
2. Webhook is configured in Stripe dashboard
3. Endpoint URL is correct: `https://yoursite.com/api/webhooks/stripe`
4. Dev server console shows incoming webhook logs

### Issue: Subscription Not Updating

**Check:**
1. Webhook secret is correct
2. Database service role key is correct (`SUPABASE_SERVICE_ROLE_KEY`)
3. RLS policies allow service_role to update profiles
4. Check logs: `SELECT * FROM stripe_events WHERE error_message IS NOT NULL`

### Issue: Free User Still Has Premium Access

**Verify:**
```sql
SELECT id, email, subscription_tier, subscription_status
FROM profiles
WHERE email = 'test@test.com';
```

Should show `subscription_tier = 'free'`. If not:
```sql
-- Force downgrade for testing
UPDATE profiles
SET subscription_tier = 'free', subscription_status = NULL
WHERE email = 'test@test.com';
```

### Issue: Background Check Not Working

**Check:**
1. User is premium tier
2. Background check application was approved
3. Background check hasn't expired (check `background_check_expires_at`)
4. Verify in database:
```sql
SELECT
  email, subscription_tier,
  background_check_status,
  background_check_expires_at,
  CASE WHEN background_check_expires_at < NOW() THEN 'EXPIRED' ELSE 'VALID' END as check_status
FROM profiles
WHERE email = 'test@test.com';
```

---

## Success Criteria Checklist

- [ ] Free tier users are redirected from `/messages` to `/pricing`
- [ ] Free tier users are redirected from `/connections` to `/pricing`
- [ ] Free tier users can see gathering titles but not full details
- [ ] Premium tier users can access `/messages`
- [ ] Premium tier users can access `/connections`
- [ ] Premium tier users can view full gathering details
- [ ] Premium tier users can RSVP to gatherings
- [ ] Premium tier users can see attendee lists
- [ ] Stripe checkout completes successfully with test card
- [ ] User upgraded to premium after successful payment
- [ ] Webhook events are logged in `stripe_events` table
- [ ] Subscription shows as "active" in `profiles` table
- [ ] Cancelled subscription downgrades user to free tier
- [ ] Free user loses access to premium features after cancellation
- [ ] Background check application can be created
- [ ] Admin can approve/reject background checks
- [ ] Users with approved background checks can create gatherings
- [ ] Background checks expire after 1 year

---

## Related Documentation

- [Database Schema (migration 019-024)](./supabase/migrations/)
- [Subscription Utilities](./lib/utils/subscription.ts)
- [Stripe Webhook Handler](./app/api/webhooks/stripe/route.ts)
- [Pricing Page](./app/pricing/page.tsx)
- [Messaging Page](./app/messages/page.tsx)
- [Connections Page](./app/connections/page.tsx)
- [Host Gatherings Page](./app/host-gatherings/page.tsx)

---

## Next Steps

1. Complete all test cases above
2. Document any failures
3. Verify webhook integration with Stripe CLI
4. Test with production Stripe keys when ready
5. Verify premium pricing matches business requirements
