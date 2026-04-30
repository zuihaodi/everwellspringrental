本程序是一个对外展示公司产品与服务的网站程序，以图文内容展示为主，要求网站整体风格统一，结构清晰。

框架：Astro
部署：git仓库+Cloudflare域名与网页发布+域名解析

# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Keystatic 发布流程（最小SOP）
1. 运行 `npm run dev`，打开 `http://localhost:4322/keystatic`（以终端端口为准）。
2. 在后台编辑导航、融资栏目、首页配置并点击 `Save`。
3. 本地预览 `/zh`、`/en`、`/zh/finance-solutions`、`/en/finance-solutions`。
4. 提交内容文件：`git add src/content keystatic.config.ts src/lib src/i18n src/pages src/components`。
5. 推送后由 Cloudflare 自动构建发布。
6. 若发布异常，回滚到上一个 commit。

## ZH to EN Auto Sync
- Run: 
pm run content:translate`n- Lock any EN record by setting 	ranslation.mode = manual_locked in Keystatic.
- In locked mode, ZH updates only mark EN as outdated and do not overwrite EN content.
- Use 
ode scripts/sync-zh-to-en.mjs --force to override locked entries when needed.

