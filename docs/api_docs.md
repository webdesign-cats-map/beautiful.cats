\# 校园流浪猫系统 - API 接口文档



\## 1. 档案库管理 (Cat Profiles)

\- \*\*获取所有猫咪\*\*

&#x20;   - `GET /api/cats`

&#x20;   - 返回：猫咪 ID、昵称、性格标签、绝育状态。

\- \*\*获取猫咪详情\*\*

&#x20;   - `GET /api/cats/{id}`

&#x20;   - 返回：该猫咪的完整档案及历史打卡记录。



\## 2. 空间打卡功能 (Check-in)

\- \*\*提交打卡记录 (偶遇/投喂)\*\*

&#x20;   - `POST /api/checkins`

&#x20;   - 请求体：`{ cat\_id, type, lng, lat, photo\_url, description }`

&#x20;   - 说明：利用手机 GPS 调用坐标，经过管理员审核后更新地图点位。



\## 3. 地图与空间分析 (GIS)

\- \*\*获取地图点位\*\*

&#x20;   - `GET /api/map/points`

&#x20;   - 返回：用于前端展示的猫咪出没点位 (GeoJSON 格式)。

\- \*\*行踪热力图\*\*

&#x20;   - `GET /api/analysis/heatmap`

&#x20;   - 返回：整合目击数据生成的出没热力图数据。



\## 4. 管理员功能 (Admin)

\- \*\*审核上报信息\*\*

&#x20;   - `PATCH /api/admin/checkins/{id}`

&#x20;   - 参数：`{ status: "approved" | "rejected" }`

