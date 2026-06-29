# HR 小程序

这是一个简单的 Node.js + Express 小程序，用于 HR 在后台编辑岗位/公告，求职者通过公开页面查看最新内容。

主要特性：
- /admin 提供后台登录（基于环境变量 ADMIN_PASSWORD）
- 后台可以创建/编辑/删除岗位
- /jobs 为面向求职者的公开列表页面
- SQLite (db/data.sqlite) 作为存储（如果不存在，应用会自动初始化）
- 包含 Dockerfile，便于部署

快速开始

1) 克隆仓库并进入目录

2) 复制示例环境变量并修改密码：
   cp .env.example .env
   （把 ADMIN_PASSWORD 改为安全密码）

3) 安装依赖并运行：
   npm install
   npm start

4) 打开管理端： http://localhost:3000/admin
   默认示例密码见 .env.example（请部署前修改）

部署

- 本项目包含 Dockerfile，可在你自己的服务器上构建并运行。

说明

我已将基础应用、视图、静态文件和 Dockerfile 提交到仓库。你可以测试后告诉我需要的进一步定制（如富文本编辑、图片上传、认证集成等）。
