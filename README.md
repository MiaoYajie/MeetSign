# MeetSign 活动现场签到系统

MeetSign 是一套面向会议/活动的现场签到解决方案，包含管理端与公开签到端。

## 技术栈

- 后端：ASP.NET 10 Web API、EF Core、SQLite（开发环境）
- 前端：React 19 + TypeScript + Vite（Monorepo）
- 管理端 UI：Ant Design
- 共享包：`@meetsign/form-kit`（动态表单、条件引擎、模板与缓存）

## 功能概览

### 管理端
- 用户注册/登录（JWT）
- 创建活动，配置签到场次与开放时段
- 设置背景图、Logo、页脚
- 管理名单字段（内置：姓名、单位、座位号码 + 自定义字段）
- 拖拽式表单布局与条件展示规则
- 预设名单 / 自由签到两种模式
- 导入名单（Excel/CSV）、生成签到链接与二维码
- 查看/导出签到记录

### 签到端
- 无需注册，扫码或链接直达
- 按配置动态渲染表单
- 支持重复提交并记录次数
- 成功/失败结果本地缓存，可「重新签到」

## 本地启动

### 1. 启动后端

```bash
cd backend/MeetSign.Api
dotnet run
```

默认地址：`http://localhost:5000`

### 2. 启动前端

```bash
cd web
pnpm install
pnpm dev:admin     # http://localhost:5173
pnpm dev:checkin   # http://localhost:5174
```

## 配置项

[`backend/MeetSign.Api/appsettings.json`](backend/MeetSign.Api/appsettings.json)

| 配置 | 说明 |
|---|---|
| `ConnectionStrings:Default` | SQLite 数据库文件 |
| `Jwt:Secret` / `Jwt:Issuer` | 管理端 JWT |
| `PublicCheckInBaseUrl` | 签到页面前端地址（生成链接/二维码） |
| `PublicApiBaseUrl` | API 地址（上传图片公开 URL） |

## 项目结构

```
MeetSign/
├── backend/
│   ├── MeetSign.Api/
│   ├── MeetSign.Application/
│   ├── MeetSign.Domain/
│   └── MeetSign.Infrastructure/
└── web/
    ├── admin/
    ├── checkin/
    └── packages/form-kit/
```

## 典型流程

1. 管理端注册并登录
2. 创建活动，配置字段、表单布局、品牌与消息模板
3. 创建签到场次，导入名单（预设名单模式）
4. 在「分享」页复制链接或下载二维码
5. 参会者打开签到页提交信息
6. 管理端查看/导出签到数据

## 许可证

GNU GPL v3 — 见 [LICENSE](LICENSE)
