# Zero-Liability Safety System

This document outlines how your platform protects you from legal liability while ensuring member safety.

## Core Principle: No Anonymous Meetups

**Every person at every meetup is verified and tracked.**

## Verification Requirements

### For Online-Only Participation (Forums, Messages)
- ✅ Email verified
- ❌ Cannot attend meetups

### For Attending In-Person Meetups
- ✅ **Stripe Identity Verification** ($1.50 - user pays)
  - Government ID verification
  - Live selfie match
  - Full name and address verification
  - Creates legal identity record
- ✅ Emergency contact on file
- ✅ Signed liability waiver

### For Hosting/Organizing Meetups
- ✅ **Background Check** ($30-50 - user pays)
  - Criminal record check
  - Sex offender registry
  - National database search
  - Takes 1-3 business days
- ✅ All requirements above
- ✅ Additional organizer waiver

## Legal Protection Layers

### 1. Identity Verification Audit Trail
Every meetup attendance record includes:
```
- User's full legal name
- Verification type and timestamp
- Stripe verification session ID
- Emergency contact at time of meetup
- IP address when they registered
- Exact waiver text they agreed to
```

### 2. Liability Waivers
Users must accept waivers for:
- **General Platform Use** - When signing up
- **Meetup Participation** - Before first meetup
- **Meetup Organizing** - Before hosting first meetup

Waivers include:
- Timestamp and IP address
- Full text of what they agreed to
- Annual re-acceptance requirement
- Specific disclaimers about grief support not being therapy

### 3. Meetup Safety Requirements

**Every meetup must have:**
- ✅ Public or semi-public location (required)
- ✅ Specific address and location name
- ✅ Organizer emergency contact
- ✅ Start and end time
- ✅ Maximum participant limit
- ✅ Check-in/check-out system

**Meetups cannot be:**
- ❌ At private residences (initially)
- ❌ Organized by non-background-checked users
- ❌ Attended by non-verified users
- ❌ Without emergency contact information

### 4. Incident Reporting System

**Anyone can report:**
- Safety concerns
- Inappropriate behavior
- Harassment
- Policy violations

**Reports are tracked with:**
- Reporter and reported user IDs
- Associated meetup (if applicable)
- Severity level
- Investigation status
- Admin notes and resolution
- Actions taken (warning, ban, etc.)

### 5. Automated Tracking

**Platform automatically logs:**
- Every signup with IP and timestamp
- Every verification attempt
- Every meetup registration
- Every check-in/check-out
- Every incident report
- Every admin action

## User Journey Examples

### Example 1: Sarah Wants to Attend a Coffee Meetup

1. ✅ Signs up with email → **Email verified**
2. ✅ Can browse forums, post, read resources
3. ❌ Tries to join meetup → **Blocked**
4. 💳 Completes Stripe Identity ($1.50) → **ID Verified**
5. 📝 Provides emergency contact
6. 📄 Signs meetup participation waiver
7. ✅ Registers for coffee meetup
8. ✅ Checks in when arrives → **Tracked**
9. ✅ Checks out when leaves → **Tracked**

**Legal Protection:** You have Sarah's verified ID, emergency contact, signed waiver, and attendance record.

### Example 2: Mike Wants to Host a Support Group

1. ✅ Email verified → Can browse
2. 💳 Completes Stripe Identity ($1.50) → Can attend meetups
3. 🔍 Pays for background check ($40) → **Background check pending**
4. ⏳ Waits 2 days → **Background check clears**
5. 📄 Signs organizer waiver
6. ✅ Can now create meetups
7. 📝 Creates support group with location, emergency contact
8. ✅ Meetup goes live

**Legal Protection:** Mike is background checked, signed organizer waiver, provided emergency contact, meetup in public location.

## What This Protects You From

### ✅ Protected Scenarios

**Someone gets hurt at a meetup:**
- You have everyone's verified identity
- Signed waivers with liability disclaimers
- Background-checked organizer
- Public location requirement
- Emergency contacts on file
- Incident can be reported and investigated

**Someone claims harassment:**
- Full audit trail of who attended
- Incident reporting system
- Can ban user permanently
- Can cooperate with law enforcement
- Have verified identity records

**Someone tries to sue:**
- Signed liability waivers
- Proof of identity verification
- Records show voluntary participation
- Platform clearly states it's peer support, not therapy
- All safety measures documented

## Costs

**To Platform Owner (You):** $0
- No verification costs
- No background check costs
- Users pay for their own verifications

**To Users:**
- Forum access: Free (email verified)
- Attend meetups: $1.50 one-time (Stripe Identity)
- Host meetups: $40-50 one-time (Background check)
- All verifications are one-time, reusable

## Recommended Legal Additions

Consider adding (consult a lawyer):

1. **Terms of Service** clearly stating:
   - Platform is peer support, not professional therapy
   - Users participate at own risk
   - Platform is not liable for user actions
   - Verification requirements and why

2. **Privacy Policy** explaining:
   - What data you collect (verified IDs, attendance, etc.)
   - Why you collect it (safety, legal protection)
   - How long you keep it
   - When you share it (court orders, emergencies)

3. **Code of Conduct** with:
   - Expected behavior
   - Consequences for violations
   - Ban policy
   - Harassment definitions

4. **Insurance** (optional but recommended):
   - General liability insurance
   - Cyber liability insurance
   - Directors and officers insurance

## Ban System

**Automatic Bans:**
- Failed background check
- Multiple incident reports
- Policy violations

**Ban Records Include:**
- User's verified identity
- Reason for ban
- Evidence/incident reports
- Date and admin who applied ban

**Result:** Banned users cannot create new accounts (verified ID is blocked)

## Emergency Procedures

**If something serious happens:**

1. Platform has all verified identities
2. Can contact emergency contacts
3. Can cooperate with law enforcement
4. All meetup attendance tracked
5. Incident reports documented

**You are NOT liable because:**
- Users signed waivers
- Users voluntarily participated
- Organizers were background checked
- Meetups in public locations
- Platform clearly disclaimed liability
- All reasonable safety measures taken

## Next Steps

1. Run the database migrations
2. Integrate Stripe Identity
3. Integrate background check provider (Checkr or GoodHire)
4. Have a lawyer review waivers and terms
5. Consider getting insurance

---

**Bottom Line:** This system creates a complete legal audit trail showing you took every reasonable precaution to ensure safety. Users pay for verification, you're protected from liability.
