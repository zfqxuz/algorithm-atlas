# 算法图谱部署说明

部署目标遵循服务器边界约定：

- 目录：`/opt/personal/dijkstra`（不触碰 `/opt/thvote`）
- 容器：`nginxinc/nginx-unprivileged:stable-alpine`
- 网络：外部网络 `personal-net`
- 端口：宿主机 `9000` → 容器 `8080`
- 访问：<http://154.222.16.237:9000/>
- 健康检查：<http://154.222.16.237:9000/healthz>

> GHCR 对该主机返回 denied，因此按部署说明第 6 节改用 Docker Hub 回落镜像。首次拉取的镜像摘要为
> `sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03`。

## 安全配置

- `user: "101:101"`：使用镜像内置的非 root 用户；
- `cap_drop: ALL`、`no-new-privileges`；
- 只读根文件系统，仅 `/tmp` 为大小受限的 tmpfs；
- 站点目录与 Nginx 配置均以只读方式挂载；
- 不挂载 Docker socket，不加入 `thvote-net`；
- 限制 PID 数量，JSON 日志滚动上限 30 MB；
- Nginx 关闭版本号、启用 CSP / X-Frame-Options / nosniff 等响应头，并禁止搜索引擎索引。

## 首次部署

前置条件：已创建 `personal-net`，宿主机 9000 端口已放行。

```bash
sudo docker network create personal-net   # 只需一次
sudo ufw allow 9000/tcp comment 'algorithm atlas'
```

目录结构（生产环境部署 Vite 构建产物 `dist/`）：

```text
/opt/personal/dijkstra/
├── docker-compose.yml
├── nginx.conf
└── site/
    ├── index.html              # 唯一入口：图谱 + 工作台
    ├── visuals.html            # 兼容重定向到 index.html#lab/<id>
    ├── sorting-lab.html        # 兼容重定向
    ├── graph-lab.html          # 兼容重定向
    ├── structures-lab.html     # 兼容重定向
    ├── scheduling-lab.html     # 兼容重定向
    ├── advanced-lab.html       # 兼容重定向
    ├── optimization-lab.html   # 兼容重定向
    ├── transformer-lab.html    # 兼容重定向
    ├── memory-lab.html         # 兼容重定向
    ├── research.html           # 兼容重定向
    ├── dijkstra-visualizer.html# 兼容重定向
    ├── favicon.svg
    ├── assets/                 # Vite 生成的 CSS/JS（含 hash）
    └── ...
```

启动：

```bash
cd /opt/personal/dijkstra
sudo docker compose config -q
sudo docker compose up -d
sudo docker compose ps
```

## 从开发机更新

在项目根目录执行（把 `<ssh-key>` 替换为 personal 账号私钥路径）：

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build

$key = "<ssh-key>"
$host = "personal@154.222.16.237"
$site = "/opt/personal/dijkstra/site"

# 先备份当前线上静态目录
ssh -i $key $host "cp -a /opt/personal/dijkstra/site /opt/personal/dijkstra/site-backup-$(Get-Date -Format yyyyMMdd-HHmmss)"

# 上传 Vite 产物（包含 assets/、engines/、favicon 与所有页面）
scp -i $key -r dist/* "${host}:$site/"

scp -i $key deploy/nginx.conf deploy/docker-compose.yml `
  "${host}:/opt/personal/dijkstra/"
```

首次上传后整理权限：

```bash
chmod -R a+rX /opt/personal/dijkstra/site
chmod 755 /opt/personal/dijkstra/site /opt/personal/dijkstra/site/engines /opt/personal/dijkstra/site/assets
chmod 644 /opt/personal/dijkstra/site/*.html \
  /opt/personal/dijkstra/site/*.css \
  /opt/personal/dijkstra/site/*.js \
  /opt/personal/dijkstra/site/favicon.svg \
  /opt/personal/dijkstra/site/engines/*.js \
  /opt/personal/dijkstra/site/assets/* \
  /opt/personal/dijkstra/docker-compose.yml \
  /opt/personal/dijkstra/nginx.conf
```

> 生产环境使用 `dist/`，不要直接上传根目录源码。Vite 会把新页面的 TypeScript 打包到 `assets/`，同时复制旧页面的经典脚本。

只更新静态文件时，让 Nginx 重新加载即可：

```bash
cd /opt/personal/dijkstra
sudo docker compose exec dijkstra nginx -t
sudo docker compose exec dijkstra nginx -s reload
```

若修改了 Compose 或 Nginx 主配置，则改为重建：

```bash
sudo docker compose up -d --force-recreate
```

> 本机若启用了会拦截非标准端口的系统代理，请将该 IP 加入代理绕过列表后访问。
>
> 静态资源使用 `Cache-Control: no-cache`，更新文件后浏览器会重新校验 ETag，避免新旧版本混载。`engines/` 下的脚本同样按 JS 资源处理。

## GitHub Pages 预览

仓库中的 `.github/workflows/pages.yml` 使用 `VITE_BASE=/algorithm-atlas/` 构建项目 Pages：

- 预览地址：<https://zfqxuz.github.io/algorithm-atlas/>
- Pages 的 Source 选择 **GitHub Actions**；
- 每次 push 到 `main` 自动构建并部署 `dist/`；
- 服务器部署仍是 `/opt/personal/dijkstra`，两者互不影响。

## 运维

```bash
# 日志（访问日志输出到容器 stdout）
cd /opt/personal/dijkstra
sudo docker compose logs --tail=100 -f dijkstra

# 容器健康状态
sudo docker inspect dijkstra-visualizer --format '{{.State.Health.Status}}'

# 重启
sudo docker compose restart dijkstra

# 健康检查
curl -fsS http://127.0.0.1:9000/healthz

# 停止
sudo docker compose down
```

## 回滚

将上一版本静态文件放回 `site/` 后执行：

```bash
sudo docker compose exec dijkstra nginx -s reload
```

若需要更换镜像版本，修改 `docker-compose.yml` 中的 `image` 后：

```bash
sudo docker compose pull
sudo docker compose up -d
```
