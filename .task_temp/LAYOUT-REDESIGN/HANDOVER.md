# 任务 LAYOUT-REDESIGN 交接摘要

- **执行人**: @Coder-FE
- **核心改动**:
  - **AppHeader**: 改为默认 solid white 背景 + `border-b border-gray-200`，滚动时添加 `shadow-md`（替代原有的 blur backdrop）。新增 notification bell（`pi pi-bell`）带 badge、admin badge、user avatar + name dropdown。高度固定 64px。
  - **AppSidebar**: Desktop 默认 solid white + `border-r border-gray-200` + `pt-16` 避开 header。新增 `sections` 输入支持 "Main"/"Management" 分组导航。所有图标替换为 PrimeIcons（`pi pi-*`）。Active state 使用左侧 3px accent bar + light primary tint。底部新增 user profile summary（avatar, name, role）。Mobile drawer 使用 slide-in + overlay backdrop。
  - **AppLayout**: 新增 `isAdminRoute` signal，通过监听 `NavigationEnd` 检测 `/admin/*` 路由。Admin 模式应用 `bg-[#F2F3F5]`  solid 背景 + solid sidebar；User 模式保持 `gradient-page-bg` + glass sidebar。新增 breadcrumb 预留容器。统一 z-index：Header 50, Sidebar 40, Content 1。
- **关键假设**:
  - `AuthStore.currentUser` 提供 `name` 和 `userType`（ADMIN/SUPER_ADMIN/CUSTOMER）。
  - Admin 路由以 `/admin` 开头。
  - PrimeIcons 已全局可用（`primeicons` 包已安装）。
  - `NgClass` 已在需要的组件中显式导入。
- **潜在坑点**:
  - `AppSidebarComponent.solid` 默认值从 `false` 改为 `true`，如果其他页面（未使用 `AppLayout`）直接使用 `app-sidebar` 且期望 glass 效果，需要显式传入 `[solid]="false"`。
  - `app-layout.component.html` 将 `main` 的 `pt-16` 调整为 `pt-4`，因为 breadcrumb 容器已经负责 header offset。如果未来移除 breadcrumb，需要恢复 `pt-16`。
  - Mobile drawer 中的底部 profile 未显示（空间限制），仅在 desktop sidebar 展示。
- **测试提醒**:
  - 请 @Guardian 重点审查：
    1. 滚动状态切换的动画性能（HostListener + signal）。
    2. Admin/User 模式在路由切换时的背景类是否正确切换。
    3. PrimeIcons 类名是否在所有导航项中正确渲染（无 emoji 残留）。
    4. Responsive 断点下的 sidebar drawer 行为。
  - 测试覆盖率：Layout 目录 53/53 tests passing。
