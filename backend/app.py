"""
校园流浪猫WebGIS系统 - Flask后端
说明：本版本使用前端localStorage存储数据，后端仅提供API结构和静态文件服务
      生产环境可替换为PostgreSQL+PostGIS数据库
"""

from flask import Flask, send_from_directory, jsonify, request
import os
import json
from datetime import datetime
from functools import wraps

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# ============================
# 配置项
# ============================
class Config:
    # 高德地图Key（请替换为实际Key）
    AMAP_KEY = "YOUR_AMAP_KEY_HERE"
    # 高德地图安全密钥（如需要）
    AMAP_SECRET = "YOUR_AMAP_SECRET_HERE"
    # JWT密钥（生产环境请修改）
    SECRET_KEY = "campus_cat_secret_2024"
    DEBUG = True

app.config.from_object(Config)

# ============================
# 内存缓存（仅用于演示，重启后清空）
# 生产环境请替换为数据库
# ============================
MEMORY_STORE = {
    "cats": [],
    "checkins": [],
    "reports": [],
    "users": []
}


# ============================
# 工具函数
# ============================
def success(data=None, msg="操作成功"):
    return jsonify({"code": 200, "msg": msg, "data": data})

def error(msg="操作失败", code=400):
    return jsonify({"code": code, "msg": msg, "data": None}), code

def get_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ============================
# 首页路由
# ============================
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('../frontend', filename)


# ============================
# 系统配置接口
# ============================
@app.route('/api/config', methods=['GET'])
def get_config():
    """获取前端所需配置（高德Key等）"""
    return success({
        "amap_key": app.config["AMAP_KEY"],
        "amap_secret": app.config["AMAP_SECRET"],
        "version": "1.0.0",
        "system_name": "校园流浪猫WebGIS系统"
    })


# ============================
# 用户认证接口
# （实际验证逻辑在前端localStorage，这里提供API结构）
# ============================
@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    用户注册
    Body: { username, password, email, nickname }
    说明：当前版本数据存储在前端localStorage
    """
    data = request.get_json()
    if not data:
        return error("请求数据不能为空")
    required = ['username', 'password']
    for field in required:
        if not data.get(field):
            return error(f"缺少必填字段: {field}")
    # 实际存储逻辑在前端完成
    return success({
        "message": "注册成功（数据已存储在本地）",
        "username": data.get('username')
    }, "注册成功")

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    用户登录
    Body: { username, password }
    说明：当前版本验证逻辑在前端localStorage
    """
    data = request.get_json()
    if not data:
        return error("请求数据不能为空")
    return success({
        "message": "登录验证在前端完成",
        "token": "local_storage_token"
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    return success(None, "已登出")


# ============================
# 猫咪档案接口
# ============================
@app.route('/api/cats', methods=['GET'])
def get_cats():
    """
    获取猫咪列表
    Query: page, limit, status, gender
    说明：当前版本返回空列表，数据由前端localStorage提供
    """
    return success({
        "list": MEMORY_STORE["cats"],
        "total": len(MEMORY_STORE["cats"]),
        "note": "当前版本数据存储在前端localStorage，此接口为生产环境预留"
    })

@app.route('/api/cats/<cat_id>', methods=['GET'])
def get_cat(cat_id):
    """获取单只猫咪详情"""
    cat = next((c for c in MEMORY_STORE["cats"] if c.get("id") == cat_id), None)
    if not cat:
        return success({
            "id": cat_id,
            "note": "当前版本数据来自前端localStorage"
        })
    return success(cat)

@app.route('/api/cats', methods=['POST'])
def create_cat():
    """
    新增猫咪档案（管理员）
    Body: { name, gender, color, personality_tags, health_status, neutered, location, description }
    """
    data = request.get_json()
    if not data:
        return error("请求数据不能为空")
    cat = {
        "id": f"cat_{datetime.now().timestamp()}",
        "name": data.get("name", "未命名"),
        "gender": data.get("gender", "unknown"),
        "color": data.get("color", ""),
        "personality_tags": data.get("personality_tags", []),
        "health_status": data.get("health_status", "healthy"),
        "neutered": data.get("neutered", False),
        "location": data.get("location", {}),
        "description": data.get("description", ""),
        "avatar": data.get("avatar", ""),
        "created_at": get_timestamp(),
        "updated_at": get_timestamp()
    }
    MEMORY_STORE["cats"].append(cat)
    return success(cat, "猫咪档案创建成功")

@app.route('/api/cats/<cat_id>', methods=['PUT'])
def update_cat(cat_id):
    """更新猫咪档案（管理员）"""
    data = request.get_json()
    cat = next((c for c in MEMORY_STORE["cats"] if c.get("id") == cat_id), None)
    if not cat:
        return error("猫咪不存在", 404)
    cat.update(data)
    cat["updated_at"] = get_timestamp()
    return success(cat, "更新成功")

@app.route('/api/cats/<cat_id>', methods=['DELETE'])
def delete_cat(cat_id):
    """删除猫咪档案（管理员）"""
    MEMORY_STORE["cats"] = [c for c in MEMORY_STORE["cats"] if c.get("id") != cat_id]
    return success(None, "删除成功")


# ============================
# 打卡接口
# ============================
@app.route('/api/checkins', methods=['GET'])
def get_checkins():
    """
    获取打卡记录
    Query: cat_id, user_id, type(encounter/feed), page, limit
    """
    cat_id = request.args.get('cat_id')
    checkins = MEMORY_STORE["checkins"]
    if cat_id:
        checkins = [c for c in checkins if c.get("cat_id") == cat_id]
    return success({
        "list": checkins,
        "total": len(checkins),
        "note": "当前版本数据存储在前端localStorage"
    })

@app.route('/api/checkins', methods=['POST'])
def create_checkin():
    """
    新增打卡记录
    Body: { cat_id, type(encounter/feed), location, photo, note, user_id }
    """
    data = request.get_json()
    if not data:
        return error("请求数据不能为空")
    checkin = {
        "id": f"checkin_{datetime.now().timestamp()}",
        "cat_id": data.get("cat_id"),
        "type": data.get("type", "encounter"),
        "location": data.get("location", {}),
        "photo": data.get("photo", ""),
        "note": data.get("note", ""),
        "user_id": data.get("user_id", ""),
        "status": "pending",  # pending/approved/rejected
        "created_at": get_timestamp()
    }
    MEMORY_STORE["checkins"].append(checkin)
    return success(checkin, "打卡成功，等待审核")

@app.route('/api/checkins/<checkin_id>/approve', methods=['PUT'])
def approve_checkin(checkin_id):
    """审核打卡记录（管理员）"""
    data = request.get_json() or {}
    checkin = next((c for c in MEMORY_STORE["checkins"] if c.get("id") == checkin_id), None)
    if not checkin:
        return error("记录不存在", 404)
    checkin["status"] = data.get("status", "approved")
    checkin["reviewed_at"] = get_timestamp()
    return success(checkin, "审核完成")


# ============================
# 用户上报接口
# ============================
@app.route('/api/reports', methods=['POST'])
def create_report():
    """
    用户上报新猫咪或位置
    Body: { type, cat_id, location, photo, description, user_id }
    """
    data = request.get_json()
    if not data:
        return error("请求数据不能为空")
    report = {
        "id": f"report_{datetime.now().timestamp()}",
        "type": data.get("type", "new_cat"),
        "cat_id": data.get("cat_id"),
        "location": data.get("location", {}),
        "photo": data.get("photo", ""),
        "description": data.get("description", ""),
        "user_id": data.get("user_id", ""),
        "status": "pending",
        "created_at": get_timestamp()
    }
    MEMORY_STORE["reports"].append(report)
    return success(report, "上报成功，等待审核")

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """获取上报列表（管理员）"""
    status = request.args.get('status')
    reports = MEMORY_STORE["reports"]
    if status:
        reports = [r for r in reports if r.get("status") == status]
    return success({"list": reports, "total": len(reports)})


# ============================
# 统计数据接口
# ============================
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    获取数据看板统计
    返回：猫咪总数、今日打卡、待审核等
    说明：当前版本统计数据来自前端localStorage
    """
    return success({
        "total_cats": len(MEMORY_STORE["cats"]),
        "total_checkins": len(MEMORY_STORE["checkins"]),
        "pending_reviews": len([c for c in MEMORY_STORE["checkins"] if c.get("status") == "pending"]),
        "note": "当前版本主要统计数据来自前端localStorage",
        "timestamp": get_timestamp()
    })

@app.route('/api/stats/heatmap', methods=['GET'])
def get_heatmap():
    """
    获取热力图数据
    返回: [{ lng, lat, weight }]
    """
    heatmap_data = []
    for checkin in MEMORY_STORE["checkins"]:
        loc = checkin.get("location", {})
        if loc.get("lng") and loc.get("lat"):
            heatmap_data.append({
                "lng": loc["lng"],
                "lat": loc["lat"],
                "weight": 1
            })
    return success(heatmap_data)


# ============================
# 评论/故事墙接口
# ============================
@app.route('/api/cats/<cat_id>/comments', methods=['GET'])
def get_comments(cat_id):
    """获取某只猫的评论/故事"""
    return success({
        "cat_id": cat_id,
        "list": [],
        "note": "评论数据存储在前端localStorage"
    })

@app.route('/api/cats/<cat_id>/comments', methods=['POST'])
def add_comment(cat_id):
    """添加评论"""
    data = request.get_json()
    return success({
        "cat_id": cat_id,
        "content": data.get("content", ""),
        "created_at": get_timestamp()
    }, "评论成功")


# ============================
# 管理员接口
# ============================
@app.route('/api/admin/users', methods=['GET'])
def admin_get_users():
    """获取用户列表（管理员）"""
    return success({
        "list": MEMORY_STORE["users"],
        "total": len(MEMORY_STORE["users"]),
        "note": "当前版本用户数据存储在前端localStorage"
    })

@app.route('/api/admin/dashboard', methods=['GET'])
def admin_dashboard():
    """管理员数据看板"""
    return success({
        "cats_count": len(MEMORY_STORE["cats"]),
        "checkins_count": len(MEMORY_STORE["checkins"]),
        "pending_reports": len([r for r in MEMORY_STORE["reports"] if r.get("status") == "pending"]),
        "pending_checkins": len([c for c in MEMORY_STORE["checkins"] if c.get("status") == "pending"]),
        "timestamp": get_timestamp()
    })


# ============================
# 健康检查
# ============================
@app.route('/api/health', methods=['GET'])
def health():
    return success({"status": "ok", "time": get_timestamp()})


if __name__ == '__main__':
    print("=" * 50)
    print("校园流浪猫WebGIS系统启动")
    print("请在 app.py 中配置 AMAP_KEY")
    print("访问地址: http://localhost:5000")
    print("=" * 50)
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
