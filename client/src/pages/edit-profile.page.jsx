import { useContext, useLayoutEffect, useState, useRef } from "react";
import { uploadImage } from "../common/aws";
import InputBox from "../components/input.component";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import { UserContext } from "../App";
import { storeInSession } from "../common/session";
import toast, { Toaster } from "react-hot-toast";
import { profileDataStructure } from "./profile.page";
import Loader from "../components/loader.component";

const EditProfile = () => {
  let {
    userAuth,
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  let bioLimit = 200;
  const [charactersLeft, updateCharacters] = useState(bioLimit);
  const [uploadedImg, setUploadedImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(profileDataStructure);

  let profileImgEle = useRef();
  let editProfileForm = useRef();

  let {
    personal_info: {
      fullname,
      username: profile_username,
      email,
      profile_img,
      bio,
    },
    social_links,
  } = profile;

  useLayoutEffect(() => {
    if (access_token) {
      axios
        .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", {
          username: userAuth.username,
        })
        .then(({ data }) => {
          setProfile(data);
          setLoading(false);
        })
        .catch(({ response }) => {
          return toast.error(response.data.error);
        });
    }
  }, [access_token]);

  const handleCharacterChange = (e) => {
    updateCharacters(bioLimit - e.target.value.length);
  };

  const handleImagePreview = (e) => {
    let img = e.target.files[0];

    profileImgEle.current.src = URL.createObjectURL(img);

    setUploadedImg(img);
  };

  const handleImageUpload = (e) => {
    e.preventDefault();

    if (uploadedImg) {
      let loadingToast = toast.loading("Carregando...");
      e.target.setAttribute("disabled", true);

      uploadImage(uploadedImg).then((url) => {
        if (url) {
          axios
            .post(
              import.meta.env.VITE_SERVER_DOMAIN + "/update-profile-img",
              { url },
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
              }
            )
            .then(({ data }) => {
              let newUserAuth = { ...userAuth, profile_img: data.profile_img };

              storeInSession("user", JSON.stringify(newUserAuth));
              setUserAuth(newUserAuth);

              setUploadedImg(null);

              toast.dismiss(loadingToast);
              e.target.removeAttribute("disabled");
              toast.success("Imagem Carregada 👍");
            })
            .catch(({ response }) => {
              toast.dismiss(loadingToast);
              e.target.removeAttribute("disabled");
              toast.error(response.data.error);
            });
        }
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let form = new FormData(editProfileForm.current);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }

    let {
      username,
      bio,
      youtube,
      instagram,
      facebook,
      twitter,
      reddit,
      website,
    } = formData;

    if (username.length < 3) {
      return toast.error(
        "Insira um nome de usuário válido, nome de usuário precisam ter mais de 3 caracteres"
      );
    }
    if (bio.length > bioLimit) {
      return toast.error(`A bio não pode ter mais de  ${bioLimit} caracteres`);
    }

    let loadingToast = toast.loading("Carregando...");
    e.target.setAttribute("disabled", true);

    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/update-profile",
        {
          username,
          bio,
          social_links: {
            youtube,
            instagram,
            facebook,
            twitter,
            reddit,
            website,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(({ data }) => {
        if (userAuth.username != data.username) {
          let newUserAuth = { ...userAuth, username: data.username };
          storeInSession("user", JSON.stringify(newUserAuth));
          setUserAuth(newUserAuth);
        }

        toast.dismiss(loadingToast);
        toast.success("Perfil Atualizado");
        e.target.removeAttribute("disabled");
      })
      .catch(({ response }) => {
        toast.dismiss(loadingToast);
        e.target.removeAttribute("disabled");
        toast.error(response.data.error);
      });
  };

  return (
    <AnimationWrapper>
      {loading ? (
        <Loader />
      ) : (
        <form ref={editProfileForm} className="">
          <Toaster />
          <h1 className="max-md:hidden font-bold">Editar Perfil</h1>

          <div className="flex flex-col lg:flex-row items-start py-10 gap-8 lg:gap-10">
            <div className="max-lg:center mb-5">
              <label
                htmlFor="UploadImage"
                id="profileImgLable"
                className="relative block w-48 h-48 bg-grey rounded-full overflow-hidden"
              >
                <div className="w-full h-full absolute  top-0 left-0 flex items-center justify-center text-white bg-black/80 opacity-0 hover:opacity-100 cursor-pointer">
                  Subir Imagem
                </div>
                <img ref={profileImgEle} src={profile_img} />
              </label>
              <input
                type="file"
                id="UploadImage"
                accept=".jpeg, .png, .jpg"
                hidden
                onChange={handleImagePreview}
              />
              <button
                className="btn-light mt-5 max-lg:center lg:w-full px-10"
                onClick={handleImageUpload}
              >
                Subir Imagem
              </button>
            </div>

            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-5">
                <div>
                  <InputBox
                    name="fullname"
                    type="text"
                    value={fullname}
                    placeholder="Nome Completo"
                    icon="fi-sr-user"
                    disable={true}
                  />
                </div>
                <div>
                  <InputBox
                    name="email"
                    type="text"
                    value={email}
                    placeholder="Email"
                    icon="fi-sr-envelope"
                    disable={true}
                  />
                </div>
              </div>

              <InputBox
                name="username"
                type="text"
                value={profile_username}
                placeholder="Nome de usuário"
                icon="fi-sr-at"
              />
              <p className="text-dark-grey -mt-3">
                O Nome de usuário será usado para pesquisar usuários e estará
                visível para todos os usuários.
              </p>

              <textarea
                name="bio"
                maxLength={bioLimit}
                defaultValue={bio}
                className="input-box h-64 lg:h-40 resize-none leading-7 mt-5 pl-5"
                onChange={handleCharacterChange}
                placeholder="Bio"
              ></textarea>
              <p className="mt-1 text-dark-grey">{charactersLeft} caracteres</p>

              <p className="my-6 text-dark-grey">Adicione suas redes sociais</p>

              <div className="md:grid md:grid-cols-2 gap-x-6">
                {Object.keys(social_links).map((key, i) => {
                  let link = social_links[key];

                  return (
                    <InputBox
                      key={i}
                      name={key}
                      type="text"
                      value={link}
                      placeholder="https://"
                      icon={
                        "fi " +
                        (key != "website"
                          ? "fi-brands-" + key
                          : "fi-br-link-alt")
                      }
                    />
                  );
                })}
              </div>

              <button
                className="btn-dark w-auto px-10"
                type="submit"
                onClick={handleSubmit}
              >
                Atualizar
              </button>
            </div>
          </div>
        </form>
      )}
    </AnimationWrapper>
  );
};

export default EditProfile;
