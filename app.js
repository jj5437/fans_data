require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_BASE_PATH = process.env.APP_BASE_PATH || '/';

// 中间件
app.use(express.urlencoded({ extended: true })); // 解析 URL编码的请求体
app.use(express.json()); // 解析 JSON 请求体
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件服务

// EJS 视图引擎设置
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session 配置
app.use(session({
    secret: process.env.SESSION_SECRET, // 添加 session secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 如果是 https，设置为 true
}));

// 中间件：将 session 信息和 basePath 传递给所有视图
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.basePath = APP_BASE_PATH === '/' ? '' : APP_BASE_PATH;
    next();
});

// 路由
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const appRouter = express.Router();

// 为 appRouter 添加默认路由，处理直接访问 APP_BASE_PATH 的情况
appRouter.get('/', (req, res) => {
    const basePathSegment = APP_BASE_PATH === '/' ? '' : APP_BASE_PATH;
    if (req.session.user) {
        res.redirect(basePathSegment + '/summary');
    } else {
        res.redirect(basePathSegment + '/login');
    }
});

appRouter.use('/', authRoutes);
appRouter.use('/', dashboardRoutes);

app.use(APP_BASE_PATH, appRouter);

// 根路径重定向逻辑
app.get('/', (req, res) => {
    if (APP_BASE_PATH === '/') {
        // 如果 APP_BASE_PATH 是根路径, appRouter 的 '/' 处理器会处理
        // 为保险起见，如果上面的逻辑没有覆盖，这里可以显式重定向
        if (req.session.user) {
            res.redirect('/summary');
        } else {
            res.redirect('/login');
        }
    } else {
        // 如果 APP_BASE_PATH 不是根路径, 从 '/' 重定向到 APP_BASE_PATH
        res.redirect(APP_BASE_PATH);
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}${APP_BASE_PATH === '/' ? '' : APP_BASE_PATH}`);
}); 