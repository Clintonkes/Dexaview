# Deployment Guide

This document explains how to deploy Dexaview to production using Vercel
(frontend) and either AWS EC2 or Railway (backend).

---

## Part 1 – Frontend Deployment (Vercel)

Vercel is a hosting platform that makes deploying React apps extremely simple.
You do not need to configure any servers.

### Step 1 – Build the frontend locally first (sanity check)

```bash
cd frontend
npm run build
```

If this completes without errors, a `dist/` folder is created. This is what
gets deployed. If it fails, fix the errors before proceeding.

### Step 2 – Push your code to GitHub

```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

### Step 3 – Connect to Vercel

1. Go to https://vercel.com and sign up or log in.
2. Click **Add New Project**.
3. Select your GitHub repository.
4. Vercel will auto-detect that this is a Vite/React project.
5. Under **Root Directory**, type `frontend` (this is important — the frontend code lives in a subdirectory).
6. Under **Environment Variables**, add:
   - `VITE_OPENAI_API_KEY` = your OpenAI key
   - `VITE_API_BASE_URL` = the URL of your deployed backend (you will fill this in after Part 2)
7. Click **Deploy**.

Vercel will build and deploy your frontend. You will receive a URL like
`https://dexaview.vercel.app`.

### Step 4 – Custom domain (optional)

In your Vercel project settings, go to **Domains** and add your own domain
name. Vercel provides free SSL certificates automatically.

---

## Part 2a – Backend Deployment (Railway – recommended for simplicity)

Railway is a platform that runs Python servers without manual server setup.

### Step 1 – Create a Railway account

Go to https://railway.app and sign up.

### Step 2 – Create a new project

1. Click **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. Set the **Root Directory** to `backend`.
4. Railway will detect the Python project automatically.

### Step 3 – Add a MySQL database

1. In your Railway project, click **New** → **Database** → **MySQL**.
2. Railway creates a MySQL database and gives you connection details.
3. Copy the connection string (it looks like `mysql://user:pass@host:port/dbname`).
4. Change the prefix from `mysql://` to `mysql+aiomysql://` for the async driver.

### Step 4 – Set environment variables

In your Railway project settings → **Variables**, add:

```
DATABASE_URL      = mysql+aiomysql://...  (from step 3)
SECRET_KEY        = (generate a random 64-char string)
ALLOWED_ORIGINS   = ["https://your-vercel-domain.vercel.app"]
```

### Step 5 – Set the start command

In Railway settings, set the **Start Command** to:

```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Railway provides the `PORT` variable automatically.

### Step 6 – Deploy

Click **Deploy**. Railway will install dependencies and start the server.
Copy the public URL (e.g. `https://dexaview-api.railway.app`) and paste it
into your Vercel `VITE_API_BASE_URL` variable, then redeploy the frontend.

---

## Part 2b – Backend Deployment (AWS EC2 – for production scale)

Use this option if you need more control over the server environment.

### Step 1 – Launch an EC2 instance

1. Log into the AWS Console → EC2 → **Launch Instance**.
2. Choose **Ubuntu Server 24.04 LTS**.
3. Instance type: `t3.medium` (suitable for up to ~200 concurrent users).
4. Add a security group rule: **Custom TCP, Port 8000, Source 0.0.0.0/0**.
5. Create or select an SSH key pair and download it.

### Step 2 – Connect and install dependencies

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update the server
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3.11 python3.11-venv python3-pip -y

# Clone your repository
git clone https://github.com/your-org/dexaview.git
cd dexaview/backend

# Set up the virtual environment
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Step 3 – Configure environment variables

```bash
cp .env.example .env
nano .env   # fill in DATABASE_URL, SECRET_KEY, ALLOWED_ORIGINS
```

### Step 4 – Run with a process manager

Install `supervisor` so the server restarts automatically if it crashes:

```bash
sudo apt install supervisor -y
sudo nano /etc/supervisor/conf.d/dexaview.conf
```

Paste the following:

```ini
[program:dexaview]
command=/home/ubuntu/dexaview/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
directory=/home/ubuntu/dexaview/backend
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/dexaview.err.log
stdout_logfile=/var/log/dexaview.out.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start dexaview
```

### Step 5 – Set up Nginx as a reverse proxy (recommended)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/dexaview
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/dexaview /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Add SSL with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

## Part 3 – YouTube API Integration

To use the YouTube Data API for fetching video metadata:

1. Go to https://console.cloud.google.com
2. Create a new project called "Dexaview".
3. Navigate to **APIs & Services** → **Enable APIs** → search for "YouTube Data API v3" → Enable.
4. Navigate to **Credentials** → **Create Credentials** → **API Key**.
5. Copy the key.
6. Add it to your frontend `.env`:
   ```
   VITE_YOUTUBE_API_KEY=your-youtube-api-key
   ```

> **Important:** Restrict your YouTube API key to only your domain in the Google Console to prevent unauthorised usage charges.

---

## Scaling for Concurrent Users

For thousands of concurrent simulation users, each user runs their simulation
entirely in their own browser — the 3D rendering and physics are client-side.
The backend only handles:

- Authentication (very low load)
- Asset purchases (infrequent)
- Watch-time events (one request per session end)

For high concurrency, increase the number of Uvicorn workers:

```
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 8
```

Or deploy behind a load balancer (AWS ALB, Nginx upstream) pointing to
multiple EC2 instances. The JWT-based authentication is stateless, so any
server can handle any request.
