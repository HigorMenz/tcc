import InputBox from "../components/input.component";
import google from "../imgs/google.png";
import { Link, Navigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { storeInSession } from "../common/session";
import { useContext } from "react";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";
import AnimationWrapper from "../common/page-animation";
import { useRef } from "react";

const UserAuthForm = ({ type }) => {
  let {
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  const userAuthThroughServer = (formData, serverRoute) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
      .then(({ data }) => {
        storeInSession("user", JSON.stringify(data));

        setUserAuth(data);
      })
      .catch(({ response }) => {
        console.log(response);
        toast.error(response.data.error);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let serverRoute = type == "entrar" ? "/signin" : "/signup";

    //Validações

    let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex do email
    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // email da senha

    let form = new FormData(formElement);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }
    // console.log(formData, authForm.current);
    let { email, password, fullname } = formData;

    // validção da form
    if (fullname) {
      if (fullname.length < 3) {
        return toast.error("O nome completo deve ter mais de 3 caracteres ");
      }
    }

    if (!email.length) {
      return toast.error("Insira seu e-mail");
    }

    if (!emailRegex.test(email)) {
      return toast.error("e-mail inválido");
    }

    if (!passwordRegex.test(password)) {
      return toast.error(
        "A senha deve ter entre 6 a 20 caracteres, contendo 1 número, 1 letra minúscula e 1 letra maiúscula"
      );
    }

    // enviando dados para o servidor

    userAuthThroughServer(formData, serverRoute);
  };

  const handleGoogleAuth = (e) => {
    e.preventDefault();

    authWithGoogle()
      .then((user) => {
        let serverRoute = "/google-auth";

        let formData = {
          accessToken: user.accessToken,
        };

        userAuthThroughServer(formData, serverRoute);
      })
      .catch((err) => {
        toast.error("Ocorreu um erro ao tentar entrar com sua conta google");
        return console.log(
          "Ocorreu um erro ao tentar entrar com sua conta google =>",
          err
        );
      });
  };

  return access_token ? (
    <Navigate to="/" />
  ) : (
    <AnimationWrapper keyValue={type}>
      <section className="h-cover flex items-center justify-center">
        <Toaster />
        <form className="w-[80%] max-w-[400px]" id="formElement">
          <h1 className="text-4xl font-roboto  text-center mb-24">
            {type == "entrar" ? "Bem vindo de volta" : "Registre-se hoje"}
          </h1>

          {type != "entrar" ? (
            <InputBox
              name="fullname"
              type="text"
              placeholder="Insira seu nome completo"
              icon="fi fi-sr-user"
            />
          ) : (
            ""
          )}

          <InputBox
            name="email"
            type="email"
            placeholder="Insira seu e-mail"
            icon="fi fi-sr-envelope"
          />

          <InputBox
            name="password"
            type="password"
            placeholder="Insira uma senha"
            icon="fi fi-sr-key"
          />

          <button
            className="btn-dark center mt-14"
            type="submit"
            onClick={handleSubmit}
          >
            {type.replace("_", " ")}
          </button>

          <div className="relative w-full flex items-center gap-2 opacity-40 my-10 text-black font-blod">
            <hr className="w-1/2 border-black" />
            <p >ou</p>
            <hr className="w-1/2 border-black" />
          </div>

          <button
            className="btn-dark flex items-center justify-center gap-4 w-[90%] center"
            onClick={handleGoogleAuth}
          >
            <img src={google} className="w-5" />
            Continuar com google
          </button>

          {
            // A condição para verificar se é um formulário de login ou um formulário de registro.
            type == "entrar" ? (
              <p className="mt-6 text-dark-grey text-xl text-center">
                Não tem uma conta?
                <Link
                  className="underline text-black text-xl ml-1"
                  to="/signup"
                >
                  Registre-se hoje
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-dark-grey text-xl text-center">
                Já tem uma conta?
                <Link
                  className="underline text-black text-xl ml-1"
                  to="/signin"
                >
                  Faça login aqui
                </Link>
              </p>
            )
          }
        </form>
      </section>
    </AnimationWrapper>
  );
};

export default UserAuthForm;
