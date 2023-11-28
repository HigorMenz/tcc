/* eslint-disable no-undef */
import AnimationWrapper from "../common/page-animation";
import InPageNavigation, {
  activeTabRef,
} from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component";
import adSize from "../imgs/adSize.jpg";
import BlogPostCard from "../components/blog-post.component";
import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../components/loader.component";
import MinimalBlogPost from "../components/nobanner-blog-post.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import LoadMoreDataBtn from "../components/load-more.component";

const HomePage = () => {
  const [blogs, setBlogs] = useState(null);
  const [trendingBlogs, setTrendingBlogs] = useState(null);
  const [pageState, setPageState] = useState("home");

  let categories = [
    "Games",
    "Mangás",
    "Manhwas",
    "Tech",
    "Filmes",
    "Séries",
    "Curiosidades",
    "E-sports",
  ];

  const fetchLatestBlogs = ({ page = 1 }) => {
    // latest blogs
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page })
      .then(async ({ data }) => {
        let formatedData = await filterPaginationData({
          arr: blogs,
          data: data.blogs,
          page,
          countRoute: "/all-latest-blogs-count",
        });

        setBlogs(formatedData);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const fetchBlogsByCategory = ({ page = 1 }) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
        tag: pageState,
        page,
      })
      .then(async ({ data }) => {
        let formatedData = await filterPaginationData({
          arr: blogs,
          data: data.blogs,
          page,
          countRoute: "/search-blogs-count",
          data_to_send: { tag: pageState },
        });

        setBlogs(formatedData);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const fetchTrendingBlogs = () => {
    //trending posts
    axios
      .get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs")
      .then(({ data }) => {
        setTrendingBlogs(data.blogs);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    activeTabRef.current.click();

    if (pageState != "home") {
      fetchBlogsByCategory(pageState);
      return;
    }

    fetchLatestBlogs({ page: 1 });

    if (!trendingBlogs) {
      fetchTrendingBlogs();
    }
  }, [pageState]);

  const TrendingBlogsWrapper = () => {
    return trendingBlogs == null ? (
      <Loader />
    ) : trendingBlogs.length ? (
      trendingBlogs.map((blog, i) => {
        return (
          <AnimationWrapper key={i}>
            <MinimalBlogPost blog={blog} index={i} />
          </AnimationWrapper>
        );
      })
    ) : (
      <NoDataMessage message="Nenhum trending post encontrado" />
    );
  };

  const loadBlogbyCategory = (e) => {
    let category = e.target.innerText.toLowerCase();

    setBlogs(null);

    if (pageState == category) {
      setPageState("home");
      return;
    }

    setPageState(category);
  };

  return (
    <AnimationWrapper>
      <section className="h-cover flex justify-center gap-10">
        <div className="w-full ">
          <InPageNavigation
            routes={[pageState, "Posts em alta"]}
            defaultHidden={["Posts em alta"]}
          >
            <>
              {blogs == null ? (
                <Loader />
              ) : blogs.results.length ? (
                blogs.results.map((blog, i) => {
                  return (
                    <AnimationWrapper key={i} transition={{ delay: i * 0.08 }}>
                      <BlogPostCard
                        content={blog}
                        author={blog.author.personal_info}
                      />
                    </AnimationWrapper>
                  );
                })
              ) : (
                <NoDataMessage message="Sem posts publicados" />
              )}
              <LoadMoreDataBtn
                dataArr={blogs}
                fetchDataFunc={
                  pageState == "home" ? fetchLatestBlogs : fetchBlogsByCategory
                }
              />
            </>

            <TrendingBlogsWrapper />
          </InPageNavigation>
        </div>

        <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-l  border-dark-grey border-opacity-20 pl-8 pt-3 max-md:hidden">
          <div className="flex flex-col gap-10">
            <div>
              <h1 className="font-medium text-xl mb-8">
                Em Alta <i className="fi fi-rr-arrow-trend-up"></i>
              </h1>
              {trendingBlogs == null ? (
                <Loader />
              ) : trendingBlogs.length ? (
                trendingBlogs.map((blog, i) => {
                  return (
                    <AnimationWrapper key={i}>
                      <MinimalBlogPost blog={blog} index={i} />
                    </AnimationWrapper>
                  );
                })
              ) : (
                <NoDataMessage message="Nenhum post em trending encontrado" />
              )}
            </div>

            <div>
              <h1 className="font-medium text-xl mb-8">
                Categorías de notícias:
              </h1>

              <div className="flex gap-3 flex-wrap">
                {categories.map((category, i) => {
                  return (
                    <button
                      key={i}
                      onClick={loadBlogbyCategory}
                      className={
                        "tag " +
                        (pageState == category ? "bg-black text-white" : "")
                      }
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8">
                <h1>Espaço ADs</h1>
                <div className="banner-container sm:bg-gray-300 sm:w-300 sm:h-250">
                  <img src={adSize} alt="" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimationWrapper>
  );
};

export default HomePage;
