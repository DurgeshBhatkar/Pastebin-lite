# 🔴 CRITICAL FIX: Environment Variables Are WRONG!

## Your Current Setup (WRONG):
You have ONE environment variable with:
- **Name:** `ATrPAAIncDE4ZTY5N2VjY2U2NjI0OGY2YjMzMjY2Y2E0MTk1MjNiNXAxMTUwNTU` (this is the TOKEN)
- **Value:** `https://special-perch-15055.upstash.io` (this is the URL)

## What You Need (CORRECT):

You need **THREE separate environment variables**:

### 1. Delete the current wrong variable

### 2. Add these THREE variables:

**Variable 1:**
- **Name:** `UPSTASH_REDIS_REST_URL`
- **Value:** `https://special-perch-15055.upstash.io`
- **Environment:** All Environments

**Variable 2:**
- **Name:** `UPSTASH_REDIS_REST_TOKEN`
- **Value:** `ATrPAAIncDE4ZTY5N2VjY2U2NjI0OGY2YjMzMjY2Y2E0MTk1MjNiNXAxMTUwNTU`
- **Environment:** All Environments

**Variable 3:**
- **Name:** `TEST_MODE`
- **Value:** `1`
- **Environment:** All Environments

## Steps in Vercel:

1. Go to: **Settings** → **Environment Variables**
2. **Delete** the existing variable (the one with token as name)
3. Click **"Add Environment Variable"**
4. Add each of the 3 variables above (one at a time)
5. **Redeploy** your project (or wait for auto-redeploy)

## After Fixing:

- Health check should return: `{"ok": true}`
- Root should show the create-paste form
- Creating a paste should work and be viewable
