import fs from "fs";
import Post from "../models/Post.js";
import imagekit from "../configs/imageKit.js";
import User from "../models/User.js";

export const addPost = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, post_type } = req.body; // lay content va post_type tu body
    const images = req.files; // lay mang cac file duoc upload
    let image_urls = []; // mang chua url cua cac anh sau khi upload len imagekit

    if (images.length) {
      image_urls = await Promise.all(
        images.map(async (image) => {
          const fileBuffer = fs.readFileSync(image.path);
          const response = await imagekit.upload({
            file: fileBuffer, // dung de upload file
            fileName: image.originalname, // ten file
            folder: "posts", // thu muc de luu file tren imagekit
          }); // neu upload thanh cong se tra ve mot object chua thong tin ve file vua upload

          const url = imagekit.url({
            path: response.filePath,
            transformation: [
              {
                quality: "auto",
                format: "webp",
                width: "1280",
              },
            ],
          }); // tao url voi kich thuoc va dinh dang mong muon
          return url; // tra ve url cua anh vua upload
        })
      );
    }

    await Post.create({
      user: userId,
      content,
      image_urls,
      post_type
    });
    res.json({success:true, message: "Tạo bài viết thành công" });
  } 
  catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const getFeedPosts = async (req, res) => {
    try {
        const { userId } = req.auth();
        const user = await User.findById(userId); // tim nguoi dung theo userId

        const userIds = [userId, ...user.connections, ...user.following]; // mang chua id cua nguoi dung, nguoi dung ket ban va nguoi dung dang theo doi


        const posts = await Post.find({user: { $in: userIds }})
        .populate('user') // populate de lay thong tin nguoi dung cho moi bai viet
        .sort({createdAt: -1}); // sap xep theo thoi gian tao bai viet, moi nhat o tren cung
    
        res.json({ success: true, posts});
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export const likePosts = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { postId } = req.body;

        const post = await Post.findById(postId); // tim bai viet theo postId

        if(post.likes_count.includes(userId)) {
            // neu da like thi bo like
            post.likes_count = post.likes_count.filter(user => user !== userId); // loc bo userId khoi mang likes_count
            await post.save(); // luu lai thay doi
            res.json({ success: true, message: "Đã bỏ thích bài viết" });
        }
        else {
            // neu chua like thi like
            post.likes_count.push(userId); // them userId vao mang likes_count
            await post.save(); // luu lai thay doi
            res.json({ success: true, message: "Đã thích bài viết" });
        }

    } 
    catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}