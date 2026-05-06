-- ============================================================
-- 校园流浪猫WebGIS系统 - PostgreSQL + PostGIS 数据库脚本
-- 说明：当前系统使用前端localStorage存储，此脚本为课程作业提交
--       及未来生产环境迁移预留
-- 使用方式：
--   1. 安装 PostgreSQL + PostGIS 扩展
--   2. 创建数据库：CREATE DATABASE campus_cat;
--   3. 连接并执行：\i schema.sql
-- ============================================================

-- 启用 PostGIS 扩展
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id          VARCHAR(64)  PRIMARY KEY,
    username    VARCHAR(32)  NOT NULL UNIQUE,
    password    VARCHAR(128) NOT NULL,          -- bcrypt哈希
    nickname    VARCHAR(64)  NOT NULL,
    email       VARCHAR(128),
    role        VARCHAR(16)  NOT NULL DEFAULT 'user',  -- user / admin
    avatar_url  TEXT,
    checkin_count INTEGER    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS '系统用户表';
COMMENT ON COLUMN users.role IS 'user=普通用户, admin=管理员';

-- ============================================================
-- 猫咪收藏表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id   VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cat_id    VARCHAR(64) NOT NULL,
    created_at TIMESTAMP  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, cat_id)
);

-- ============================================================
-- 猫咪档案表
-- ============================================================
CREATE TABLE IF NOT EXISTS cats (
    id               VARCHAR(64)  PRIMARY KEY,
    name             VARCHAR(64)  NOT NULL,
    gender           VARCHAR(16)  NOT NULL DEFAULT 'unknown',  -- male / female / unknown
    color            VARCHAR(64),
    personality_tags TEXT[]       DEFAULT '{}',
    health_status    VARCHAR(32)  NOT NULL DEFAULT 'healthy',  -- healthy / injured / missing
    neutered         BOOLEAN      NOT NULL DEFAULT FALSE,
    description      TEXT,
    avatar_url       TEXT,
    checkin_count    INTEGER      NOT NULL DEFAULT 0,
    last_seen_at     TIMESTAMP,
    -- PostGIS 地理位置（WGS84 坐标系）
    location         GEOMETRY(Point, 4326),
    location_address VARCHAR(256),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  cats IS '猫咪档案表';
COMMENT ON COLUMN cats.location IS 'PostGIS Point 类型，SRID=4326 (WGS84)';
COMMENT ON COLUMN cats.health_status IS 'healthy=健康, injured=受伤需关注, missing=失联';

-- 空间索引
CREATE INDEX IF NOT EXISTS idx_cats_location ON cats USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_cats_health   ON cats (health_status);

-- ============================================================
-- 打卡记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS checkins (
    id              VARCHAR(64)  PRIMARY KEY,
    cat_id          VARCHAR(64)  NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    user_id         VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(16)  NOT NULL DEFAULT 'encounter',  -- encounter / feed
    location        GEOMETRY(Point, 4326),
    location_address VARCHAR(256),
    photo_url       TEXT,
    note            TEXT,
    status          VARCHAR(16)  NOT NULL DEFAULT 'pending',  -- pending / approved / rejected
    approved_by     VARCHAR(64)  REFERENCES users(id),
    approved_at     TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  checkins IS '用户打卡记录表';
COMMENT ON COLUMN checkins.type IS 'encounter=偶遇打卡, feed=投喂打卡';
COMMENT ON COLUMN checkins.status IS 'pending=待审核, approved=已通过, rejected=已拒绝';

CREATE INDEX IF NOT EXISTS idx_checkins_cat_id    ON checkins (cat_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id   ON checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status    ON checkins (status);
CREATE INDEX IF NOT EXISTS idx_checkins_location  ON checkins USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_checkins_created   ON checkins (created_at DESC);

-- ============================================================
-- 上报表
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id              VARCHAR(64)  PRIMARY KEY,
    type            VARCHAR(32)  NOT NULL DEFAULT 'new_cat',  -- new_cat / location_update
    cat_id          VARCHAR(64)  REFERENCES cats(id),
    user_id         VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location        GEOMETRY(Point, 4326),
    location_address VARCHAR(256),
    photo_url       TEXT,
    description     TEXT,
    status          VARCHAR(16)  NOT NULL DEFAULT 'pending',
    reviewed_by     VARCHAR(64)  REFERENCES users(id),
    reviewed_at     TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE reports IS '用户上报表（新猫咪/位置更新）';

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_user   ON reports (user_id);

-- ============================================================
-- 评论/故事墙表
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id         VARCHAR(64) PRIMARY KEY,
    cat_id     VARCHAR(64) NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
    user_id    VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT        NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_cat_id ON comments (cat_id);

-- ============================================================
-- 热力图视图（PostGIS 空间聚合）
-- ============================================================
CREATE OR REPLACE VIEW v_heatmap AS
SELECT
    ST_X(location)  AS lng,
    ST_Y(location)  AS lat,
    COUNT(*)        AS weight
FROM checkins
WHERE status = 'approved'
  AND location IS NOT NULL
GROUP BY ST_SnapToGrid(location, 0.0005);  -- 约50米网格聚合

COMMENT ON VIEW v_heatmap IS '打卡热力图数据（按50m网格聚合）';

-- ============================================================
-- 猫咪轨迹视图
-- ============================================================
CREATE OR REPLACE VIEW v_cat_tracks AS
SELECT
    c.id            AS cat_id,
    c.name          AS cat_name,
    ck.created_at   AS seen_at,
    ST_X(ck.location) AS lng,
    ST_Y(ck.location) AS lat,
    ck.location_address
FROM cats c
JOIN checkins ck ON ck.cat_id = c.id
WHERE ck.status = 'approved'
  AND ck.location IS NOT NULL
ORDER BY c.id, ck.created_at;

COMMENT ON VIEW v_cat_tracks IS '猫咪出没轨迹（用于地图轨迹回放）';

-- ============================================================
-- 数据看板统计视图
-- ============================================================
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
    (SELECT COUNT(*) FROM cats)                               AS total_cats,
    (SELECT COUNT(*) FROM cats WHERE neutered = TRUE)        AS neutered_cats,
    (SELECT COUNT(*) FROM cats WHERE health_status='injured') AS injured_cats,
    (SELECT COUNT(*) FROM checkins)                           AS total_checkins,
    (SELECT COUNT(*) FROM checkins WHERE status='pending')    AS pending_checkins,
    (SELECT COUNT(*) FROM checkins WHERE type='feed')         AS total_feeds,
    (SELECT COUNT(*) FROM reports WHERE status='pending')     AS pending_reports,
    (SELECT COUNT(*) FROM users WHERE role='user')            AS total_users;

-- ============================================================
-- 常用 PostGIS 查询示例（供参考）
-- ============================================================

-- 查询某点 500 米范围内的猫咪
-- SELECT id, name, ST_Distance(
--     location::geography,
--     ST_MakePoint(116.397, 39.909)::geography
-- ) AS dist_meters
-- FROM cats
-- WHERE ST_DWithin(
--     location::geography,
--     ST_MakePoint(116.397, 39.909)::geography,
--     500  -- 单位：米
-- )
-- ORDER BY dist_meters;

-- 生成猫咪校园巡游轨迹（LineString）
-- SELECT
--     cat_id,
--     ST_MakeLine(location ORDER BY created_at) AS track_line
-- FROM checkins
-- WHERE status = 'approved' AND cat_id = 'cat_001'
-- GROUP BY cat_id;

-- ============================================================
-- 初始化示例数据
-- ============================================================
INSERT INTO users (id, username, password, nickname, role) VALUES
    ('admin_001', 'admin',  '$2b$12$placeholder_bcrypt_hash', '管理员', 'admin'),
    ('user_001',  'demo',   '$2b$12$placeholder_bcrypt_hash', '测试用户', 'user')
ON CONFLICT (id) DO NOTHING;

INSERT INTO cats (id, name, gender, color, personality_tags, health_status, neutered, description, location, location_address) VALUES
    ('cat_001', '橘橘', 'male',   '橙色虎斑', ARRAY['亲人','爱吃'], 'healthy', TRUE,
     '非常亲人的大橘猫，经常在图书馆门口蹲守等吃的',
     ST_SetSRID(ST_MakePoint(116.397428, 39.909728), 4326), '图书馆门口'),
    ('cat_002', '小白', 'female', '纯白',     ARRAY['社恐','温柔'], 'healthy', TRUE,
     '白色短毛猫，比较胆小，需要慢慢靠近',
     ST_SetSRID(ST_MakePoint(116.398500, 39.910200), 4326), '学生食堂附近'),
    ('cat_003', '黑豆', 'male',   '纯黑',     ARRAY['活泼','调皮'], 'healthy', FALSE,
     '全身黑色，非常活泼好动，喜欢追人',
     ST_SetSRID(ST_MakePoint(116.396100, 39.908900), 4326), '操场北侧'),
    ('cat_004', '花花', 'female', '三花',     ARRAY['傲娇','亲人'], 'injured', TRUE,
     '三花猫，左后腿受过伤，已基本恢复，需要定期关注',
     ST_SetSRID(ST_MakePoint(116.399200, 39.911000), 4326), '宿舍楼C区')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Flask 迁移指南（从localStorage迁移到PostgreSQL）
-- 将 backend/app.py 中的 MEMORY_STORE 操作替换为：
--
-- 安装依赖：pip install psycopg2-binary flask-sqlalchemy
--
-- 连接字符串：
--   postgresql://username:password@localhost:5432/campus_cat
--
-- SQLAlchemy 模型示例（替换 MEMORY_STORE）：
--   from flask_sqlalchemy import SQLAlchemy
--   from geoalchemy2 import Geometry
--   db = SQLAlchemy(app)
--
--   class Cat(db.Model):
--       id       = db.Column(db.String(64), primary_key=True)
--       name     = db.Column(db.String(64), nullable=False)
--       location = db.Column(Geometry('POINT', srid=4326))
--       ...
-- ============================================================
