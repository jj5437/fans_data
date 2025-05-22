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
    res.redirect(res.locals.basePath + '/login'); //确保使用basePath
}

// 重定向 /dashboard 到 /summary
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.redirect(res.locals.basePath + '/summary'); //确保使用basePath
});

// GET /summary - 显示进粉汇总表
router.get('/summary', isAuthenticated, async (req, res) => {
    try {
        const { groupName, accountName, phoneNumber, status, startDate, endDate } = req.query;
        let fanSummaryTableData = [];
        let overallStats = { totalFans: 0, uniqueFans: 0 };
        let todayStats = { todayFans: 0, todayUniqueFans: 0 };

        // Parameters for the API call
        const apiParams = {
            groupName: groupName || '',
            accountName: accountName || '',
            phoneNumber: phoneNumber || '',
            status: status || ''
        };

        if (startDate && endDate) {
            try {
                // Ensure dates are valid before stringifying, optional basic validation
                new Date(startDate).toISOString(); 
                new Date(endDate).toISOString();
                apiParams.dateRange = JSON.stringify([startDate, endDate]);
            } catch (e) {
                console.error("Invalid date format for dateRange:", startDate, endDate);
                // Potentially handle error, e.g., by not adding dateRange or sending an error to user
            }
        }

        // Parameters for rendering the template (filters)
        const templateFilters = {
            groupName: groupName || '',
            accountName: accountName || '',
            phoneNumber: phoneNumber || '',
            status: status || '',
            startDate: startDate || '',
            endDate: endDate || ''
        };

        try {
            const summaryResponse = await axios.get(`${API_BASE_URL}/fans/summary`, { params: apiParams }); // Use apiParams
            if (summaryResponse.data && typeof summaryResponse.data === 'object') {
                overallStats.totalFans = summaryResponse.data.totalFans || 0;
                overallStats.uniqueFans = summaryResponse.data.uniqueFans || 0;
                todayStats.todayFans = summaryResponse.data.todayFans || 0;
                todayStats.todayUniqueFans = summaryResponse.data.todayUniqueFans || 0;

                if (Array.isArray(summaryResponse.data.summary)) {
                    fanSummaryTableData = summaryResponse.data.summary.map(item => ({
                        groupName: item.groupName || 'N/A',
                        accountName: item.accountName || 'N/A',
                        accountNumber: item.accountPhoneNumber || 'N/A',
                        accountStatus: item.accountStatus || 'N/A',
                        fansToday: item.todayFans || 0,
                        totalFans: item.totalFans || 0
                    }));
                }
            }
        } catch (apiError) {
            console.error(`调用进粉汇总 API (${API_BASE_URL}/fans/summary) 失败:`, apiError.message);
        }

        res.render('summary', {
            path: '/summary',
            user: req.session.user,
            overallStats: overallStats,
            todayStats: todayStats,
            fanSummary: fanSummaryTableData,
            filters: templateFilters, // Use templateFilters for rendering
            basePath: res.locals.basePath
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
            fanPhoneNumber, country, 
            startDate, endDate
        } = req.query;

        let processedFanDetails = [];
        let totalPages = 1;
        let currentPage = 1;
        let totalRecords = 0; // Initialize totalRecords

        // API 调用参数
        const apiCallParams = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20, 
            groupName: groupName || '',
            accountName: accountName || '',
            accountPhoneNumber: accountPhoneNumber || '',
            fanPhoneNumber: fanPhoneNumber || '',
            country: country || ''
        };
        currentPage = apiCallParams.page;

        if (startDate && endDate) {
            try {
                new Date(startDate).toISOString();
                new Date(endDate).toISOString();
                apiCallParams.dateRange = JSON.stringify([startDate, endDate]);
            } catch (e) {
                console.error("Invalid date format for dateRange in /details:", startDate, endDate);
            }
        }

        // 模板渲染用的筛选条件
        const templateFilters = {
            groupName: apiCallParams.groupName,
            accountName: apiCallParams.accountName,
            accountPhoneNumber: apiCallParams.accountPhoneNumber,
            fanPhoneNumber: apiCallParams.fanPhoneNumber,
            country: apiCallParams.country,
            limit: apiCallParams.limit,
            startDate: startDate || '',
            endDate: endDate || ''
        };

        try {
            const detailsResponse = await axios.get(`${API_BASE_URL}/fans/details`, { params: apiCallParams });
            if (detailsResponse.data && Array.isArray(detailsResponse.data.fans)) {
                processedFanDetails = detailsResponse.data.fans.map(fan => ({
                    groupName: fan.groupName || 'N/A',
                    accountName: fan.accountName || 'N/A',
                    accountNumber: fan.accountPhoneNumber || 'N/A',
                    fanName: fan.fanName || 'N/A',
                    fanNumber: fan.fanPhoneNumber || 'N/A',
                    isDuplicated: fan.isDuplicated || false,
                    addedTime: fan.addedAt ? new Date(fan.addedAt).toLocaleString() : 'N/A',
                    country: fan.country || 'N/A',
                    tags: Array.isArray(fan.tags) && fan.tags.length > 0 ? fan.tags.join(', ') : (fan.tags || 'N/A')
                }));
                totalPages = detailsResponse.data.totalPages || 1;
                totalRecords = detailsResponse.data.totalFans || 0; // Extract totalRecords from API response
            }
        } catch (apiError) {
            console.error(`调用进粉明细 API (${API_BASE_URL}/fans/details) 失败:`, apiError.message);
            // It's good practice to ensure totalRecords is a number even in case of API error for template safety
            totalRecords = 0; 
        }

        res.render('details', {
            path: '/details',
            user: req.session.user,
            fanDetails: processedFanDetails,
            totalPages: totalPages,
            currentPage: currentPage,
            filters: templateFilters,
            totalRecords: totalRecords, // Pass totalRecords to the template
            basePath: res.locals.basePath
        });

    } catch (error) {
        console.error('渲染明细页失败:', error);
        res.status(500).send('服务器错误，无法加载明细数据。');
    }
});

module.exports = router; 