import { useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../App";
import { removeFromSession } from "../common/session";
import AnimationWrapper from "../common/page-animation";

const UserNavigationLinks = () => {
  let {
    userAuth: { username },
    setUserAuth,
  } = useContext(UserContext);

  const signOutUser = () => {
    removeFromSession("user");
    setUserAuth({ access_token: null });
  };

  return (
    <AnimationWrapper
      className="absolute right-0 "
      transition={{ duration: 0.2, y: { duration: 0.1 } }}
    >
      <div className="bg-bg absolute right-0 border border-dark-grey w-60 overflow-hidden duration-200">
        <Link to="/editor" className="flex gap-2 link md:hidden pl-8 py-4">
          <i className="fi fi-rr-file-edit"></i>
          <p>Criar Post</p>
        </Link>

        <Link to={`/user/${username}`} className="link pl-8 py-4">
          Perfil
        </Link>

        <Link to="/dashboard/blogs" className="link pl-8 py-4">
          Dashboard
        </Link>

        <Link to="/settings/edit-profile" className="link pl-8 py-4">
          Opções
        </Link>

        <span className="absolute border-t border-grey -ml-6 w-[200%]"></span>

        <button
          className="text-left p-4 hover:bg-grey  text-white hover:text-bg mb-1 w-full pl-8 py-4"
          onClick={signOutUser}
        >
          <h1 className="font-bold text-xl  mb-1">Sair</h1>
          <p>@{username}</p>
        </button>
      </div>
    </AnimationWrapper>
  );
};

export default UserNavigationLinks;
