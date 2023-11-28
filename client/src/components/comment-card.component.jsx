/* eslint-disable react/prop-types */
import { UserContext } from "../App";
import { useContext, useEffect, useState } from "react";
import { getDay } from "../common/date";
import { BlogPageContext } from "../pages/blog.page";
import CommentField from "./comment-field.component";
import axios from "axios";
import { toast } from "react-hot-toast";

const CommentCard = ({ index, commentData, leftVal = 0 }) => {
  let {
    comment,
    commented_by: {
      personal_info: { fullname, username: profile_username, profile_img },
    },
    commentedAt,
    children,
    _id,
  } = commentData;

  let {
    blog,
    blog: {
      comments,
      comments: { results: commentsArr },
      activity,
      activity: { total_parent_comentarios },
      author: {
        personal_info: { username: blog_author },
      },
    },
    setBlog,
    setTotalParentCommentsLoaded,
  } = useContext(BlogPageContext);
  let {
    userAuth: { username, access_token },
  } = useContext(UserContext);

  const [isReplying, setReplying] = useState(false);

  useEffect(() => {
    // resetar state
    setReplying(false);
  }, [commentData]);

  const loadReplies = ({ currentIndex = index, skip = 0 }) => {
    if (commentsArr[currentIndex].children.length) {
      hideReplies();

      axios
        .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-replies", {
          _id: commentsArr[currentIndex]._id,
          skip,
        })
        .then(({ data: { replies } }) => {
          commentsArr[currentIndex].isRepliesLoaded = true;

          for (let i = 0; i < replies.length; i++) {
            replies[i].childrenLevel = commentsArr[currentIndex].childrenLevel
              ? commentsArr[currentIndex].childrenLevel + 1
              : 1;

            commentsArr.splice(currentIndex + i + 1 + skip, 0, replies[i]);
          }
          setBlog({ ...blog, comments: { ...comments, results: commentsArr } });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };

  const getParentIndex = () => {
    let startingIndex = index - 1;

    try {
      while (
        commentsArr[startingIndex].childrenLevel >=
        commentsArr[index].childrenLevel
      ) {
        startingIndex--;
      }
    } catch {
      startingIndex = undefined;
    }

    return startingIndex;
  };

  const handleReplyClick = () => {
    if (!access_token) {
      return toast.error("Faça login para deixar um comentário");
    }

    setReplying((preVal) => !preVal);
  };

  const removeCommentCards = async (startingIndex, isDelete = false) => {
    if (commentsArr[startingIndex]) {
      while (
        commentsArr[startingIndex].childrenLevel >
        commentsArr[index].childrenLevel
      ) {
        commentsArr.splice(startingIndex, 1);

        if (!commentsArr[startingIndex]) {
          break;
        }
      }
    }

    if (isDelete) {
      let parentIndex = getParentIndex();

      if (parentIndex != undefined) {
        commentsArr[parentIndex].children = commentsArr[
          parentIndex
        ].children.filter((child) => child != _id);
        if (!commentsArr[parentIndex].children.length) {
          commentsArr[parentIndex].isRepliesLoaded = false;
        }
      }

      commentsArr.splice(index, 1);
    }

    if (commentData.childrenLevel == 0 && isDelete) {
      setTotalParentCommentsLoaded((preVal) => preVal - 1);
    }

    setBlog({
      ...blog,
      comments: { results: commentsArr },
      activity: {
        ...activity,
        total_parent_comentarios:
          total_parent_comentarios -
          (commentData.childrenLevel == 0 && isDelete ? 1 : 0),
      },
    });
  };

  const hideReplies = () => {
    commentsArr[index].isRepliesLoaded = false;

    removeCommentCards(index + 1);
  };

  const deleteComment = (e) => {
    e.target.setAttribute("disabled", true);

    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/delete-comment",
        { _id },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(() => {
        e.target.removeAttribute("disabled");
        removeCommentCards(index + 1, true);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const LoadMoreRepliesButton = () => {
    let parentIndex = getParentIndex();

    if (commentsArr[index + 1]) {
      if (
        commentsArr[index + 1].childrenLevel < commentsArr[index].childrenLevel
      ) {
        if (index - parentIndex < commentsArr[parentIndex].children.length) {
          return (
            <button
              onClick={() =>
                loadReplies({
                  currentIndex: parentIndex,
                  skip: index - parentIndex,
                })
              }
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
            >
              {" "}
              Carregar mais{" "}
            </button>
          );
        }
      }
    }

    return "";
  };

  return (
    <div className="w-full" style={{ paddingLeft: `${leftVal * 10}px` }}>
      <div className="my-5 p-6 rounded-md border border-grey">
        <div className="flex gap-3 items-center mb-8">
          <img src={profile_img} className="w-6 h-6 rounded-full" />
          <p className="line-clamp-1">
            {fullname} @{profile_username}
          </p>
          <p className=" min-w-fit">{getDay(commentedAt)}</p>
        </div>
        <p className="font-popins text-xl ml-3">{comment}</p>

        <div className="flex gap-5 items-center mt-5">
          {!commentsArr[index].isRepliesLoaded ? (
            <button
              onClick={loadReplies}
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
            >
              <i className="fi fi-rr-comment mt-1"></i> {children.length}{" "}
              Respostas{" "}
            </button>
          ) : (
            <button
              onClick={hideReplies}
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
            >
              <i className="fi fi-rr-comment mt-1"></i> Ocultar Respostas{" "}
            </button>
          )}

          <button className="underline" onClick={handleReplyClick}>
            Responder
          </button>

          {username == profile_username || username == blog_author ? (
            <button
              className="p-2 px-3 rounded-md border border-grey ml-auto hover:bg-red/30 hover:text-red flex items-center"
              onClick={deleteComment}
            >
              <i className="fi fi-rr-trash pointer-events-none"></i>
            </button>
          ) : (
            ""
          )}
        </div>

        {isReplying ? (
          <div className="mt-8">
            <CommentField
              action="Resposta"
              index={index}
              replyingTo={_id}
              setReplying={setReplying}
            />
          </div>
        ) : (
          ""
        )}
      </div>

      <LoadMoreRepliesButton />
    </div>
  );
};

export default CommentCard;
