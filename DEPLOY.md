# Deploying Verdikt

One small Ubuntu server runs everything: Caddy (HTTPS and the website), the Node server, PostgreSQL and the Docker sandboxes.

## 1. Get a server
Any Ubuntu 22.04 or 24.04 server with 2 vCPU and 4 GB RAM works. Students can use **Azure for Students** ($100 credit, no card): https://azure.microsoft.com/free/students

When creating the VM, open the ports for SSH (22), HTTP (80) and HTTPS (443), and set the public IP to **Static**.

## 2. Get a free domain name
Go to https://www.duckdns.org, sign in, create a subdomain (for example `verdikt-yash`) and point it at the server's public IP. Free HTTPS needs a domain name.

## 3. Run the setup script
Connect with `ssh yourusername@SERVER_IP`, then:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USER/verdikt/main/deploy/setup.sh -o setup.sh
sudo bash setup.sh verdikt-yash.duckdns.org https://github.com/YOUR_GITHUB_USER/verdikt.git
```

It installs Docker, Node, Caddy, builds the site, creates the database with a random password, prepares the sandboxes and turns on the firewall. It takes 10 to 20 minutes.

## 4. Update after you push changes
```bash
sudo bash /opt/verdikt/deploy/update.sh
```

## Useful commands
```bash
sudo journalctl -u verdikt -f          # server logs
sudo systemctl status verdikt caddy     # is it running?
sudo docker ps                          # containers (verdikt-db, and verdikt-run-* while judging)
sudo -u verdikt docker exec verdikt-db pg_dump -U verdikt verdikt > backup.sql   # back up the database
```

## Safety notes
- Submissions run in Docker with no network, limited memory, CPU and processes, and a read-only filesystem. Docker is not a perfect boundary, so keep nothing sensitive on this server.
- The settings file `/opt/verdikt/.env` holds the database password. It is never committed to Git.
- Costs: stop (deallocate) the VM from the cloud portal when you don't need it.
