/**
 * Created by yf on 2017/9/1.
 * 
 * 文件上传 仅支持zip格式文件
 * 存放static目录下 解压后删除zip文件
 * 暂不支持与zip内的目录结构对应
 * 支持已存在的文件不被覆盖
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const unzip = require('unzipper');
const STATIC_PATH = path.join(__dirname, '../static');

function saveZipFile (ctx) {
    return new Promise((resolve, reject)=>{
        let files = [];
        const file = ctx.request.body.files.file;

        // mkdir as /static/filename
        let DEST = path.join(STATIC_PATH, file.name.split('.')[0]);
        if(!fs.existsSync(DEST)){
            fs.mkdirSync(DEST);
        }

        // save zip file in /static
        const reader = fs.createReadStream(file.path);
        const stream = fs.createWriteStream(path.join(DEST, file.name));
        reader.pipe(stream)
        .on('close', function(){
            resolve({
                success: true,
                data: stream.path,
                dest: DEST
            });
        })
        .on('erorr', function(e){
            reject({
                success: false,
                data: e,
                dest: DEST
            });
        });
    }).then(result=>result)
    .catch(err=>{
        ctx.body = err;
    });
}

function unzipFile (filePath, dest, ctx) {
    // unzip files in static
    let files = [];
    return fs.createReadStream(filePath)
        .pipe(unzip.Parse())
        .on('entry', function (entry) {
            let parts = entry.path.split(/\//);
            let fileName = parts[parts.length - 1];
            let destFileName = path.join(dest, fileName); //保存的完整文件名

            if(!fs.existsSync(destFileName)){
                entry.pipe(fs.createWriteStream(destFileName));
                files.push(destFileName);
            } else {
                entry.autodrain();
            }    
        })
        .promise()
        .then(() => {
            fs.unlinkSync(filePath);
            return {
                success: true,
                data: files
            };
        }, e => {
            fs.unlinkSync(filePath);
            return {
                success: false,
                data: e
            }
        });
}

async function upload (ctx) {
    // ignore non-POSTs
    if ('POST' != ctx.method) return await next();
    let save = await saveZipFile(ctx);
    if(save.success){
        // save zip file success
        ctx.body = await unzipFile(save.data, save.dest, ctx);
    }
}

module.exports = upload;