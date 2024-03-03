const { exec} = require('child_process');
const path = require('path');
const fs = require('fs');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const mime = require('mime-types');
const Redis = require('ioredis');
require('dotenv').config();


const publisher = new Redis(process.env.PUBLISHER_ID);

//creating s3 client instance
const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
}); 

const PROJECT_ID = process.env.PROJECT_ID;

function publishLog (log) {
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({log}));
}
async function init() {
    console.log("executing script.js");
    publishLog("executing script.js");
    const outPath = path.join(__dirname, 'output');

    publishLog("Staring build...");
    const p = exec(`cd ${outPath} && npm install && npm run build`);

    p.stdout.on("data", (data) => {
        console.log("data : ", data.toString());
        if(data.toString().length > 0)  publishLog("data : ", data.toString());
    })
    p.stdout.on("error", (error) => {
        console.log("error : ", error.toString());
        if(error.toString().length > 0) publishLog("error : ", error.toString());
    })
    publishLog("build finished");

    p.on('close', async function (){
        publishLog("starting to upload");
        const distFolderPath = path.join(__dirname, 'output', 'build');
        const distFolderContent = fs.readdirSync(distFolderPath, {recursive: true});

        for(const file of distFolderContent) {

            const filePath = path.join(distFolderPath, file);
            if(fs.lstatSync(filePath).isDirectory()) continue;

            console.log("uploading : ", filePath);
            publishLog("uploading : " + filePath);

            const command = new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `__output/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command);

            console.log("uploaded : ", filePath);
            publishLog("uploaded : " + filePath);
        }
        console.log("done ...");
        publishLog("done....");
    })

}
init();