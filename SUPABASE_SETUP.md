# Supabase Configuration for Email Authentication

## Important: Disable Email Confirmation

To allow users to sign up without email verification:

### 1. Disable Email Confirmation in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `magnudsyqmyqrxhqbcyx`
3. Go to **Authentication** → **Providers** → **Email**
4. **Disable** the "Confirm email" option
5. Click **Save**

### 2. Update Site URL (Optional)

1. Go to **Settings** → **General**
2. Update the **Site URL** to your production domain:
   \`\`\`
   https://your-domain.vercel.app
   \`\`\`

### 3. Configure Redirect URLs (Optional)

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add your production domain to **Redirect URLs**:
   \`\`\`
   https://your-domain.vercel.app/auth/callback
   \`\`\`

### 4. Database Tables

Make sure you have the required tables in your Supabase database. Run the SQL script `scripts/create-community-tables-v2.sql` to create all necessary tables with proper Row Level Security policies.

The script creates:
- `users` table for user profiles
- `messages` table for chat messages
- `message_reactions` table for likes/dislikes
- `typing_indicators` table for real-time typing status

### 5. Email Domain Restriction

The app is configured to only allow @streetrat.ac.th email addresses. This is enforced in the application code, but you can also add a database trigger for additional security:

\`\`\`sql
CREATE OR REPLACE FUNCTION check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@streetrat.ac.th' THEN
    RAISE EXCEPTION 'Only @streetrat.ac.th email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_email_domain_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_email_domain();
\`\`\`

This setup will ensure that:
- Users can sign up instantly without email verification
- Only @streetrat.ac.th emails are allowed
- The community chat works properly with real-time features
