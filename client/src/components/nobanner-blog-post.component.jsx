/* eslint-disable react/prop-types */
import { Link } from "react-router-dom";
import { getDay } from "../common/date";

const MinimalBlogPost = ({ blog, index }) => {
  let {
    title,
    blog_id,
    author: {
      personal_info: { fullname, username: profile_username, profile_img },
    },
    publishedAt,
  } = blog;

  index++;

  return (
    <Link to={`/blog/${blog_id}`} className="flex gap-4 mb-6">
      <h1 className="blog-index">{index < 10 ? "0" + index : index}</h1>
      <div>
        <div className="flex gap-2 items-center mb-2">
          <img src={profile_img} className="w-6 h-6 rounded-full" />
          <p className="line-clamp-1">
            {fullname} @{profile_username}
          </p>
          <p className=" min-w-fit">{getDay(publishedAt)}</p>
        </div>

        <h1 className="blog-title">{title}</h1>
      </div>
    </Link>
  );
};

export default MinimalBlogPost;
