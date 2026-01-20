# Deployment Guide - Joyson EMS

## Hosting on Hostinger Business Plan

### Prerequisites
- Node.js v18+ installed on server
- MySQL database access
- Domain name
- SSH access to server

### Quick Start

1. **Clone Repository**
```bash
cd /var/www
git clone https://github.com/graceems2026-cmyk/joysonems.git
cd joysonems
npm install
```

2. **Setup Environment**
```bash
cp .env.example .env
# Edit .env with your actual production values
nano .env
```

3. **Database Setup**
```bash
mysql -u root -p
CREATE DATABASE employee_management;
CREATE USER 'ems_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON employee_management.* TO 'ems_user'@'localhost';
FLUSH PRIVILEGES;

# Import schema
mysql -u ems_user -p employee_management < database/schema.sql
```

4. **Start Application with PM2**
```bash
npm install -g pm2
pm2 start server.js --name "joyson-ems"
pm2 startup
pm2 save
```

5. **Configure Nginx**
See `.nginx.example` for Nginx configuration template

6. **Setup SSL Certificate**
```bash
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

### Maintenance Commands

```bash
# View logs
pm2 logs joyson-ems

# Restart application
pm2 restart joyson-ems

# Check status
pm2 status

# Monitor resources
pm2 monit
```

### Database Backup

Create automated backups:
```bash
sudo crontab -e
# Add: 0 2 * * * mysqldump -u ems_user -p'password' employee_management > /var/backups/mysql/backup_$(date +\%Y\%m\%d).sql
```

### Troubleshooting

- Check logs: `pm2 logs joyson-ems`
- Check database connection: `mysql -u ems_user -p -e "SELECT 1;"`
- Check Nginx: `sudo nginx -t && sudo systemctl status nginx`

### Security Checklist

- [ ] Update `.env` with strong passwords
- [ ] Enable SSL/HTTPS
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up log monitoring
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

For detailed instructions, see the step-by-step guide provided in the hosting documentation.
