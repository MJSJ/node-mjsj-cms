const render = require('./lib/render');
const logger = require('koa-logger');
const conf = require('./routes.js');
const koaBody = require('koa-body');
const session = require('koa-session');
const CSRF = require('koa-csrf');
const axios = require('axios');

const Koa = require('koa');
const app = module.exports = new Koa();

app.use(logger());

app.use(koaBody());

// add the CSRF middleware
app.keys = ['session secret']
session(app);
app.use(new CSRF());

app.use(render);

// routes
const router = require('koa-router')();
for (let i in conf){
    router.get(i, async function(ctx) {
        // send token to api-server
        ctx.cookies.set('id', '1503564961521', { signed: true });
        axios({
            method: 'get',
            url: 'http://127.0.0.1:8081/api/setToken',
            params: {
                csrf: ctx.csrf
            }
        }).then(function (response) {})
        .catch(function (error) {
            console.log(error.config.url+'出错: '+error.response.status);
        });
        // set token in views
        await ctx.render(conf[i], {_csrf: ctx.csrf});
    });
}

app.use(router.routes());

// listen
if (!module.parent) app.listen(3000);
