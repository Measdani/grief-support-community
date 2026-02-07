# Database Setup - ID Verification System

This guide will help you set up the database tables for your ID verification and user safety system.

## What This Sets Up

✅ **User Profiles** - Extended profile information with verification tracking
✅ **Verification Levels** - Unverified → Email Verified → ID Verified → Meetup Organizer
✅ **Verification Requests** - Track and approve ID verification submissions
✅ **Activity Logging** - Monitor user actions for security
✅ **Row Level Security** - Database-level access control
✅ **Automatic Triggers** - Auto-create profiles on signup

## Verification Levels

| Level | Badge | Permissions |
|-------|-------|-------------|
| **Unverified** | ⏳ | Browse resources only |
| **Email Verified** | 📧 | Post in forums |
| **ID Verified** | ✅ | Join meetups, send messages, full access |
| **Meetup Organizer** | ⭐ | Create and host meetups |

## Setup Steps

### Step 1: Open Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Migration

1. Open the file: `supabase/migrations/001_user_verification.sql`
2. Copy the ENTIRE contents of that file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

You should see a success message. This creates:
- `profiles` table
- `verification_requests` table
- `user_activity_log` table
- All necessary triggers and policies

### Step 3: Verify Tables Were Created

1. In Supabase, click **Table Editor** in the left sidebar
2. You should see these new tables:
   - ✅ profiles
   - ✅ verification_requests
   - ✅ user_activity_log

### Step 4: Set Up Admin Role (Optional)

To make yourself an admin for approving verifications:

1. In Supabase SQL Editor, run this query (replace with your email):

```sql
-- Make yourself an admin
UPDATE public.profiles
SET verification_status = 'id_verified'
WHERE email = 'your-email@example.com';

-- Optional: Make yourself a meetup organizer (highest level)
UPDATE public.profiles
SET
  verification_status = 'meetup_organizer',
  meetup_organizer_verified_at = NOW()
WHERE email = 'your-email@example.com';
```

## How It Works

### New User Signup Flow

1. User signs up → Profile automatically created with `unverified` status
2. User verifies email → Status updated to `email_verified`
3. User submits ID verification request → Creates entry in `verification_requests`
4. Admin reviews and approves → Status updated to `id_verified`
5. Optional: User applies for meetup organizer → Admin approves → Status becomes `meetup_organizer`

### What Each Table Does

**profiles**
- Extended user information
- Verification status and timestamps
- Privacy settings
- Safety flags (ban system)

**verification_requests**
- Tracks ID verification submissions
- Stores submitted documents and info
- Admin review notes
- Approval/rejection tracking

**user_activity_log**
- Security audit trail
- Tracks signups, logins, profile changes
- IP addresses and user agents
- Helps identify suspicious activity

## Security Features

✅ **Row Level Security (RLS)** - Users can only see what they're allowed to
✅ **Automatic Profile Creation** - No orphaned auth users
✅ **Email Verification Tracking** - Synced with Supabase auth
✅ **Activity Logging** - Track all important actions
✅ **Ban System** - Ability to ban problematic users

## Testing the Database

After setup, you can test with these queries:

```sql
-- View all profiles
SELECT id, email, verification_status, created_at
FROM public.profiles
ORDER BY created_at DESC;

-- View pending verification requests
SELECT
  vr.*,
  p.email,
  p.display_name
FROM public.verification_requests vr
JOIN public.profiles p ON p.id = vr.user_id
WHERE vr.status = 'pending'
ORDER BY vr.created_at DESC;

-- View recent activity
SELECT
  al.*,
  p.email
FROM public.user_activity_log al
JOIN public.profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 20;
```

## Next Steps

After the database is set up:

1. ✅ Database tables created
2. 📝 Build ID verification request form
3. 👔 Create admin dashboard for approvals
4. 🔒 Add access restrictions based on verification level
5. 🎨 Add verification badges to UI

## Troubleshooting

**"relation already exists" error:**
- The tables are already created. You can skip this step or drop them first.

**"permission denied" error:**
- Make sure you're using the SQL Editor in Supabase dashboard
- You should be automatically authenticated as the project owner

**Can't see the tables:**
- Refresh the Table Editor page
- Check that you selected the correct project

---

Need help? Let me know what step you're on!
