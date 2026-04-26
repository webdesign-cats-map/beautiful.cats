\# 校园流浪猫空间管理与服务平台 (Campus Cat GIS)



\### 1. 项目简介

本项目是一个基于 WebGIS 技术的校园流浪猫管理系统。通过地图集成、位置上报与空间分析，实现校园流浪猫的档案管理、轨迹追踪及科学救助引导。



\### 2. 技术栈

\* \*\*前端\*\*: Vue.js / R Shiny (集成 Leaflet 地图组件)

\* \*\*后端\*\*: .NET Web API / Node.js

\* \*\*数据库\*\*: PostgreSQL 15 + PostGIS (用于空间数据处理)

\* \*\*UI 视觉\*\*: 莫兰迪绿 (#88a588)



\### 3. 启动步骤



\#### 数据库配置

1\.  在 PostgreSQL 中创建名为 `campus\_cat` 的数据库。

2\.  执行 `sql/init\_db.sql` 脚本初始化表结构并启用 PostGIS 扩展。



\#### 后端运行

1\.  进入 `backend/` 目录。

2\.  运行项目（如：`dotnet run` 或 `npm start`）。



\#### 前端运行

1\.  进入 `frontend/` 目录。

2\.  运行项目（如：`npm run serve`）。



\### 4. 接口入口

\- 详细 RESTful 接口定义请参阅根目录下的 `api\_docs.md`。

