-- ==========================================
-- 1. 开启空间扩展 (GIS 核心) [cite: 2]
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================
-- 2. 创建基础表 (无外键依赖)
-- ==========================================

-- 用户与权限管理 [cite: 3]
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,      -- 用户名 [cite: 3]
    password_hash TEXT NOT NULL,               -- 密码
    role VARCHAR(20) DEFAULT 'user',           -- 角色: 'user' (普通) 或 'admin' (管理) [cite: 4, 5]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 校园猫咪档案库 
CREATE TABLE IF NOT EXISTS cats (
    cat_id SERIAL PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL,             -- 昵称 
    gender VARCHAR(10),                        -- 性别 
    fur_color VARCHAR(50),                     -- 毛色 
    character_tags TEXT[],                     -- 性格标签 (如: "亲人", "社恐") 
    health_status TEXT,                        -- 健康及绝育状态 
    avatar_url TEXT,                           -- 头像地址
    is_active BOOLEAN DEFAULT TRUE,            -- 是否在校状态
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. 创建业务表 (含外键依赖)
-- ==========================================

-- 偶遇与投喂打卡记录表 [cite: 8, 9]
CREATE TABLE IF NOT EXISTS check_ins (
    record_id SERIAL PRIMARY KEY,
    cat_id INT REFERENCES cats(cat_id) ON DELETE CASCADE, -- 关联猫咪 [cite: 10]
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL, -- 关联用户
    type VARCHAR(20) CHECK (type IN ('encounter', 'feeding')), -- 记录类型: 偶遇/投喂 [cite: 8, 9]
    -- 空间坐标 (使用 WGS84 坐标系) [cite: 2, 7]
    geom GEOMETRY(Point, 4326), 
    photo_url TEXT,                            -- 打卡照片 [cite: 8]
    description TEXT,                          -- 备注或变迁记录 [cite: 11]
    status VARCHAR(20) DEFAULT 'pending',      -- 管理员审核状态 (pending/approved) 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 故事墙与互动评论区 [cite: 11]
CREATE TABLE IF NOT EXISTS comments (
    comment_id SERIAL PRIMARY KEY,
    cat_id INT REFERENCES cats(cat_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    content TEXT NOT NULL,                     -- 互动轶事内容 [cite: 11]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. 索引设计 (优化空间分析与查询性能)
-- ==========================================

-- 创建空间索引：用于生成热力图和轨迹可视化 [cite: 14]
CREATE INDEX IF NOT EXISTS idx_checkins_geom ON check_ins USING GIST(geom);

-- 创建 B-tree 索引：用于加速档案和关联查询
CREATE INDEX IF NOT EXISTS idx_checkins_cat_id ON check_ins(cat_id);
CREATE INDEX IF NOT EXISTS idx_cats_nickname ON cats(nickname);

-- ==========================================
-- 5. 初始基础数据 (可选测试用例)
-- ==========================================
-- INSERT INTO users (username, password_hash, role) VALUES ('admin_test', 'hash123', 'admin');