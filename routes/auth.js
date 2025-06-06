const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb'); // 添加 MongoDB 客户端

// 数据库连接信息
const MONGO_URI = 'mongodb://tgfan:tgfan@209.159.150.210:27017/whatsapp_manager_tgfan';
const DB_NAME = 'whatsapp_manager_tgfan';

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
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    try {
        // 检查是否为管理员登录
        if (username === adminUsername && password === adminPassword) {
            req.session.user = { 
                username: adminUsername,
                role: 'admin',
                groupName: null // 管理员没有特定组
            };
            return res.redirect(res.locals.basePath + '/summary');
        }

        // 尝试作为 groupName 用户登录
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const accountGroups = db.collection('accountgroups');
        
        // 查找匹配的组名
        const group = await accountGroups.findOne({ name: username });
        if (group && password === username + '123456') {
            // 组名存在且密码正确 (groupName + 123456)
            req.session.user = {
                username: username,
                role: 'group',
                groupName: username // 保存组名用于数据过滤
            };
            await client.close();
            return res.redirect(res.locals.basePath + '/summary');
        }
        
        await client.close();
        res.render('login', { error: '无效的用户名或密码', basePath: res.locals.basePath });
    } catch (error) {
        console.error('登录处理失败:', error);
        res.render('login', { error: '登录处理出错，请稍后再试', basePath: res.locals.basePath });
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