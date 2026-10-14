# BloodLink - Blood Donation & Emergency Alert Website

A responsive, hospital-style website for:

- **Donor enrollment** - donors register with name, age, blood group, city and phone.
- **Blood requests** - hospitals submit blood requirements with urgency level.
- **Emergency alerts** - when a request is raised, all donors with a compatible blood group are notified; when a donor accepts, the alert is updated for everyone.
- **Smart dashboard** - blood stock by group, with shortage, expiry and excess indicators, plus replenishment, donor-request and redistribution recommendations (mirrors the system flow diagram).

The site is plain HTML, CSS and JavaScript, so it needs no build step.

## Project structure

```
bloodlink/
├── index.html      # All pages/sections (single-page site)
├── css/
│   └── style.css   # Responsive styles (mobile, tablet, desktop)
├── js/
│   ├── data.js     # Blood groups, compatibility rules, seed inventory
│   └── app.js      # Forms, validation, alerts, dashboard logic
├── vercel.json     # Vercel configuration and security headers
└── README.md
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy to Vercel

**Option A - Vercel dashboard**
1. Push this folder to a GitHub repository.
2. Go to vercel.com, click **Add New > Project**, and import the repository.
3. Framework preset: **Other**. Build command and output directory: leave empty.
4. Click **Deploy**.

**Option B - Vercel CLI**
```bash
npm i -g vercel
cd bloodlink
vercel          # preview deployment
vercel --prod   # production deployment
```

## Important: data storage

This version stores data in the browser's `localStorage`, so it works immediately without a server. That means:

- Data is only visible on the same browser and device.
- Real SMS, email or push notifications to donors are **not** sent yet.

For a real launch, connect a backend such as:

- **Supabase** or **Firebase** for the database and realtime updates
- **Twilio** (SMS) or **SendGrid** (email) to notify donors
- Vercel Serverless Functions (`/api` folder) to keep API keys secret

Replace the `Store` helper in `js/data.js` and the save/render calls in `js/app.js` with API requests.

## Blood compatibility used

| Recipient | Can receive from |
|-----------|------------------|
| O-        | O-               |
| O+        | O+, O-           |
| A-        | A-, O-           |
| A+        | A+, A-, O+, O-   |
| B-        | B-, O-           |
| B+        | B+, B-, O+, O-   |
| AB-       | AB-, A-, B-, O-  |
| AB+       | All groups       |

## Medical disclaimer

This website is for coordination only. Donors must be screened by a qualified medical team before donating, and emergency patients should contact the hospital directly. Call **108** in a life-threatening emergency.
