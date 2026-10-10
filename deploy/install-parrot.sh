#!/usr/bin/env bash
# Run on ParrotVPN as ubuntu; the existing ZVal HTTPS/ACME service is preserved.
set -euo pipefail
release_sha=${1:?Pass the Git commit SHA}
[[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
release_dir="/srv/heat-online/releases/$release_sha"
image="heat-online:$release_sha"
nginx_config=/etc/nginx/sites-available/zval-acme
https_config=/etc/nginx/sites-available/zval
sudo test -f "$nginx_config"
sudo test -f "$https_config"
sudo mkdir -p "$release_dir" /srv/heat-online/data
sudo tar -xzf /home/ubuntu/heat-online-release.tar.gz -C "$release_dir"
sudo docker build -f "$release_dir/deploy/Dockerfile.prebuilt" -t "$image" "$release_dir"
sudo chown 1000:1000 /srv/heat-online/data
old_image=$(sudo docker inspect heat-online --format '{{.Config.Image}}' 2>/dev/null || true)
run_service() {
  sudo docker run -d --name heat-online --restart unless-stopped \
    --memory 512m --cpus 1 --pids-limit 128 --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --security-opt no-new-privileges --cap-drop ALL \
    --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
    -p 127.0.0.1:18766:3000 \
    -e HEAT_BASE_PATH=/heat -e VINEXT_TRUST_PROXY=1 \
    -v /srv/heat-online/data:/data "$1"
}
if [[ -n "$old_image" ]]; then
  sudo docker stop heat-online
  sudo docker rm heat-online
fi
run_service "$image"
ready=false
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:18766/heat/ -o /dev/null; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  sudo docker logs --tail 30 heat-online
  sudo docker rm -f heat-online
  if [[ -n "$old_image" ]]; then run_service "$old_image"; fi
  exit 1
fi
sudo test -f "$nginx_config.pre-heat" || sudo cp -a "$nginx_config" "$nginx_config.pre-heat"
sudo test -f "$https_config.pre-heat" || sudo cp -a "$https_config" "$https_config.pre-heat"
sudo python3 - "$nginx_config" "$https_config" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
config = p.read_text()
proxy = '''
        proxy_pass http://127.0.0.1:18766;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        client_max_body_size 32k;
'''
location = 'location / { return 302 https://$host/heat/; }'
config, count = re.subn(r'location /\s*\{[^{}]*\}', lambda _: location, config)
if count != 1 or '/.well-known/acme-challenge/' not in config:
    raise SystemExit('Unexpected HTTP nginx configuration; no changes written')
tls = pathlib.Path(sys.argv[2])
tls_config = tls.read_text()
heat = 'location = /heat { return 308 /heat/; }\n    location ^~ /heat/ {' + proxy + '    }\n\n    '
if 'location ^~ /heat/' in tls_config:
    tls_config = re.sub(r'location = /heat\s*\{[^{}]*\}\s*location \^~ /heat/\s*\{[^{}]*\}\s*', lambda _: heat, tls_config)
else:
    anchor = 'location ^~ /internal/'
    if tls_config.count(anchor) != 1:
        raise SystemExit('Unexpected HTTPS nginx configuration; no changes written')
    tls_config = tls_config.replace(anchor, heat + anchor)
p.write_text(config)
tls.write_text(tls_config)
PY
if ! sudo nginx -t; then
  sudo cp -a "$nginx_config.pre-heat" "$nginx_config"
  sudo cp -a "$https_config.pre-heat" "$https_config"
  exit 1
fi
sudo systemctl reload nginx
sudo ln -sfn "$release_dir" /srv/heat-online/current
sudo docker inspect heat-online --format '{{.Config.Image}} {{.State.Status}}'
