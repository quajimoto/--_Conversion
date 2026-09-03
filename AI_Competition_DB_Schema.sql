-- AI 경진대회 평가 및 집계 시스템 DB 스키마 (MySQL)

CREATE DATABASE IF NOT EXISTS AI_Competition_DB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE AI_Competition_DB;

-- 1. 시스템 설정 테이블 (로그인 방식 등)
CREATE TABLE system_configs (
    config_key VARCHAR(50) PRIMARY KEY COMMENT '설정 키 (예: AUTH_TYPE)',
    config_value VARCHAR(100) NOT NULL COMMENT '설정 값 (SIMPLE, SECURE 등)',
    description VARCHAR(255) COMMENT '설명'
) ENGINE=InnoDB COMMENT='시스템 전역 설정';

-- 2. 사용자(평가자/관리자) 테이블
-- 데이터 무결성을 위해 고유 식별자(PK)를 명확히 지정합니다.
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY COMMENT '사번 또는 고유 로그인 ID',
    password_hash VARCHAR(255) COMMENT '비밀번호 해시 (SIMPLE 모드일 경우 NULL 허용)',
    user_name VARCHAR(50) NOT NULL COMMENT '사용자 이름',
    role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER' COMMENT '권한'
) ENGINE=InnoDB COMMENT='사용자 정보';

-- 3. 대회 및 평가 마스터 테이블
CREATE TABLE evaluation_master (
    master_id INT AUTO_INCREMENT PRIMARY KEY,
    competition_name VARCHAR(200) NOT NULL COMMENT '대회명',
    max_practical INT NOT NULL DEFAULT 10 COMMENT '실무적용 만점',
    max_efficiency INT NOT NULL DEFAULT 10 COMMENT '업무효율 만점',
    max_innovation INT NOT NULL DEFAULT 10 COMMENT '창의성 혁신성 만점',
    max_scalability INT NOT NULL DEFAULT 10 COMMENT '확산 가능성 만점',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '현재 활성화 여부'
) ENGINE=InnoDB COMMENT='대회 기준 정보';

-- 4. 평가 내역 테이블
CREATE TABLE evaluations (
    eval_id INT AUTO_INCREMENT PRIMARY KEY,
    master_id INT NOT NULL COMMENT '기준 마스터 ID',
    department_name VARCHAR(100) NOT NULL COMMENT '대상 부서',
    evaluator_id VARCHAR(50) NOT NULL COMMENT '평가자 ID',
    score_practical INT NOT NULL DEFAULT 0,
    score_efficiency INT NOT NULL DEFAULT 0,
    score_innovation INT NOT NULL DEFAULT 0,
    score_scalability INT NOT NULL DEFAULT 0,
    total_score INT GENERATED ALWAYS AS (score_practical + score_efficiency + score_innovation + score_scalability) STORED,
    submit_status ENUM('TEMP', 'SUBMITTED') NOT NULL DEFAULT 'TEMP' COMMENT '제출 상태',
    submit_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (master_id) REFERENCES evaluation_master(master_id),
    FOREIGN KEY (evaluator_id) REFERENCES users(user_id)
) ENGINE=InnoDB COMMENT='평가 결과 데이터';

-- ==========================================
-- 초기 샘플 데이터 삽입 (DML)
-- ==========================================
INSERT INTO system_configs (config_key, config_value, description) VALUES 
('AUTH_TYPE', 'SIMPLE', '로그인 방식: SIMPLE(이름) 또는 SECURE(사번/PW)');

INSERT INTO users (user_id, password_hash, user_name, role) VALUES 
('ADMIN001', 'hashed_pw_here', '시스템관리자', 'ADMIN'),
('EMP001', NULL, '홍길동', 'USER'),
('EMP002', NULL, '김철수', 'USER');

INSERT INTO evaluation_master (competition_name, max_practical, max_efficiency, max_innovation, max_scalability, is_active) VALUES 
('2026 AI 경진대회 2차', 30, 30, 20, 20, 1);
