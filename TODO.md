# TODO: Studio Highlights Management & Instagram Auto-Sync

## Phase 1: Backend API for Gallery Management ✅ COMPLETED
- [x] Create data/gallery.json with initial structure
- [x] Update server.js with CRUD API endpoints for gallery
  - GET /api/admin/gallery - Get all highlights
  - POST /api/admin/gallery - Add new highlight
  - PUT /api/admin/gallery/:id - Update highlight
  - DELETE /api/admin/gallery/:id - Delete highlight
  - GET /api/gallery - Public endpoint to fetch gallery
- [x] Add Instagram sync endpoint
  - POST /api/admin/sync-instagram - Fetch from Instagram API

## Phase 2: Admin Panel Updates ✅ COMPLETED
- [x] Update admin.html - Add "Studio Highlights" section
- [x] Update admin.js - Add gallery management functionality
  - Add/Edit/Delete UI for highlights
  - Sync from Instagram button
  - Image upload handling

## Phase 3: Frontend Updates ✅ COMPLETED
- [x] Update index.html - Add Best Sellers section
- [x] Update script.js - Fetch and render bestsellers dynamically
  - Separate posts and reels
  - Handle empty states

## Phase 4: Instagram API Integration ✅ PARTIALLY COMPLETE
- [x] Set up Instagram Basic Display API in server.js
- [x] Handle access token refresh
- [x] Implement media fetching from Instagram
- [x] Map Instagram media to gallery format
- [ ] Create PowerShell script automation for syncing

## Phase 5: Best Sellers Feature ✅ COMPLETED
- [x] Create data/bestsellers.json with initial structure
- [x] Add API endpoints for Best Sellers
  - GET /api/bestsellers - Public endpoint
  - GET /api/admin/bestsellers - Admin endpoint
  - POST /api/admin/bestsellers - Add best seller
  - PUT /api/admin/bestsellers/:id - Update best seller
  - DELETE /api/admin/bestsellers/:id - Delete best seller
  - POST /api/admin/gallery-to-bestseller - Convert gallery item to best seller
- [x] Add Best Sellers section to admin panel
- [x] Add Best Sellers display to homepage
- [x] Add "Mark as Best Seller" option in gallery

## Features Added:
1. Studio Highlights (Gallery) management in Admin
   - Add/Edit/Delete highlights
   - "View on Instagram" button for each item
   - "Mark as Best Seller" button to convert gallery item to best seller
   - Sync from Instagram button

2. Best Sellers management in Admin
   - Add new best sellers manually
   - Edit existing best sellers
   - Delete best sellers
   - View on Instagram link for each item

3. Homepage Display
   - Best Sellers section shows top products
   - Navigation includes Best Sellers link
   - Dynamically loaded from API

## Notes:
- Instagram API requires Facebook Developer account and App setup
- Will need Instagram Basic Display API access token from user
- Structure is ready for future automatic sync once credentials provided

