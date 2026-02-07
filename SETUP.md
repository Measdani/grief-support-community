# Authentication Setup Guide

Your authentication system is now built with enterprise-grade security! Follow these steps to get it working.

## Security Features Included

✅ **Supabase Authentication** - Industry-standard, battle-tested auth
✅ **Secure Password Storage** - Bcrypt hashing, never plain text
✅ **Email Verification** - Confirm user identity before activation
✅ **Session Management** - HTTP-only cookies with CSRF protection
✅ **Protected Routes** - Automatic middleware-based route protection
✅ **Input Validation** - Protection against malicious inputs

## Setup Steps

### 1. Install New Dependencies

Stop your dev server (Ctrl+C) and run:

```bash
npm install
```

### 2. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up (it's free!)
3. Create a new project:
   - Give it a name like "grief-support-community"
   - Create a strong database password (save it somewhere safe!)
   - Choose a region close to you
   - Click "Create new project"
   - Wait 2-3 minutes for setup to complete

### 3. Get Your Supabase Credentials

Once your project is ready:

1. In your Supabase dashboard, click on "Project Settings" (gear icon in sidebar)
2. Click on "API" in the left menu
3. You'll see two important values:
   - **Project URL** (starts with https://)
   - **anon public** key (long string of characters)

### 4. Configure Your Environment Variables

1. In your project folder, create a file called `.env.local`
2. Copy this template and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace:
- `your-project-url-here` with your Project URL from Supabase
- `your-anon-key-here` with your anon public key from Supabase

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Enable Email Auth in Supabase

1. In Supabase dashboard, go to "Authentication" in the sidebar
2. Click "Providers"
3. Make sure "Email" is enabled (it should be by default)
4. Under "Email" settings, you can:
   - Enable/disable email confirmation
   - Customize email templates
   - Set up custom SMTP (optional, for production)

### 6. Start Your Development Server

```bash
npm run dev
```

## Testing Your Authentication

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Join Us" or "Sign In"
3. Try creating a new account:
   - Enter an email and password (minimum 8 characters)
   - Click "Create Account"
   - Check your email for verification link (check spam folder!)
   - Click the verification link
   - You'll be redirected to your dashboard!

## What's Protected

- `/dashboard` - Only accessible when logged in
- Automatic redirect to login if not authenticated
- Secure session cookies that expire
- Protected API routes (for future features)

## Next Steps

Now that authentication is working, you can:

1. **User Profiles** - Let users share their stories
2. **Matching System** - Connect people with similar experiences
3. **Messaging** - Private conversations between members
4. **Community Forums** - Public discussion spaces
5. **Local Groups** - Find support groups nearby

## Troubleshooting

**"Invalid API key" error:**
- Check that you copied the correct keys from Supabase
- Make sure there are no extra spaces in your .env.local file
- Restart your dev server after creating .env.local

**"Email not confirmed" message:**
- Check your spam folder for the verification email
- In Supabase dashboard, you can disable email confirmation for testing
- Go to Authentication > Providers > Email > Confirm email: OFF

**Can't log in after signing up:**
- Make sure you clicked the verification link in your email
- Check Supabase dashboard > Authentication > Users to see if your user exists

## Security Best Practices

- Never commit `.env.local` to git (it's already in .gitignore)
- Use strong passwords in production
- Enable email verification in production
- Set up custom email templates for a better user experience
- Consider adding rate limiting for production
- Use environment variables for all sensitive data

---

Need help? Let me know what features you'd like to add next!
