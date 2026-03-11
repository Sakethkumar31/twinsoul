# TODO: Studio Highlights Management & Instagram Auto-Sync

## ✅ Phase 1: Backend API for Gallery Management - COMPLETED
- [x] Create data/gallery.json with initial structure
- [x] Update server.js with CRUD API endpoints for gallery
  - GET /api/admin/gallery - Get all highlights
  - POST /api/admin/gallery - Add new highlight
  - PUT /api/admin/gallery/:id - Update highlight
  - DELETE /api/admin/gallery/:id - Delete highlight
  - GET /api/gallery - Public endpoint to fetch gallery
- [x] Add Instagram sync endpoint
  - POST /api/admin/sync-instagram - Fetch from Instagram API

## ✅ Phase 2: Admin Panel Updates - COMPLETED
- [x] Update admin.html - Add "Studio Highlights" section
- [x] Update admin.js - Add gallery management functionality
  - Add/Edit/Delete UI for highlights
  - Sync from Instagram button
  - Image upload handling
  - Mark as Best Seller from Gallery

## ✅ Phase 3: Frontend Updates - COMPLETED
- [x] Update index.html - Has Best Sellers section
- [x] Update script.js - Fetch and render gallery dynamically
  - Separate posts and reels
  - Handle empty states
  - Load bestsellers dynamically

## ✅ Phase 4: Instagram API Integration - COMPLETED
- [x] Set up Instagram Basic Display API in server.js
- [x] Handle access token refresh
- [x] Implement media fetching from Instagram
- [x] Map Instagram media to gallery format

## ✅ Phase 5: Best Sellers Feature - COMPLETED
- [x] Create data/bestsellers.json with initial structure
- [x] Add API endpoints for Best Sellers
  - GET /api/bestsellers - Public endpoint
  - GET /api/admin/bestsellers - Admin endpoint
  - POST /api/admin/bestsellers - Add best seller
  - PUT /api/admin/bestsellers/:id - Update best seller
  - DELETE /api/admin/bestsellers/:id - Delete best seller
- [x] Add Best Sellers section to admin panel
- [x] Add Best Sellers display to homepage
- [x] Add "Mark as Best Seller" option in gallery

## ✅ Phase 6: Additional Features - COMPLETED
- [x] Add DELETE endpoint for inquiries in server.js
- [x] Add delete button for inquiries in admin panel

## How to Use:

### 1. Instagram Sync
- Go to Admin Panel → Studio Highlights
- Click "Sync from Instagram" to fetch latest posts
- Note: Requires INSTAGRAM_ACCESS_TOKEN environment variable

### 2. Managing Studio Highlights
- Add new highlights manually
- Edit existing highlights
- Delete unwanted highlights
- Mark any highlight as "Best Seller" with one click

### 3. Managing Best Sellers
- Go to Admin Panel → Best Sellers
- Add new best sellers with:
  - Title, description, price
  - Category, image, badge
  - Instagram link (for "View on Instagram" button)
  - Order count, rating
- Edit or delete existing best sellers

### 4. Customer Inquiries
- View all customer requests
- Update status (new, quoted, in-progress, closed)
- Delete inquiries

## Notes:
- Instagram API requires Facebook Developer account and App setup
- Will need Instagram Basic Display API access token from user
- Structure is ready for future automatic sync once credentials provided
