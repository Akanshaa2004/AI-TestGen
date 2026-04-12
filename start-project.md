---
description: How to start the AI TestGen project (backend + frontend)
---

# Starting the AI TestGen Project

## Prerequisites
- Node.js installed
- Both `backend/` and `frontend/` dependencies already installed (`npm install` done)

## Step 1: Start the Backend Server
Open a terminal and run:
```
cd c:\Users\hp\OneDrive\Documents\Tengen\backend
```
// turbo
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run dev
```
This starts the Express API server on **http://localhost:5000**

## Step 2: Start the Frontend Server
Open a **second** terminal and run:
```
cd c:\Users\hp\OneDrive\Documents\Tengen\frontend
```
// turbo
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; npm run dev
```
This starts the Vite dev server on **http://localhost:5173**

## Step 3: Open in Browser
Go to **http://localhost:5173/**

## Login Credentials
- **Email:** admin@testgen.ai
- **Password:** admin123

## Notes
- MongoDB is optional — the app works without it using localStorage
- The `Set-ExecutionPolicy` command is needed because PowerShell blocks npm scripts by default
- Both servers must be running simultaneously
