/* eslint-disable react/prop-types */
import { useContext, useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { BlogPageContext } from "../pages/blog.page";

const CommentField = ({
  index = undefined,
  replyingTo = undefined,
  setReplying,
}) => {
  let {
    blog,
    blog: {
      _id,
      comments,
      comments: { results: commentsArr },
      activity,
      author: { _id: blog_author },
      activity: { total_comentarios, total_parent_comentarios },
    },
    setBlog,
    setTotalParentCommentsLoaded,
  } = useContext(BlogPageContext);

  let {
    userAuth: { access_token, username, profile_img, fullname },
  } = useContext(UserContext);
  const [comment, setComment] = useState("");

  const handleComment = () => {
    if (!access_token) {
      return toast.error("Faça login para deixar um comentário");
    }

    if (!comment.length) {
      return toast.error("Escreva algo para deixar um comentário...");
    }

    // Enviando comentário

    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",
        { _id, blog_author, comment, replying_to: replyingTo },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(({ data }) => {
        setComment("");

        data.commented_by = {
          personal_info: { username, profile_img, fullname },
          _id: data.user_id,
        };

        setReplying ? setReplying(false) : "";

        let newCommentArr;

        if (replyingTo) {
          commentsArr[index].children.push(data._id);

          data.childrenLevel = commentsArr[index].childrenLevel + 1;
          data.parentIndex = index;

          commentsArr[index].isRepliesLoaded = true;

          commentsArr.splice(index + 1, 0, data);

          newCommentArr = commentsArr;
        } else {
          data.childrenLevel = 0;

          newCommentArr = [data, ...commentsArr];
        }

        setBlog({
          ...blog,
          comments: { ...comments, results: newCommentArr },
          activity: {
            ...activity,
            total_comentarios: total_comentarios + 1,
            total_parent_comentarios: total_parent_comentarios + 1,
          },
        });
        setTotalParentCommentsLoaded((preVal) => preVal + 1);
      })
      .catch((data) => {
        try {
          if (data.response.status == 403) {
            return toast.error(data.response.data.error);
          }
        } catch (err) {
          //
        }

        console.log(data);
      });
  };

  return (
    <>
      <Toaster />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Deixe um comentário..."
        className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"
      ></textarea>
      <button className="btn-dark mt-5 px-10" onClick={handleComment}>
        Comentar
      </button>
    </>
  );
};

export default CommentField;
