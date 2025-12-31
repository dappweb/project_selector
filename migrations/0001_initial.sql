-- 创建招标信息表
CREATE TABLE `tender_info` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`budget` real,
	`publish_time` integer,
	`deadline` integer,
	`purchaser` text,
	`area` text,
	`project_type` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- 创建项目分析表
CREATE TABLE `project_analysis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tender_id` text NOT NULL,
	`ai_classification` text NOT NULL,
	`score_evaluation` text NOT NULL,
	`competitor_analysis` text NOT NULL,
	`analysis_time` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tender_info`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建方案文档表
CREATE TABLE `proposal_document` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tender_id` text NOT NULL,
	`technical_solution` text NOT NULL,
	`commercial_proposal` text NOT NULL,
	`risk_assessment` text NOT NULL,
	`document_path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tender_info`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建成本收益报告表
CREATE TABLE `cost_benefit_report` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tender_id` text NOT NULL,
	`cost_analysis` text NOT NULL,
	`benefit_analysis` text NOT NULL,
	`roi_analysis` text NOT NULL,
	`cash_flow_analysis` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tender_info`(`id`) ON UPDATE no action ON DELETE cascade
);

-- 创建通知记录表
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tender_id` text,
	`type` text NOT NULL,
	`channel` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tender_info`(`id`) ON UPDATE no action ON DELETE set null
);

-- 创建系统配置表
CREATE TABLE `system_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` integer NOT NULL
);

-- 创建索引
-- 招标信息表索引
CREATE INDEX `idx_tender_publish_time` ON `tender_info` (`publish_time`);
CREATE INDEX `idx_tender_budget` ON `tender_info` (`budget`);
CREATE INDEX `idx_tender_area` ON `tender_info` (`area`);
CREATE INDEX `idx_tender_status` ON `tender_info` (`status`);
CREATE INDEX `idx_tender_deadline` ON `tender_info` (`deadline`);

-- 项目分析表索引
CREATE INDEX `idx_analysis_tender_id` ON `project_analysis` (`tender_id`);
CREATE INDEX `idx_analysis_time` ON `project_analysis` (`analysis_time`);

-- 方案文档表索引
CREATE INDEX `idx_proposal_tender_id` ON `proposal_document` (`tender_id`);
CREATE INDEX `idx_proposal_created_at` ON `proposal_document` (`created_at`);

-- 成本收益报告表索引
CREATE INDEX `idx_cost_benefit_tender_id` ON `cost_benefit_report` (`tender_id`);
CREATE INDEX `idx_cost_benefit_created_at` ON `cost_benefit_report` (`created_at`);

-- 通知记录表索引
CREATE INDEX `idx_notification_tender_id` ON `notification_log` (`tender_id`);
CREATE INDEX `idx_notification_status` ON `notification_log` (`status`);
CREATE INDEX `idx_notification_type` ON `notification_log` (`type`);
CREATE INDEX `idx_notification_created_at` ON `notification_log` (`created_at`);

-- 插入初始配置数据
INSERT INTO `system_config` (`key`, `value`, `description`, `updated_at`) VALUES
('crawler_interval', '3600', '数据抓取间隔（秒）', unixepoch()),
('ai_model_version', '1.0', 'AI模型版本', unixepoch()),
('notification_enabled', 'true', '是否启用通知功能', unixepoch()),
('max_concurrent_analysis', '5', '最大并发分析数量', unixepoch()),
('budget_threshold_min', '500000', '预算筛选最小值（元）', unixepoch()),
('budget_threshold_max', '20000000', '预算筛选最大值（元）', unixepoch()),
('email_notification_enabled', 'true', '是否启用邮件通知', unixepoch()),
('wechat_notification_enabled', 'false', '是否启用微信通知', unixepoch()),
('dingtalk_notification_enabled', 'false', '是否启用钉钉通知', unixepoch()),
('deadline_reminder_days', '3', '截止日期提醒天数', unixepoch());