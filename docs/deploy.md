# Deployment Guide: Expense Manager Backend

This guide walks you through deploying the backend on an Ubuntu instance using Docker and Docker Compose. This ensures a clean, isolated, and easily manageable environment.

## 1. Prerequisites

Ensure your Ubuntu instance has Docker and Docker Compose installed.

### Install Docker

```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages:
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Add user to Docker group (optional, to avoid using `sudo` for docker commands)

```bash
sudo usermod -aG docker $USER
# Logout and login back for changes to take effect
```

## 2. Deployment Strategies

There are two ways to deploy: **Building from Source** (currently in `deploy.md`) or **Pulling a Pre-built Image** (Recommended for speed).

### Option A: Pulling a Pre-built Image (Fastest)

This avoids having source code on your server.

1. **On your local machine**, build and push the image:

   ```bash
   # Login to Docker Hub (or your registry)
   docker login

   # Build and Tag (replace 'yourusername' with your actual username)
   docker build -t yourusername/expense-manager:latest .

   # Push
   docker push yourusername/expense-manager:latest
   ```

2. **On the Ubuntu Server**, you only need the `docker-compose.yml` and `.env`. Update `docker-compose.yml` to use the image instead of `build: .`:

   ```yaml
   services:
     app:
       image: yourusername/expense-manager:latest
       # ... rest of the config
   ```

3. **Deploy**:
   ```bash
   docker compose pull
   docker compose up -d
   ```

---

## 3. Prepare the Application (Building from Source)

If you haven't set up a registry yet, follow these steps on the server:

1. **Clone the repository** (or copy the files):

   ```bash
   git clone <your-repo-url>
   cd expensemanager_psql
   ```

2. **Configure Environment Variables**:
   Create a `.env` file based on your requirement.

   ```bash
   nano .env
   ```

   Ensure `PORT` is set (e.g., `PORT=8000`).

3. **Service Account Key (Firebase)**:
   If you use Firebase, ensure `serviceAccountKey.json` is in the root directory.

## 3. Deploy with Docker Compose

Build and start the container in detached mode:

```bash
docker compose up -d --build
```

The application should now be running and accessible at `http://your-server-ip:8000`.

## 4. Common Commands

| Task                        | Command                                      |
| --------------------------- | -------------------------------------------- |
| **View logs**               | `docker compose logs -f app`                 |
| **Stop application**        | `docker compose down`                        |
| **Restart application**     | `docker compose restart app`                 |
| **Check container status**  | `docker compose ps`                          |
| **Run database migrations** | `docker compose exec app npm run db:migrate` |

## 5. Future Updates

To deploy new changes in the future:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

## 6. Accessing the Database (External)

Your database is currently hosted on Aiven. The container connects to it using the credentials in your `.env` file. No additional database setup is required inside the Ubuntu instance unless you decide to move the database to Docker as well.

## 7. Routing `/trakio` with Reverse Proxy (Nginx)

To route only `/trakio` traffic to your new container while the rest of `api.backend.com` goes to your existing backend, update your Nginx configuration.

1. **Edit the config**:

   ```bash
   sudo nano /etc/nginx/sites-available/default
   # (Or wherever your site config resides)
   ```

2. **Add a location block inside your `server` block**:

   ```nginx
   server {
       server_name api.backend.com;

       # Route /trakio to the new container
       location /trakio/ {
           proxy_pass http://localhost:8000/; # Trailing slash is crucial
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # For Socket.IO (optional but recommended)
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }

       # Your EXISTING backend config
       location / {
           proxy_pass http://localhost:3000; # Example existing port
           # ...
       }
   }
   ```

   > [!IMPORTANT]
   > The trailing slash in `proxy_pass http://localhost:8000/;` tells Nginx to strip the `/trakio` prefix before sending the request to the container. This means the app sees `/api/auth` instead of `/trakio/api/auth`.

3. **Test and Reload**:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

**Maintenance Note:** Ensure you periodically check logs and keep the Ubuntu instance updated (`sudo apt update && sudo apt upgrade`).
