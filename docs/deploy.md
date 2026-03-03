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

## 2. Prepare the Application

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

---

**Maintenance Note:** Ensure you periodically check logs and keep the Ubuntu instance updated (`sudo apt update && sudo apt upgrade`).
