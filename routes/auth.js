const express = require('express');
const router = express.Router();

// GET /login - 显示登录页面
router.get('/login', (req, res) => {
    if (req.session.user) {
        // 如果已登录，重定向到仪表盘 (现在是 summary)
        return res.redirect(res.locals.basePath + '/summary'); 
    }
    // 确保 basePath 传递给 login 模板（虽然 login.ejs 可能不直接用，但保持一致性）
    res.render('login', { error: null, basePath: res.locals.basePath });
});

// POST /login - 处理登录请求
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (username === adminUsername && password === adminPassword) {
        req.session.user = { username: adminUsername }; // 存储用户信息到 session
        res.redirect(res.locals.basePath + '/summary'); // 重定向到 summary
    } else {
        res.render('login', { error: '无效的用户名或密码', basePath: res.locals.basePath });
    }
});

// GET /logout - 处理登出请求
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('登出失败:', err);
            // 如果出错，暂时还停留在 summary 页面
            return res.redirect(res.locals.basePath + '/summary'); 
        }
        res.redirect(res.locals.basePath + '/login'); // 登出成功，重定向到登录页面
    });
});

module.exports = router; 