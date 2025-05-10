const express = require('express');
const router = express.Router();
const axios = require('axios'); // 引入 axios

// API 基础 URL 从环境变量获取
const API_BASE_URL = process.env.API_BASE_URL;

// 中间件：检查用户是否已登录
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// 重定向 /dashboard 到 /summary
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.redirect('/summary');
});

// GET /summary - 显示进粉汇总表
router.get('/summary', isAuthenticated, async (req, res) => {
    try {
        const { groupName, accountName, phoneNumber, status } = req.query;
        let fanSummary = [];
        const params = {
            groupName: groupName || '',
            accountName: accountName || '',
            phoneNumber: phoneNumber || '',
            status: status || ''
        };

        try {
            const summaryResponse = await axios.get(`${API_BASE_URL}/fans/summary`, { params });
            if (summaryResponse.data && Array.isArray(summaryResponse.data)) {
                fanSummary = summaryResponse.data.map(item => ({
                    groupName: item.groupName || 'N/A',
                    accountName: item.accountName || 'N/A',
                    accountNumber: item.accountPhoneNumber || 'N/A',
                    accountStatus: item.accountStatus || 'N/A',
                    fansToday: item.todayFans || 0,
                    totalFans: item.totalFans || 0
                }));
            }
        } catch (apiError) {
            console.error(`调用进粉汇总 API (${API_BASE_URL}/fans/summary) 失败:`, apiError.message);
        }

        res.render('summary', {
            path: '/summary', // 用于导航栏高亮
            user: req.session.user,
            fanSummary: fanSummary,
            filters: params // 将筛选条件传回给视图，用于表单回填
        });

    } catch (error) {
        console.error('渲染汇总页失败:', error);
        res.status(500).send('服务器错误，无法加载汇总数据。');
    }
});

// GET /details - 显示进粉明细表
router.get('/details', isAuthenticated, async (req, res) => {
    try {
        const { 
            page, limit, 
            groupName, accountName, accountPhoneNumber, 
            fanPhoneNumber, country 
        } = req.query;

        let processedFanDetails = [];
        let totalPages = 1;
        let currentPage = 1;

        const queryParams = { // Renamed to avoid conflict with filters object for rendering
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20, 
            groupName: groupName || '',
            accountName: accountName || '',
            accountPhoneNumber: accountPhoneNumber || '',
            fanPhoneNumber: fanPhoneNumber || '',
            country: country || ''
        };
        currentPage = queryParams.page;

        try {
            const detailsResponse = await axios.get(`${API_BASE_URL}/fans/details`, { params: queryParams });
            if (detailsResponse.data && Array.isArray(detailsResponse.data.fans)) {
                processedFanDetails = detailsResponse.data.fans.map(fan => ({
                    groupName: fan.groupName || 'N/A',
                    accountName: fan.accountName || 'N/A',
                    accountNumber: fan.accountPhoneNumber || 'N/A',
                    fanName: fan.fanName || 'N/A', // 添加粉丝昵称
                    fanNumber: fan.fanPhoneNumber || 'N/A',
                    addedTime: fan.addedAt ? new Date(fan.addedAt).toLocaleString() : 'N/A',
                    country: fan.country || 'N/A',
                    tags: Array.isArray(fan.tags) && fan.tags.length > 0 ? fan.tags.join(', ') : (fan.tags || 'N/A')
                }));
                totalPages = detailsResponse.data.totalPages || 1;
            }
        } catch (apiError) {
            console.error(`调用进粉明细 API (${API_BASE_URL}/fans/details) 失败:`, apiError.message);
        }

        res.render('details', {
            path: '/details', // 用于导航栏高亮
            user: req.session.user,
            fanDetails: processedFanDetails,
            totalPages: totalPages,
            currentPage: currentPage,
            filters: { // For rendering the filter form values
                 groupName: queryParams.groupName,
                 accountName: queryParams.accountName,
                 accountPhoneNumber: queryParams.accountPhoneNumber,
                 fanPhoneNumber: queryParams.fanPhoneNumber,
                 country: queryParams.country,
                 limit: queryParams.limit
            } // 将筛选条件传回给视图
        });

    } catch (error) {
        console.error('渲染明细页失败:', error);
        res.status(500).send('服务器错误，无法加载明细数据。');
    }
});

module.exports = router; 