import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import "dotenv/config";
import { nanoid } from "nanoid";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";

// schemas

import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js";
import Notification from "./Schema/Notification.js";
import Comment from "./Schema/Comment.js";

const server = express();
const PORT = process.env.PORT || 4000;
const slatRounds = 10;

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex do email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex da senha

mongoose.connect(process.env.DB_LOCATION, {
  autoIndex: true,
});

// inicializar firebase para fazer login com o google

import serviceAccountKey from "./nerd-abyss-auth-firebase-adminsdk-tbr6i-bf31a81195.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

server.use(express.json());
server.use(cors());

// Acesso s3 bucket

const s3 = new aws.S3({
  region: process.env.BUCKET_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Funções
// Gerar link para fazer o upload da imagem
const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "nerd-a-bucket",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).json({ error: "Sem token de acesso" });
  }

  jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token de acesso inválido" });
    }

    req.user = user.id;
    next();
  });
};

const formatLoginDataTojson = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );

  return {
    access_token: access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];
  let isUsernameUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => {
    return result;
  });

  isUsernameUnique ? (username += nanoid()) : "";

  return username;
};

const deleteComments = (_id) => {
  Comment.findOneAndDelete({ _id })
    .then((comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        )
          .then((data) => console.log("Comentário excluído do comentário pai"))
          .catch((err) => console.log(err));
      }

      Notification.findOneAndDelete({ comment: _id }).then((notification) =>
        console.log("Notificaçao de comentário apagada")
      );
      Notification.findOneAndUpdate(
        { reply: _id },
        { $unset: { reply: 1 } }
      ).then((notification) => console.log("Notificação de resposta apagada"));
      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: {
            "activity.total_comentarios": -1,
            "activity.total_parent_comentarios": comment.parent ? 0 : -1,
          },
        }
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((child) => {
            deleteComments(child);
          });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
    });
};

// ROTAS

server.get("/get-upload-url", (req, res) => {
  generateUploadURL()
    .then((url) => res.status(200).json({ uploadURL: url }))
    .catch((err) => {
      console.log(err.message);
      return res.status(200).json({ error: err.message });
    });
});

server.post("/signup", (req, res) => {
  let { fullname, email, password } = req.body;

  // validando dados

  if (fullname.length < 3) {
    return res
      .status(403)
      .json({ error: "O Nome deve ter mais de 3 caracteres" });
  }
  if (!email.length) {
    return res.status(403).json({ error: "Insira seu e-mail" });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: "O e-mail es inválido" });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "A senha deve ter entre 6 a 20 caracteres, contendo 1 número, 1 letra minúscula e 1 letra maiúscula",
    });
  }

  // criptografando a senha antes de armazenála no banco de dados
  bcrypt.hash(password, slatRounds, async (err, hashed_password) => {
    let username = await generateUsername(email);

    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username },
    });

    user
      .save()
      .then((u) => {
        return res.status(200).json(formatLoginDataTojson(u));
      })
      .catch((err) => {
        if (err.code == 11000) {
          // email duplicado
          return res.status(409).json({ error: "Este e-mail já existe" });
        }

        res.status(500).json({ error: err.message });
      });
  });
});

server.post("/signin", (req, res) => {
  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ error: "Ocorreu um erro ao fazer login, tente de novo" });
          }

          if (!result) {
            res.status(403).json({ error: "Senha incorreta" });
          } else {
            return res.status(200).json(formatLoginDataTojson(user));
          }
        });
      } else {
        res
          .status(403)
          .json({
            error: "Esta conta foi criada com google. tente entrar com google",
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(403).json({ error: "Email não encontrado" });
    });
});

server.post("/google-auth", async (req, res) => {
  let { accessToken } = req.body;

  getAuth()
    .verifyIdToken(accessToken)
    .then(async (decodedToken) => {
      let { email, name, picture } = decodedToken;

      picture = picture.replace("s96-c", "s384-c");

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.fullname personal_info.username personal_info.profile_img google_auth"
        )
        .then((u) => {
          return u || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });

      if (user) {
        // login
        if (!user.google_auth) {
          return res
            .status(403)
            .json({
              error:
                "Este e-mail foi cadastrado sem utilizar o google. Tente logar com sua senha",
            });
        }
      } else {
        // registro

        let username = await generateUsername(email);

        user = new User({
          personal_info: {
            fullname: name,
            email,
            username,
            profile_img: picture,
          },
          google_auth: true,
        });

        await user
          .save()
          .then((u) => {
            console.log(u);
            user = u;
          })
          .catch((err) => {
            return res.status(500).json({ error: err.message });
          });
      }

      return res.status(200).json(formatLoginDataTojson(user));
    })
    .catch((err) => {
      console.log(err.message);
      return res
        .status(500)
        .json({
          error:
            "Ocorreu um erro ao realizar a autenticação com o google. TTente logar com outra conta",
        });
    });
});

server.post("/update-profile-img", verifyJWT, (req, res) => {
  let { url } = req.body;

  //subindo foto de perfil
  User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url })
    .then(() => {
      return res.status(200).json({ profile_img: url });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/update-profile", verifyJWT, (req, res) => {
  let { username, bio, social_links } = req.body;

  // validando dados
  if (username.length < 3) {
    return res
      .status(403)
      .json({ error: "Seu usuário deve ter no mínimo 3 caracteres" });
  }
  if (bio.length > 200) {
    return res
      .status(403)
      .json({ error: "A bio deve ter um máximo de  200 caracteres" });
  }

  // validando link redes sociais
  let socialLinksArr = Object.keys(social_links);
  try {
    for (let i = 0; i < socialLinksArr.length; i++) {
      if (social_links[socialLinksArr[i]].length) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

        if (
          !hostname.includes(`${socialLinksArr[i]}.com`) &&
          socialLinksArr[i] != "website"
        ) {
          return res
            .status(403)
            .json({
              error: `${socialLinksArr[i]} O link é invalido. Digite um link válido`,
            });
        }
      }
    }
  } catch (err) {
    return res
      .status(403)
      .json({ error: "Você deve inser o link completo incluíndo http(s)" });
  }

  let UpdateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links,
  };

  User.findOneAndUpdate({ _id: req.user }, UpdateObj, {
    runValidators: true,
  })
    .then(() => {
      return res.status(200).json({ username });
    })
    .catch((err) => {
      if (err.code == 11000) {
        // usuário duplicado
        return res.status(409).json({ error: "Nome de usuário já existe" });
      }
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-profile", (req, res) => {
  let { username } = req.body;

  User.findOne({ "personal_info.username": username })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((user) => {
      return res.status(200).json(user);
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/change-password", verifyJWT, (req, res) => {
  let { currentPassword, newPassword } = req.body;

  // validate data
  if (
    !passwordRegex.test(currentPassword) ||
    !passwordRegex.test(newPassword)
  ) {
    return res.status(403).json({
      error:
        "A senha deve ter entre 6 a 20 caracteres, contendo 1 número, 1 letra minúscula e 1 letra maiúscula",
    });
  }

  User.findOne({ _id: req.user })
    .then((user) => {
      if (user.google_auth) {
        return res
          .status(500)
          .json({
            error:
              "Você não pode atualizar sua senha porque você esta logado com uma conta google",
          });
      }

      bcrypt.compare(
        currentPassword,
        user.personal_info.password,
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({
                error: "Ocorreu um erro ao atualizar sua senha, tente de novo",
              });
          }

          if (!result) {
            return res.status(403).json({ error: "Senha atual incorreta" });
          }

          bcrypt.hash(newPassword, slatRounds, (err, hashed_password) => {
            User.findOneAndUpdate(
              { _id: req.user },
              { "personal_info.password": hashed_password }
            )
              .then((u) => {
                return res.status(200).json({ status: "password changed" });
              })
              .catch((err) => {
                return res
                  .status(500)
                  .json({ error: "Ocorreu um erro ao salvar sua nova senha" });
              });
          });
        }
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(403).json({ error: "Usuário não encontrado" });
    });
});

server.post("/create-blog", verifyJWT, (req, res) => {
  let authorId = req.user;

  let { title, des, banner, content, tags, id, draft } = req.body;

  if (!draft) {
    if (!title.length) {
      return res
        .status(403)
        .json({ error: "Você deve inserir um título para publicar o post" });
    } else if (!des.length || des.length > 200) {
      return res
        .status(403)
        .json({
          error: "Você deve inserir uma descrição de no máximo 200 caracteres",
        });
    } else if (!banner.length) {
      return res
        .status(403)
        .json({ error: "Você precisa subir uma foto para publicar o post" });
    } else if (!content.blocks.length) {
      return res
        .status(403)
        .json({
          error:
            "Você precisa inserir conteúdo no seu post para poder publica-lo",
        });
    } else if (!tags.length) {
      return res
        .status(403)
        .json({ error: "Você deve inserir ao menos 1 categoría" });
    }
  }

  // categoria/tag minuscula
  tags = tags.map((tag) => tag.toLowerCase());

  let blog_id =
    id ||
    title
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();

  if (id) {
    // Atualizando um post existente

    Blog.findOneAndUpdate(
      { blog_id },
      { title, des, banner, content, tags, draft: draft ? draft : false }
    )
      .then((blog) => {
        return res.status(200).json({ id: blog.blog_id });
      })
      .catch((err) => {
        return res
          .status(500)
          .json({
            error: "Ocorreu um erro ao atualizar o número total de posts ",
          });
      });
  } else {
    // criando novo post

    let blogs = new Blog({
      title,
      des,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });

    blogs
      .save()
      .then((blog) => {
        let increamentVal = draft ? 0 : 1;
        //atualizando o número de posts de um usuário
        User.findOneAndUpdate(
          { _id: authorId },
          {
            $inc: { "account_info.total_posts": increamentVal },
            $push: { blogs: blog.id },
          }
        )
          .then((user) => {
            return res.status(200).json({ id: blog.blog_id });
          })
          .catch((err) => {
            return res.status(500).json({
              error: "Ocorreu um erro ao atualizar o número total de posts",
            });
          });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  }
});

server.post("/search-blogs", (req, res) => {
  let { query, tag, page, author, limit, eliminate_blog } = req.body;

  let findQuery;

  if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  let maxLimit = limit ? limit : 3;

  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .select("blog_id title des banner activity tags publishedAt -_id")
    .sort({ publishedAt: -1 })
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/search-blogs-count", (req, res) => {
  let { query, tag, author } = req.body;

  let findQuery;

  if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (author) {
    findQuery = { author, draft: false };
  }

  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/search-users", (req, res) => {
  let { query } = req.body;

  User.find({ "personal_info.username": new RegExp(query, "i") })
    .sort({ publishedAt: -1 })
    .limit(50)
    .select(
      "personal_info.fullname personal_info.username personal_info.profile_img -_id "
    )
    .then((users) => {
      return res.status(200).json({ users });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.get("/trending-blogs", (req, res) => {
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.fullname personal_info.username -_id"
    )
    .sort({
      "activity.total_views": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/latest-blogs", (req, res) => {
  let { page } = req.body;

  let maxLimit = 6;

  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.username personal_info.fullname -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/all-latest-blogs-count", (req, res) => {
  Blog.countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-blog", (req, res) => {
  let { blog_id, draft, mode } = req.body;

  let increamentVal = mode != "edit" ? 1 : 0;

  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_views": increamentVal } }
  )
    .populate(
      "author",
      "personal_info.username personal_info.profile_img personal_info.fullname"
    )
    .select("title des content banner activity publishedAt blog_id tags draft")
    .then((blog) => {
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        {
          $inc: { "account_info.total_views": increamentVal },
        }
      ).catch((err) => {
        return res.status(500).json({ error: err.message });
      });

      if (blog.draft && !draft) {
        return res
          .status(500)
          .json({ error: "Você não pode acessar os rascunhos" });
      }

      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/like-blog", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id, likedByUser } = req.body;

  let increamentVal = !likedByUser ? 1 : -1;

  Blog.findOneAndUpdate(
    { _id },
    { $inc: { "activity.total_likes": increamentVal } }
  )
    .then((blog) => {
      User.findByIdAndUpdate(
        { _id: blog.author },
        { $inc: { "account_info.total_likes": increamentVal } }
      ).then((data) => {});

      if (!likedByUser) {
        let like = new Notification({
          type: "Likes",
          blog: blog._id,
          notification_for: blog.author,
          user: user_id,
        });

        like.save().then((notification) => {
          return res.json({ liked_by_user: true });
        });
      } else {
        Notification.findOneAndDelete({
          user: user_id,
          blog: _id,
          type: "Likes",
        }).then((data) => {
          return res.json({ liked_by_user: false });
        });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/isliked-by-user", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { blog_id } = req.body;

  Notification.exists({ user: user_id, type: "Likes", blog: blog_id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/add-comment", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id, comment, replying_to, blog_author, notification_id } = req.body;

  if (!comment.length) {
    return res
      .status(403)
      .json({ error: "Escreva algo para deixar um comentário..." });
  }

  // criando o objeto de comentário

  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
    isReply: Boolean(replying_to),
  };

  if (replying_to) {
    commentObj.parent = replying_to;
  }

  new Comment(commentObj)
    .save()
    .then(async (commentFile) => {
      let { comment, commentedAt, children } = commentFile;

      Blog.findOneAndUpdate(
        { _id },
        {
          $push: { comments: commentFile._id },
          $inc: {
            "activity.total_comentarios": 1,
            "activity.total_parent_comentarios": replying_to ? 0 : 1,
          },
        }
      ).then((blog) => {
        console.log("Novo comentário criado");
      });

      let notificationObj = {
        type: replying_to ? "Respostas" : "Comentários",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
      };

      if (replying_to) {
        notificationObj.replied_on_comment = replying_to;

        await Comment.findOneAndUpdate(
          { _id: replying_to },
          { $push: { children: commentFile._id } }
        ).then((reply) => {
          notificationObj.notification_for = reply.commented_by;
        });

        if (notification_id) {
          Notification.findOneAndUpdate(
            { _id: notification_id },
            { reply: commentFile._id }
          ).then((notification) => console.log("Notificaçã atualizada"));
        }
      }

      new Notification(notificationObj)
        .save()
        .then((notification) => console.log("Nova notificação criada"));

      return res.status(200).json({
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children,
      });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-blog-comments", (req, res) => {
  let { blog_id, skip } = req.body;
  let maxLimit = 5;

  Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img"
    )
    .skip(skip)
    .limit(maxLimit)
    .sort({
      commentedAt: -1,
    })
    .then((comment) => {
      return res.status(200).json(comment);
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-blog-comments-count", (req, res) => {
  let { blog_id } = req.body;

  Comment.countDocuments({ blog_id, isReply: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/get-replies", (req, res) => {
  let { _id, skip } = req.body;

  let maxLimit = 5;

  Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        select:
          "personal_info.username personal_info.profile_img personal_info.fullname",
      },
      select: "-blog_id -updatedAt",
    })
    .select("children")
    .then((replies) => {
      return res.status(200).json({ replies: replies.children });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/delete-comment", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { _id } = req.body;

  Comment.findOne({ _id })
    .then((comment) => {
      if (user_id == comment.commented_by || user_id == comment.blog_author) {
        deleteComments(_id);

        return res.status(200).json({ status: "Feito" });
      } else {
        return res
          .status(200)
          .json({ error: "você não pode apagar este comentário" });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.get("/account-info", verifyJWT, (req, res) => {
  let user_id = req.user;

  User.findOne({ _id: user_id })
    .select("account_info")
    .then((user) => {
      return res.status(200).json({ acc_info: user.account_info });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/user-written-blogs", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { page, draft, query, deletedDocCount } = req.body;

  let maxLimit = 2;
  let skipDocs = (page - 1) * maxLimit;

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Blog.find({ author: user_id, draft, title: new RegExp(query, "i") })
    .skip(skipDocs)
    .limit(maxLimit)
    .sort({ publishedAt: -1 })
    .select(" title banner publishedAt blog_id activity des draft -_id")
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.post("/user-written-blogs-count", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { draft, query } = req.body;

  Blog.countDocuments({ author: user_id, draft, title: new RegExp(query, "i") })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/delete-blog", verifyJWT, (req, res) => {
  let user_id = req.user;
  let { blog_id } = req.body;

  Blog.findOneAndDelete({ blog_id })
    .then((blog) => {
      Notification.deleteMany({ blog: blog._id }).then((data) =>
        console.log("Notificações apagadas")
      );
      Comment.deleteMany({ blog_id: blog._id }).then((data) =>
        console.log("Comentários apagados")
      );

      User.findOneAndUpdate(
        { _id: user_id },
        { $pull: { blogs: blog._id }, $inc: { "account_info.total_posts": -1 } }
      ).then((user) => console.log("Post Apagado"));

      return res.status(200).json({ status: "Feito" });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.get("/new-notifications", verifyJWT, (req, res) => {
  let user_id = req.user;

  Notification.exists({
    notification_for: user_id,
    seen: false,
    user: { $ne: user_id },
  })
    .then((result) => {
      if (result) {
        return res.status(200).json({ new_notifications_available: true });
      } else {
        return res.status(200).json({ new_notifications_available: false });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/notifications", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { page, filter, deletedDocCount } = req.body;

  let maxLimit = 10;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  let skipDocs = (page - 1) * maxLimit;

  if (filter != "Tudo") {
    findQuery.type = filter;
  }

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  Notification.find(findQuery)
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id")
    .populate(
      "user",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .populate("comment", "comment")
    .populate("reply", "comment")
    .populate("replied_on_comment", "comment")
    .sort({ createdAt: -1 })
    .select("createdAt type seen reply")
    .then((notifications) => {
      Notification.updateMany(findQuery, { seen: true })
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(() => console.log("Notificação vista"));

      return res.status(200).json({ notifications });
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post("/all-notification-count", verifyJWT, (req, res) => {
  let user_id = req.user;

  let { filter } = req.body;

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  if (filter != "Tudo") {
    findQuery.type = filter;
  }

  Notification.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
});

server.listen(PORT, () => {
  console.log("Servidor roando na porta -> " + PORT);
});
