const render = require('./lib/render');
const logger = require('koa-logger');
const conf = require('./routes.js');
const koaBody = require('koa-body');
const session = require('koa-generic-session');
const convert = require('koa-convert');
const CSRF = require('koa-csrf');
const axios = require('axios');

const Koa = require('koa');
const app = module.exports = new Koa();
const SERVER_PATH = 'http://127.0.0.1:8081';

app.use(logger());

// set the session keys
app.keys = [ 'a', 'b' ];

// add session support
app.use(convert(session()));

// add body parsing
app.use(koaBody());

// add the CSRF middleware
app.use(new CSRF({
    invalidSessionSecretMessage: 'Invalid session secret',
    invalidSessionSecretStatusCode: 403,
    invalidTokenMessage: 'Invalid CSRF token',
    invalidTokenStatusCode: 403,
    excludedMethods: [ 'GET' ],
    disableQuery: false
}));

// axios interceptors
axios.interceptors.response.use(function (rs) {
    return rs.data;
});

// routes
const router = require('koa-router')();

// api转发
router.post(/^\/api(?:\/|$)/, async function(ctx){
    await axios({
        method: 'POST',
        url: SERVER_PATH + ctx.path,
        data: ctx.request.body
    })
    .then(function (res) {
        if(res.data){
            ctx.body = res;
        } else {
            ctx.body = '接口错误:' + res.status;
        }
    }).catch(function(res){
        console.log('接口异常:' + res);
    });
});

router.get(/^\/api(?:\/|$)/, async function(ctx){
    axios({
        method: 'GET',
        url: SERVER_PATH + ctx.path
    })
    .then(function (res) {
        if(res.success){
            ctx.body = res;
        } else {
            ctx.body = '接口错误:' + res;
        }
    }).catch(function(res){
        console.log('接口异常:' + res);
    });
});

// cms login
router.post('/login', async function(ctx){
    let u = ctx.session.user || ctx.cookies.get('u');
    if (!u){
        await axios({
            method: 'POST',
            url: SERVER_PATH + ctx.path,
            data: ctx.request.body
        })
        .then(function (res) {
            if(res.data.success){
                ctx.session.user = res.data.user;
                ctx.redirect('/cms');
            } else {
                ctx.redirect('/login', {msg: '登录失败'});
            }
        }).catch(function(res){
            console.log('接口异常:' + res);
        });
    } else {
        ctx.redirect('/cms');
    }
});

// cms
router.get('/cms', async function(ctx) {
    let u = ctx.session.user || ctx.cookies.get('u');
    if (u){
        await ctx.render('./page/cms', {_csrf: ctx.csrf, u: u});
    } else {
        ctx.redirect('/login');
    }
});

// 页面router
for (let i in conf){
    router.get(i, async function(ctx) {
        await ctx.render(conf[i], {_csrf: ctx.csrf, u: null});
    });
}

app.use(render);

app.use(router.routes());

// listen
if (!module.parent) app.listen(3000);
