/* eslint-disable react/prop-types */
import { getDay } from "../common/date";
import { Link } from "react-router-dom";

const BlogPostCard = ({ content, author }) => {
  let {
    publishedAt,
    tags,
    title,
    des,
    banner,
    activity: { total_likes },
    blog_id: id,
  } = content;
  let { profile_img, profile_username, fullname } = author;

  return (
    <Link
      to={`/blog/${id}`}
      className="flex gap-8 items-center border-b border-dark-grey border-opacity-20 pb-5 mb-4"
    >
      <div className="w-full">
        <div className="flex gap-2 items-center mb-7">
          <img src={profile_img} className="w-6 h-6 rounded-full" />
          <p className="line-clamp-1">
            {fullname} @{profile_username}
          </p>
          <p className=" min-w-fit">{getDay(publishedAt)}</p>
        </div>

        <h1 className="blog-title">{title}</h1>

        <p className="my-3 text-xl font-roboto leading-7 max-sm:hidden md:max-[1100px]:hidden line-clamp-2">
          {des}
        </p>

        <div className="mt-7 flex gap-4">
          <span className="tag  py-1 px-4">{tags[0]}</span>
          <span className="ml-3 flex items-center gap-2 text-dark-grey">
            <i className="fi fi-rr-heart text-xl"></i>
            {total_likes}
          </span>
        </div>
      </div>
      <div className="aspect-square h-28 bg-dark-grey">
        <img
          src={banner}
          className="w-full h-full aspect-square object-cover rounded-md"
        />
      </div>
    </Link>
  );
};

export default BlogPostCard;
