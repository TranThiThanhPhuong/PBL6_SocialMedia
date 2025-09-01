import fs from 'fs';
import imagekit from "../configs/imageKit.js";
import Message from '../models/Message.js';

const connections = {};

export const sseController = (req, res) => {
    const { userId } = req.parmams; // lay userId tu params tren url
    console.log('New client connected:', userId);

    res.setHeader('Content-Type', 'text/event-stream'); // set header de biet day la SSE
    res.setHeader('Cache-Control', 'no-cache'); // khong luu cache
    res.setHeader('Connection', 'keep-alive'); // giu ket noi luon luon
    res.setHeader('Access-Control-Allow-Origin', '*'); // cho phep tat ca cac nguon

    connections[userId] = res; // luu res vao trong connections voi key la userId

    res.write('log: Connected to SEE stream\n\n'); // gui tin nhan ket noi thanh cong

    req.on('close', () => { // khi client ngat ket 
        delete connections[userId]; // xoa res khoi connections
        console.log('Client disconnected:'); 
    });
}

export const sendMessage = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { to_user_id, text } = req.body;
        const image = req.file; // chi co 1 file media duoc upload len
        let media_url = ''; // luu tru url cua media (image hoac video)
        let message_type = image ? 'image' : 'text'; // neu co image thi la image, khong thi la text

        if (message_type === 'image') {
            const fileBuffer = fs.readFileSync(image.path);
            const response =  await imagekit.upload({
                file: fileBuffer, 
                fileName: image.originalname,
            });
            media_url = imagekit.url({
                path: response.filePath,
                transformation: [
                    {quality: 'auto'},
                    {format: 'webp'},
                    {width: '1280'}
                ]
            }) // lay url cua media vua upload len
        } 

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url
        })

        res.json({success: true, message});

        // gui tin nhan den nguoi nhan neu su dung sse
        const messageWithUserData = await Message.findById(message._id).populate('from_user_id'); // lay thong tin nguoi gui tin nhan de gui ve client

        if(connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`); // gui tin nhan den nguoi nhan
        } // neu nguoi nhan dang ket noi thi moi gui tin nhan
    }
    catch(error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

export const getChatMessages = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { to_user_id } = req.body;

        // lay ra tat ca tin nhan giua minh va nguoi nhan
        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id }, 
                { from_user_id: to_user_id, to_user_id: userId }
            ]
        }).sort({ createdAt: -1 }); // sap xep tin nhan theo thoi gian giam dan

        await Message.updateMany({ from_user_id: to_user_id, to_user_id: userId }, { seen: true }); // cap nhat tat ca tin nhan tu nguoi nhan sang minh thanh da xem

        res.json({ success: true, messages });
    } 
    catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

export const getUserRecentMessages = async (req, res) => {
    try {
        const { userId } = req.auth();
        const messages = await Message.find({ to_user_id: userId }).populate('from_user_id to_user_id').sort({ createdAt: -1 }); // lay tat ca tin nhan gui den minh va sap xep theo thoi gian giam dan

        res.json({ success: true, messages });
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}