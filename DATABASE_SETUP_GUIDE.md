# Database Setup Guide for SuperSpace

## URGENT: Prevent Data Loss on Server Redeploys

Your current file-based storage gets wiped every time Render redeploys. Here's how to fix it:

## Step 1: Create PostgreSQL Database

### Option A: Render PostgreSQL (Recommended)
1. Go to https://dashboard.render.com
2. Click "New" → "PostgreSQL"
3. Name: `superspace_db` (underscores work better than dashes)
4. Plan: Free tier (up to 1GB)
5. Click "Create Database"
6. Copy the "External Database URL" (starts with postgresql://)

### Option B: ElephantSQL (Alternative free option)
1. Go to https://www.elephantsql.com
2. Sign up for free account
3. Create new instance (Tiny Turtle - Free)
4. Copy the database URL

## Step 2: Add Database URL to Render

1. In your Render dashboard, go to your SuperSpace server
2. Go to "Environment" tab
3. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: (paste the PostgreSQL URL from step 1)
4. Save changes

## Step 3: Deploy Updated Code

The database migration code is ready - just need to:
1. Deploy the updated server code
2. The database tables will be created automatically on first startup

## What This Fixes

- ✅ User accounts persist through server restarts
- ✅ Player progress and game saves are never lost
- ✅ Cloud sync data survives redeploys
- ✅ Space-themed recovery keys still work
- ✅ No emails needed - keeps your current auth system

## Current Status

- [x] Database connection code ready
- [x] CloudSyncAuth updated for database
- [ ] **YOU NEED TO**: Create PostgreSQL database
- [ ] **YOU NEED TO**: Add DATABASE_URL to Render environment
- [ ] **YOU NEED TO**: Deploy updated code

## Next Steps

1. Create the database (5 minutes)
2. Add the DATABASE_URL 
3. Deploy - your users will never lose data again!