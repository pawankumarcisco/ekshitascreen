# EkshitaScreen — Local Backend & Database Installation Guide

This document describes how to deploy the EkshitaScreen Local Backend and PostgreSQL database on a local PC or server (Windows or Linux/Ubuntu). Phase 1 is designed to operate completely independently of public cloud infrastructure.

---

## 1. System Requirements

- **Operating System**: Ubuntu 22.04+ / Debian 12 / Windows 10/11 Pro / Server 2022
- **Node.js**: v18.x or v20.x LTS
- **PostgreSQL**: v14, v15, or v16
- **Storage**: Minimum 20 GB free disk space for high-resolution images
- **RAM**: Minimum 4 GB RAM

---

## 2. PostgreSQL Setup

### Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Switch to postgres user and create database & user
sudo -u postgres psql
```

Inside the PostgreSQL shell:
```sql
CREATE DATABASE screencast;
CREATE USER screencast WITH ENCRYPTED PASSWORD 'screencast_secure_password';
GRANT ALL PRIVILEGES ON DATABASE screencast TO screencast;
\c screencast
GRANT ALL ON SCHEMA public TO screencast;
\q
```

### Windows:
1. Download and run the PostgreSQL installer from [postgresql.org](https://www.postgresql.org/download/windows/).
2. Open pgAdmin or SQL Shell (`psql`) and run the SQL commands above.

---

## 3. Storage Directory Configuration

Create storage directories for media and thumbnails on your local filesystem:
```bash
mkdir -p storage/media storage/thumbnails
chmod -R 755 storage
```

---

## 4. Environment Variables

Create `.env` inside `screencast/apps/backend/.env`:
```env
PORT=4000
DATABASE_URL="postgresql://screencast:screencast_secure_password@localhost:5432/screencast?schema=public"
JWT_SECRET="screencast-local-jwt-secret-key-39281"
DEVICE_KEY_SECRET="screencast-device-key-secret-91823"
STORAGE_DIR="../../storage"
MAX_UPLOAD_SIZE_MB=25
```

---

## 5. Prisma Database Migrations

Apply the database schema:
```bash
cd screencast/apps/backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

---

## 6. Firewall Configuration

For Android TVs to connect over the local network, open ports `3000` (Dashboard/Fullstack) and `4000` (Backend API).

### Ubuntu (UFW):
```bash
sudo ufw allow 3000/tcp comment 'EkshitaScreen Dashboard'
sudo ufw allow 4000/tcp comment 'EkshitaScreen Backend API'
sudo ufw reload
```

### Windows Defender Firewall:
1. Open **Windows Defender Firewall with Advanced Security**.
2. Select **Inbound Rules** > **New Rule**.
3. Choose **Port** > **TCP** > Specific local ports: `3000, 4000`.
4. Select **Allow the connection** and apply to **Private Networks**.
5. Name the rule: `EkshitaScreen Local Signage`.

---

## 7. Starting the Server

### Development Mode:
```bash
npm run dev
```

### Production Mode:
```bash
npm run build
npm run start
```
Verify connectivity by opening `http://<LAN_IP>:3000/api/health` from another device on the network.
Expected response:
```json
{
  "status": "ok",
  "service": "screencast",
  "mode": "local"
}
```
