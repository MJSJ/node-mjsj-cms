
const render = require('./lib/render');
const logger = require('koa-logger');
const conf = require('./routes.js');
const koaBody = require('koa-body');


const Koa = require('koa');
const app = module.exports = new Koa();


const router = require('koa-router')();
for (let i in conf){
    router.get(i, async function(ctx) {
        await ctx.render(conf[i], { user: {
            name:'ky',
            role:1
        }});
    })
}


app.use(logger());

app.use(render);

app.use(koaBody());

app.use(router.routes());

// listen

if (!module.parent) app.listen(3000);
