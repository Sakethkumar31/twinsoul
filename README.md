# Twin Soul Studio

Business website plus a lightweight admin backend for managing public content, notifications, and customer inquiries.

## What is included

- Public website served from `index.html`
- Admin dashboard at `/admin`
- Backend API in `server.js`
- JSON data storage in `data/`
- Instagram gallery sync script in `tools/sync_instagram_gallery.ps1`

## Run locally

1. Start the server:

```powershell
npm start
```

2. Open:

- Website: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin`

Default admin password:

```text
change-me
```

Set a real password before production:

```powershell
$env:ADMIN_PASSWORD="your-strong-password"
npm start
```

## What the backend manages

- Edit homepage business content
- Add, remove, and activate notification banners
- Receive customer inquiries from the quote form
- Track inquiry status in the admin dashboard

## Data files

- `data/site-content.json`
- `data/notifications.json`
- `data/inquiries.json`

## Free hosting

### Best free demo path

Use Render with the included `render.yaml`.

Steps:

1. Push this project to GitHub.
2. Create a Render account and connect the repo.
3. Create a new Blueprint or Web Service from the repo.
4. Set `ADMIN_PASSWORD` in Render environment variables.
5. Deploy.

### Important hosting caveat

This app currently stores admin edits in local JSON files. On many free hosts, local file storage is not durable. That means:

- website edits may reset after redeploy/restart
- inquiries may not persist long term

For a real production setup, the next step is moving storage from `data/*.json` to a hosted database such as Supabase or Neon.

## Instagram sync

Refresh the gallery manually with:

```powershell
powershell -ExecutionPolicy Bypass -File tools/sync_instagram_gallery.ps1 -Username twin_soulstudio -MaxPosts 24
```

## Notes

- The admin dashboard is intentionally lightweight and file-backed.
- Full Instagram comment text is not included because Instagram blocks reliable public access without authenticated API access.
- In this sandbox, local Node runs required `NODE_PRESERVE_SYMLINKS=1`. That is a sandbox quirk, not a normal deployment requirement.
