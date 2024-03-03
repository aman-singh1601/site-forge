const express = require('express');
const cors = require('cors');
const { generateSlug} = require('random-word-slugs');
const {ECSClient, RunTaskCommand} = require("@aws-sdk/client-ecs");
const { Server} = require("socket.io");
const Redis = require('ioredis');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT;

const config = {
    CLUSTER: process.env.CLUSTER,
    TASK: process.env.TASK,
    builderImage: process.env.BUILDER_IMAGE,
    securityGroupId: process.env.SECURITY_GROUP_ID,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    publisherId: process.env.PUBLISHER_ID
}
app.use(cors({origin: ['http://localhost:3000'], methods: ['GET', 'POST']}));
app.use(express.json())

const subscriber = new Redis(process.env.PUBLISHER_ID);

const io = new Server({cors: "*"});

io.on("connection",(socket) => {
    socket.on("subscribe", channel => {
        socket.join(channel);
        console.log(channel);
        socket.emit("message", `joined ${channel}`);
    })
})
io.listen(9001, () => console.log(`socket running on port ${9001}`));

const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretAccessKey
    }
})

app.post('/project',async (req, res)=>{
    const {gitURL, slug} = req.body;
    const projectSlug = slug? slug: generateSlug();

    //spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        count: 1,
        launchType: 'FARGATE',
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: [process.env.SUBNET_ID_1, process.env.SUBNET_ID_2, process.env.SUBNET_ID_3],
                securityGroups: [config.securityGroupId],
                assignPublicIp: "ENABLED"
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: config.builderImage,
                    environment: [
                        { name: 'GIT_REPOSITORY_URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug },
                        { name: 'AWS_ACCESS_KEY_ID', value: config.accessKey},
                        {name: 'AWS_SECRET_ACCESS_KEY', value: config.secretAccessKey},
                        {name: 'AWS_S3_BUCKET_NAME', value:config.bucketName},
                        {name: "PUBLISHER_ID", value: config.publisherId}
                    ]
                }
            ]
        }
    });
    await ecsClient.send(command);

    return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } });
});

async function initSubscribeRedis() {
    subscriber.psubscribe("logs:*");
    subscriber.on("pmessage", (pattern, channel, message) => {
        io.to(channel).emit("message", message);
    })
}
initSubscribeRedis();
app.listen(PORT, () => {
    console.log("API-SERVER listening on port " + PORT);
});