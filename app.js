const render = require('./lib/render');
const logger = require('koa-logger');
const conf = require('./routes.js');
const koaBody = require('koa-body');
const session = require('koa-generic-session');
const convert = require('koa-convert');
const CSRF = require('koa-csrf');
const request = require('request');

const Koa = require('koa');
const app = module.exports = new Koa();

const SERVER_PATH = 'http://127.0.0.1:8081';
const upload = require('./upload');

app.use(logger());

// set the session keys
app.keys = [ 'a', 'b' ];

// add session support
app.use(convert(session()));

// add body parsing
app.use(koaBody({multipart: true}));

// add the CSRF middleware
// app.use(new CSRF({
//     invalidSessionSecretMessage: 'Invalid session secret',
//     invalidSessionSecretStatusCode: 403,
//     invalidTokenMessage: 'Invalid CSRF token',
//     invalidTokenStatusCode: 403,
//     excludedMethods: [ 'GET' ],
//     disableQuery: false
// }));

// routes
const router = require('koa-router')();

// upload
router.post('/batchUpload', upload);

// requst
function send (url, ctx) {
    return new Promise((resolve, reject)=>{
        var options = {
            method: 'POST',
            url: url,
            headers: { 
                'User-Agent': 'request',
                'Cookie': `koa.sid=${ctx.cookies.get('koa.sid')}`
            },
            form: ctx.request.body,
        };

        request.post(options, function(err,httpResponse,body){ 
            if (err) {
                reject({
                    success: false,
                    data: err
                });
            } else {
                let result = JSON.parse(body).data;
                result.setCookie = httpResponse.headers['set-cookie'];
                resolve(result);
            }
        });
    }).then(rs=>rs).catch(e=>e);
}

// cms login post
router.post('/cms/login', async function(ctx){
    if (ctx.session.user){
        ctx.redirect('/cms');
    } else {
        var response = await send('http://localhost:8081/api/login', ctx);
        if(response.success){
            ctx.session.user = Object.assign({},response.user);
            ctx.session.user.mm = ctx.request.body.remember || "0";
            var exdate=new Date()
            exdate.setDate(exdate.getDate()+5)
            response.setCookie.forEach(c=>{
                ctx.cookies.set(
                    c.split(';')[0].split('=')[0],
                    c.split(';')[0].split('=')[1],
                    {
                        expires: exdate,
                        secure: false,
                        signed: false
                    }
                );
            });
            ctx.redirect('/cms');
        } else {
            ctx.redirect('/cms/login', {msg: '登录失败'});
        }
    }
});

// cms login page
router.get('/cms/login', async function(ctx) {
    if (ctx.session.user){
        ctx.redirect('/cms');
    } else {
        ctx.cookies.set('koa.sid', +new Date());
        await ctx.render('./login', {_csrf: ctx.csrf, u: null});
    }
});

// cms
router.get('/cms', async function(ctx) {
    let u = ctx.session.user || null;
    if (u){
        if(u.mm === "0") {
            ctx.session.user = null;
        }
        delete u.mm;
        await ctx.render('./page/cms', {_csrf: ctx.csrf, u: u});
    } else {
        ctx.redirect('/cms/login');
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
