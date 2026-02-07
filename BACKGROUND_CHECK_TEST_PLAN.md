# Background Check Workflow - Test Plan

## Overview

The background check system is a two-step process:
1. **User Application**: Premium users submit background check application via `/host-gatherings`
2. **Admin Approval**: Admins review and approve applications via `/admin/background-checks`

Once approved, users can create and host gatherings. Background checks expire after 1 year.

---

## Test 1: User Background Check Application

### 1.1 Access the Application Form

**Prerequisites:**
- User is logged in
- User has active premium subscription (`subscription_tier = 'premium'`)

**Steps:**
1. Log in as premium user
2. Go to `/host-gatherings`
3. **PASS** ✅ - Should see background check application form

**Expected Elements:**
- Full Legal Name field
- Date of Birth field (date picker)
- SSN Last 4 field (text input)
- Address Line 1 field
- Address Line 2 field (optional)
- City field
- State field (dropdown or text)
- ZIP Code field
- Consent checkbox
- "Submit Application" button

---

### 1.2 Submit Valid Application

**Steps:**
1. Fill form with valid test data:
   ```
   Full Legal Name: John Test User
   Date of Birth: 01/01/1990
   SSN Last 4: 1234
   Address Line 1: 123 Main Street
   Address Line 2: (leave blank or fill)
   City: Boston
   State: MA
   ZIP Code: 02101
   ```
2. Check consent checkbox
3. Click "Submit Application"
4. **PASS** ✅ - Should see success message: "Application submitted! Our team will review it shortly."

**Verify in Database:**

```sql
-- Check application was created
SELECT
  id, user_id, status,
  full_legal_name, date_of_birth,
  city, state, zip_code,
  submitted_at
FROM background_check_applications
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 1;

-- Expected:
-- status: 'pending'
-- submitted_at: recent timestamp
```

```sql
-- Check profile was updated
SELECT
  id, background_check_status,
  background_check_submitted_at
FROM profiles
WHERE id = 'USER_ID';

-- Expected:
-- background_check_status: 'pending'
-- background_check_submitted_at: recent timestamp
```

---

### 1.3 Submit Form with Missing Fields

**Test Form Validation:**

**Step 1: Missing Required Field**
1. Go to `/host-gatherings`
2. Leave "Full Legal Name" empty
3. Fill all other fields
4. Click "Submit Application"
5. **PASS** ✅ - Should show error: "Missing required fields"

**Step 2: Invalid Date of Birth**
1. Enter invalid date (e.g., "13/32/2025")
2. Click "Submit Application"
3. **PASS** ✅ - Should show appropriate error

---

### 1.4 Prevent Duplicate Applications

**Test Duplicate Submission Prevention:**

**Steps:**
1. Submit valid application (see Test 1.2)
2. Page shows success message
3. Try to submit another application (without admin approval)
4. **PASS** ✅ - Should see error: "You already have a pending background check application"

**Verify:**
```sql
-- Check that only one pending application exists
SELECT
  id, user_id, status,
  created_at
FROM background_check_applications
WHERE user_id = 'USER_ID'
AND status IN ('pending', 'approved')
ORDER BY created_at DESC;

-- Expected: Only 1 record
```

---

### 1.5 Check Application Status in UI

**After Submission:**

1. Refresh `/host-gatherings` page
2. **PASS** ✅ - Should display:
   - "Background Check Status: Pending"
   - "Our team is reviewing your application"
   - Submitted date

---

## Test 2: Admin Background Check Review

### 2.1 Access Admin Panel

**Prerequisites:**
- Admin user is logged in
- Admin email must be in `NEXT_PUBLIC_ADMIN_EMAILS` OR have `verification_status = 'meetup_organizer'`

**Steps:**
1. Log in as admin user
2. Go to `/admin/background-checks`
3. **PASS** ✅ - Should see admin panel (not redirected)

**If Not Admin:**
```sql
-- Check if user has admin rights
SELECT id, email, verification_status, is_admin
FROM profiles
WHERE email = 'admin@example.com';

-- Should have:
-- verification_status = 'meetup_organizer' OR
-- email in NEXT_PUBLIC_ADMIN_EMAILS environment variable
```

---

### 2.2 View Pending Applications

**Admin Panel Display:**

**Steps:**
1. On `/admin/background-checks`
2. Verify:
   - ✅ "Pending" tab is selected by default
   - ✅ List shows all pending applications
   - ✅ Each application shows:
     - Applicant name
     - Submission date
     - "Review" button

**Application List Details:**

For each application, should see:
- Full Legal Name
- Submitted Date
- Current Status badge
- Action buttons (Review, etc.)

---

### 2.3 Open Application Details

**Steps:**
1. Click "Review" button on a pending application
2. **PASS** ✅ - Modal/panel should open showing:
   - Full Legal Name
   - Date of Birth
   - Address (Line 1, Line 2, City, State, ZIP)
   - SSN Last 4
   - Submitted Date
   - "Approve" button
   - "Reject" button (if implemented)
   - Admin Notes field (optional)

---

### 2.4 Approve Application

**Steps:**
1. Open application details (Test 2.3)
2. (Optional) Add admin notes: "Background check completed successfully"
3. Click "Approve" button
4. **PASS** ✅ - Should see success message: "Application approved successfully!"

**Verify in Database:**

```sql
-- Check application approval
SELECT
  id, user_id, status,
  approved_at, expires_at,
  admin_notes
FROM background_check_applications
WHERE id = 'APPLICATION_ID';

-- Expected:
-- status: 'approved'
-- approved_at: recent timestamp
-- expires_at: 1 year from now
```

```sql
-- Check profile update
SELECT
  id, background_check_status,
  background_check_approved_at,
  background_check_expires_at,
  background_check_notes
FROM profiles
WHERE id = 'USER_ID';

-- Expected:
-- background_check_status: 'approved'
-- background_check_approved_at: recent timestamp
-- background_check_expires_at: 1 year from now
-- background_check_notes: admin notes (if provided)
```

**Verify Expiration:**
```sql
-- Confirm 1-year expiration
SELECT
  background_check_approved_at,
  background_check_expires_at,
  EXTRACT(DAY FROM (background_check_expires_at - background_check_approved_at)) as days_valid
FROM profiles
WHERE id = 'USER_ID';

-- Expected: days_valid ≈ 365
```

---

### 2.5 Filter Applications by Status

**Test Admin Filters:**

**Steps:**
1. On `/admin/background-checks`
2. Click "Pending" tab
3. **PASS** ✅ - Shows only pending applications
4. Click "Approved" tab
5. **PASS** ✅ - Shows only approved applications
6. Click "Rejected" tab (if implemented)
7. **PASS** ✅ - Shows only rejected applications
8. Click "All" tab
9. **PASS** ✅ - Shows all applications

---

## Test 3: User Access After Approval

### 3.1 Create Gathering (After Approval)

**Prerequisites:**
- User has active premium subscription
- User has approved background check (not expired)

**Steps:**
1. Log in as approved user
2. Go to `/host-gatherings`
3. **PASS** ✅ - Should see:
   - "Background Check Status: Approved"
   - Approval date
   - Expiration date
   - "Create Gathering" button/form

---

### 3.2 Cannot Create Gathering Without Approval

**Test 3.2a: Premium User, No Background Check**

**Steps:**
1. Premium user without background check
2. Try to go to `/host-gatherings`
3. Go to Create Gathering form
4. **PASS** ✅ - Should see:
   - Background check status: "Not Started"
   - Prompt to "Apply for Background Check"
   - No option to create gathering until approved

---

### 3.2b: Free User (No Premium)

**Steps:**
1. Non-premium user
2. Try to access `/host-gatherings`
3. **PASS** ✅ - Should be blocked or see message:
   - "Premium subscription required"
   - Redirect to `/pricing`

---

## Test 4: Background Check Expiration

### 4.1 Verify Expiration Date

**Immediately After Approval:**

```sql
SELECT
  email,
  background_check_status,
  background_check_approved_at,
  background_check_expires_at,
  (background_check_expires_at > NOW()) as is_valid,
  (background_check_expires_at - NOW()) as time_remaining
FROM profiles
WHERE background_check_status = 'approved'
LIMIT 1;

-- Expected:
-- is_valid: true
-- time_remaining: ~1 year
```

---

### 4.2 Simulate Expiration (For Testing)

**For immediate testing, manually set expiration to past date:**

```sql
-- WARNING: Only for testing! Don't do in production
UPDATE profiles
SET background_check_expires_at = NOW() - INTERVAL '1 day'
WHERE id = 'USER_ID_TO_TEST';
```

**After Setting to Past Date:**

1. User tries to access `/host-gatherings`
2. **PASS** ✅ - Should see:
   - "Background Check Status: Expired"
   - "Your background check has expired. Please reapply."
   - Must reapply (creates new pending application)

---

### 4.3 Expired User Cannot Create Gatherings

**Steps:**
1. User with expired background check
2. Try to create gathering
3. **PASS** ✅ - Should be blocked with message:
   - "Background check required"
   - "Your background check has expired"

---

## Test 5: Rejection Workflow (If Implemented)

### 5.1 Admin Rejects Application

**Steps:**
1. On `/admin/background-checks`
2. Open pending application
3. Click "Reject" button (if available)
4. Enter rejection reason: "Incomplete address information"
5. Click "Confirm Rejection"
6. **PASS** ✅ - Should see success message

**Verify in Database:**

```sql
SELECT
  id, status, rejection_reason
FROM background_check_applications
WHERE id = 'APPLICATION_ID';

-- Expected:
-- status: 'rejected'
-- rejection_reason: "Incomplete address information"
```

### 5.2 Rejected User Can Reapply

**Steps:**
1. User with rejected application
2. Go to `/host-gatherings`
3. **PASS** ✅ - Should see:
   - "Background Check Status: Rejected"
   - Rejection reason
   - "Reapply for Background Check" option
4. Fill form again and submit
5. **PASS** ✅ - New application should be created

---

## Test 6: Database Integrity

### 6.1 Verify RLS Policies

**Test that users can only see their own applications:**

```sql
-- As regular user (via app), try to query:
SELECT * FROM background_check_applications WHERE user_id != 'YOUR_ID';

-- Expected: Permission denied or empty result (depending on RLS policy)
```

### 6.2 Verify Admin Access

**Test that admins can see all applications:**

```sql
-- As admin (via service_role), should be able to:
SELECT * FROM background_check_applications;

-- Expected: Full list of all applications
```

---

## Success Criteria Checklist

- [ ] User can access background check application form at `/host-gatherings`
- [ ] Form validates all required fields
- [ ] Duplicate applications are prevented with error message
- [ ] Application submission creates record in `background_check_applications`
- [ ] User profile updates with `background_check_status: 'pending'`
- [ ] Admin can access `/admin/background-checks`
- [ ] Admin can filter applications by status (Pending, Approved, Rejected)
- [ ] Admin can open and review application details
- [ ] Admin can approve application with optional notes
- [ ] Approval sets status to 'approved' and expires_at = 1 year from now
- [ ] User profile updates with approval date and expiration date
- [ ] Approved user can create/host gatherings
- [ ] Premium user without approval cannot create gatherings
- [ ] Non-premium user cannot access `/host-gatherings`
- [ ] Expired background checks are detected and displayed
- [ ] Expired users cannot create new gatherings (must reapply)
- [ ] Admin rejection workflow works (if implemented)
- [ ] Rejected users can reapply with new application

---

## Related Files

- [Host Gatherings Page](./app/host-gatherings/page.tsx) - User application form
- [Admin Background Checks Page](./app/admin/background-checks/page.tsx) - Admin review panel
- [Apply Endpoint](./app/api/background-check/apply/route.ts) - Submit application
- [Approve Endpoint](./app/api/admin/background-check/[id]/approve/route.ts) - Admin approval
- [Reject Endpoint](./app/api/admin/background-check/[id]/reject/route.ts) - Admin rejection
- [Database Migration 022](./supabase/migrations/022_background_checks.sql) - Background check schema

---

## Troubleshooting

### Issue: Cannot Access `/admin/background-checks`

**Check:**
1. User email must be in `NEXT_PUBLIC_ADMIN_EMAILS`
2. Or user must have `verification_status = 'meetup_organizer'`

```sql
SELECT email, verification_status, is_admin
FROM profiles
WHERE email = 'your@email.com';
```

### Issue: Duplicate Application Error When Trying to Reapply

**Expected Behavior:**
- Users with pending or approved applications cannot create a new one
- After rejection, users can create a new application

**Check status in database:**
```sql
SELECT id, status FROM background_check_applications
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

### Issue: Expiration Date Not Calculated Correctly

**Verify calculation:**
```sql
SELECT
  background_check_approved_at,
  background_check_expires_at,
  EXTRACT(YEAR FROM age(background_check_expires_at, background_check_approved_at)) as years_until_expiry
FROM profiles
WHERE background_check_status = 'approved'
LIMIT 1;

-- Should show: 1 year difference
```

---

## Next Steps

1. Run through all test cases above
2. Document any issues or unexpected behaviors
3. Verify integration with gathering creation workflow
4. Test with multiple users to ensure RLS policies work correctly
5. Verify expiration logic works for scheduled tasks (if auto-renewal needed)
